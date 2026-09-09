package com.mehedi.quicktalk.websocket;


import com.mehedi.quicktalk.model.ChatMessage;
import com.mehedi.quicktalk.service.ChatService;
import com.mehedi.quicktalk.util.ChatValidator;
import com.mehedi.quicktalk.util.OwnershipTokenUtil;

import org.springframework.stereotype.Component;

import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.net.URI;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeSet;

import java.util.concurrent.ConcurrentHashMap;


@Component
public class ChatWebSocketHandler
        extends TextWebSocketHandler {


    // =====================================================
    // DEPENDENCIES
    // =====================================================

    private final ChatService chatService;

    private final ObjectMapper objectMapper;


    // =====================================================
    // ACTIVE ROOMS
    // =====================================================

    private final Map<
            String,
            Set<WebSocketSession>
            > rooms =
            new ConcurrentHashMap<>();


    // =====================================================
    // SESSION ATTRIBUTES
    // =====================================================

    private static final String
            RATE_LIMITER_ATTRIBUTE =
            "quicktalkRateLimiter";


    private static final String
            CLIENT_ID_ATTRIBUTE =
            "quicktalkClientId";


    private static final String
            SUPERSEDED_ATTRIBUTE =
            "quicktalkSuperseded";


    // =====================================================
    // WEBSOCKET SIZE
    // =====================================================

    private static final int
            MAX_TEXT_MESSAGE_SIZE =
            8 * 1024;


    // =====================================================
    // GLOBAL RATE LIMIT
    // =====================================================

    private static final int
            GLOBAL_EVENT_LIMIT =
            80;


    private static final long
            GLOBAL_EVENT_WINDOW_MS =
            10_000L;


    // =====================================================
    // MESSAGE RATE LIMIT
    // =====================================================

    private static final int
            MESSAGE_BURST_LIMIT =
            8;


    private static final long
            MESSAGE_BURST_WINDOW_MS =
            5_000L;


    private static final int
            MESSAGE_MINUTE_LIMIT =
            30;


    private static final long
            MESSAGE_MINUTE_WINDOW_MS =
            60_000L;


    // =====================================================
    // REACTION RATE LIMIT
    // =====================================================

    private static final int
            REACTION_BURST_LIMIT =
            20;


    private static final long
            REACTION_BURST_WINDOW_MS =
            10_000L;


    private static final int
            REACTION_MINUTE_LIMIT =
            60;


    private static final long
            REACTION_MINUTE_WINDOW_MS =
            60_000L;


    // =====================================================
    // DELETE RATE LIMIT
    // =====================================================

    private static final int
            DELETE_LIMIT =
            10;


    private static final long
            DELETE_WINDOW_MS =
            10_000L;


    // =====================================================
    // TYPING RATE LIMIT
    // =====================================================

    private static final int
            TYPING_LIMIT =
            30;


    private static final long
            TYPING_WINDOW_MS =
            10_000L;


    // =====================================================
    // REGISTRATION RESULT
    // =====================================================

    private enum RegistrationResult {

        NEW_CONNECTION,

        RECONNECTED,

        NAME_IN_USE
    }


    // =====================================================
    // CONSTRUCTOR
    // =====================================================

    public ChatWebSocketHandler(
            ChatService chatService,
            ObjectMapper objectMapper) {


        this.chatService =
                chatService;


        this.objectMapper =
                objectMapper;
    }


    // =====================================================
    // CONNECTION ESTABLISHED
    // =====================================================

    @Override
    public void afterConnectionEstablished(
            WebSocketSession session)
            throws Exception {


        String room =
                getQueryParameter(
                        session,
                        "room"
                );


        String name =
                getQueryParameter(
                        session,
                        "name"
                );


        String clientId =
                getQueryParameter(
                        session,
                        "clientId"
                );


        // =================================================
        // VALIDATE CONNECTION DATA
        // =================================================

        if (
                !ChatValidator.isValidRoom(
                        room
                )
                        ||
                        !ChatValidator.isValidName(
                                name
                        )
                        ||
                        !isValidClientId(
                                clientId
                        )
        ) {

            sendError(
                    session,
                    "Invalid room, username, or client session."
            );


            session.close(
                    CloseStatus.BAD_DATA
            );


            return;
        }


        room =
                room.trim();


        name =
                name.trim();


        clientId =
                clientId.trim();


        // =================================================
        // MAX WEBSOCKET MESSAGE SIZE
        // =================================================

        session.setTextMessageSizeLimit(
                MAX_TEXT_MESSAGE_SIZE
        );


        // =================================================
        // DEFAULT RATE LIMITER
        // =================================================

        session
                .getAttributes()
                .put(
                        RATE_LIMITER_ATTRIBUTE,
                        new SessionRateLimiter()
                );


        // =================================================
        // REGISTER CONNECTION
        // =================================================

        RegistrationResult registrationResult =
                registerConnection(
                        session,
                        room,
                        name,
                        clientId
                );


        // =================================================
        // DUPLICATE ACTIVE NAME
        // =================================================

        if (
                registrationResult
                        ==
                        RegistrationResult.NAME_IN_USE
        ) {

            sendError(
                    session,
                    "That username is already being used in this room."
            );


            session.close(
                    CloseStatus.BAD_DATA
            );


            return;
        }


        // =================================================
        // UPDATE USER LIST
        // =================================================

        broadcastUsers(
                room
        );


        // =================================================
        // REAL JOIN
        // =================================================

        if (
                registrationResult
                        ==
                        RegistrationResult.NEW_CONNECTION
        ) {

            broadcastSystemMessage(
                    room,
                    name
                            + " joined the room"
            );
        }


        // =================================================
        // RECONNECT
        // =================================================

        else {

            /*
             * A reconnect should not create fake
             * leave/join messages.
             *
             * We only clear any old typing state.
             */

            broadcastTyping(
                    room,
                    name,
                    false,
                    session
            );
        }
    }


    // =====================================================
    // REGISTER CONNECTION
    // =====================================================

    private RegistrationResult registerConnection(
            WebSocketSession newSession,
            String room,
            String name,
            String clientId) {


        List<WebSocketSession> sessionsToClose =
                new ArrayList<>();


        SessionRateLimiter inheritedLimiter =
                null;


        RegistrationResult result =
                RegistrationResult.NEW_CONNECTION;


        /*
         * Atomic section.
         *
         * This prevents two connections from claiming
         * the same username at exactly the same time.
         */

        synchronized (rooms) {


            Set<WebSocketSession> sessions =
                    rooms.computeIfAbsent(
                            room,
                            ignored ->
                                    ConcurrentHashMap
                                            .newKeySet()
                    );


            /*
             * Work on a copy because we may remove
             * stale sessions during the loop.
             */

            for (
                    WebSocketSession existing
                    : new ArrayList<>(
                    sessions
            )
            ) {


                String existingName =
                        (String)
                                existing
                                        .getAttributes()
                                        .get(
                                                "name"
                                        );


                String existingClientId =
                        (String)
                                existing
                                        .getAttributes()
                                        .get(
                                                CLIENT_ID_ATTRIBUTE
                                        );


                boolean sameName =
                        existingName != null
                                &&
                                existingName
                                        .equalsIgnoreCase(
                                                name
                                        );


                boolean sameClient =
                        existingClientId != null
                                &&
                                existingClientId
                                        .equals(
                                                clientId
                                        );


                // =========================================
                // CLOSED / STALE SESSION
                // =========================================

                if (
                        !existing.isOpen()
                ) {

                    sessions.remove(
                            existing
                    );


                    /*
                     * A closed socket belonging to the
                     * same browser may simply be an
                     * unfinished reconnect cleanup.
                     */

                    if (
                            sameName
                                    &&
                                    sameClient
                    ) {

                        result =
                                RegistrationResult.RECONNECTED;


                        existing
                                .getAttributes()
                                .put(
                                        SUPERSEDED_ATTRIBUTE,
                                        true
                                );


                        Object limiterObject =
                                existing
                                        .getAttributes()
                                        .get(
                                                RATE_LIMITER_ATTRIBUTE
                                        );


                        if (
                                limiterObject
                                        instanceof SessionRateLimiter limiter
                        ) {

                            inheritedLimiter =
                                    limiter;
                        }
                    }


                    continue;
                }


                // =========================================
                // DIFFERENT USERNAME
                // =========================================

                if (!sameName) {

                    continue;
                }


                // =========================================
                // SAME NAME + DIFFERENT CLIENT
                // =========================================

                if (!sameClient) {

                    return RegistrationResult.NAME_IN_USE;
                }


                // =========================================
                // SAME NAME + SAME CLIENT
                // → RECONNECT
                // =========================================

                result =
                        RegistrationResult.RECONNECTED;


                existing
                        .getAttributes()
                        .put(
                                SUPERSEDED_ATTRIBUTE,
                                true
                        );


                Object limiterObject =
                        existing
                                .getAttributes()
                                .get(
                                        RATE_LIMITER_ATTRIBUTE
                                );


                if (
                        inheritedLimiter == null
                                &&
                                limiterObject
                                        instanceof SessionRateLimiter limiter
                ) {

                    /*
                     * Keep rate-limit history across
                     * a normal reconnect.
                     */

                    inheritedLimiter =
                            limiter;
                }


                sessions.remove(
                        existing
                );


                sessionsToClose.add(
                        existing
                );
            }


            // =============================================
            // STORE NEW SESSION INFORMATION
            // =============================================

            newSession
                    .getAttributes()
                    .put(
                            "room",
                            room
                    );


            newSession
                    .getAttributes()
                    .put(
                            "name",
                            name
                    );


            newSession
                    .getAttributes()
                    .put(
                            CLIENT_ID_ATTRIBUTE,
                            clientId
                    );


            // =============================================
            // INHERIT RATE LIMITER ON RECONNECT
            // =============================================

            if (
                    inheritedLimiter != null
            ) {

                newSession
                        .getAttributes()
                        .put(
                                RATE_LIMITER_ATTRIBUTE,
                                inheritedLimiter
                        );
            }


            // =============================================
            // ADD NEW SESSION
            // =============================================

            sessions.add(
                    newSession
            );
        }


        // =================================================
        // CLOSE OLD REPLACED SOCKETS
        // =================================================

        for (
                WebSocketSession oldSession
                : sessionsToClose
        ) {

            if (
                    !oldSession.isOpen()
            ) {

                continue;
            }


            try {

                oldSession.close(
                        CloseStatus.NORMAL
                );


            } catch (Exception exception) {

                System.err.println(
                        "Could not close replaced session: "
                                + exception.getMessage()
                );
            }
        }


        return result;
    }


    // =====================================================
    // RECEIVE WEBSOCKET MESSAGE
    // =====================================================

    @Override
    protected void handleTextMessage(
            WebSocketSession session,
            TextMessage textMessage)
            throws Exception {


        String room =
                (String)
                        session
                                .getAttributes()
                                .get(
                                        "room"
                                );


        String sender =
                (String)
                        session
                                .getAttributes()
                                .get(
                                        "name"
                                );


        if (
                room == null
                        ||
                        sender == null
        ) {

            return;
        }


        // =================================================
        // PAYLOAD SIZE
        // =================================================

        if (
                textMessage.getPayloadLength()
                        > MAX_TEXT_MESSAGE_SIZE
        ) {

            sendActionError(
                    session,
                    "rate_limit",
                    "Request is too large."
            );


            session.close(
                    CloseStatus.TOO_BIG_TO_PROCESS
            );


            return;
        }


        // =================================================
        // GLOBAL RATE LIMIT
        // =================================================

        SessionRateLimiter rateLimiter =
                getRateLimiter(
                        session
                );


        if (
                !rateLimiter.allow(
                        "global",
                        GLOBAL_EVENT_LIMIT,
                        GLOBAL_EVENT_WINDOW_MS
                )
        ) {

            sendRateLimitWarning(
                    session,
                    "You're doing that too quickly. Please slow down."
            );


            return;
        }


        // =================================================
        // PAYLOAD
        // =================================================

        String payload =
                textMessage
                        .getPayload();


        if (payload == null) {

            return;
        }


        payload =
                payload.trim();


        if (payload.isBlank()) {

            return;
        }


        // =================================================
        // HANDLE EVENT
        // =================================================

        boolean handled =
                handleClientEvent(
                        session,
                        room,
                        sender,
                        payload
                );


        if (!handled) {

            sendActionError(
                    session,
                    "send",
                    "Please refresh QuickTalk."
            );
        }
    }


    // =====================================================
    // CLIENT EVENT
    // =====================================================

    private boolean handleClientEvent(
            WebSocketSession session,
            String room,
            String sender,
            String payload) {


        if (
                !payload.startsWith(
                        "{"
                )
        ) {

            return false;
        }


        try {

            JsonNode json =
                    objectMapper
                            .readTree(
                                    payload
                            );


            if (
                    json == null
                            ||
                            !json.isObject()
                            ||
                            !json.has(
                                    "type"
                            )
            ) {

                return false;
            }


            String type =
                    json
                            .path(
                                    "type"
                            )
                            .asText(
                                    ""
                            )
                            .trim();


            // =================================================
            // NORMAL MESSAGE
            // =================================================

            if (
                    "message"
                            .equalsIgnoreCase(
                                    type
                            )
            ) {

                if (
                        !allowMessageAction(
                                session
                        )
                ) {

                    return true;
                }


                String message =
                        json
                                .path(
                                        "message"
                                )
                                .asText(
                                        ""
                                )
                                .trim();


                String token =
                        json
                                .path(
                                        "token"
                                )
                                .asText(
                                        ""
                                )
                                .trim();


                String replyToId =
                        json
                                .path(
                                        "replyToId"
                                )
                                .asText(
                                        ""
                                )
                                .trim();


                if (
                        replyToId.isBlank()
                ) {

                    replyToId =
                            null;
                }


                handleChatMessage(
                        session,
                        room,
                        sender,
                        message,
                        token,
                        replyToId
                );


                return true;
            }


            // =================================================
            // DELETE MESSAGE
            // =================================================

            if (
                    "delete_message"
                            .equalsIgnoreCase(
                                    type
                            )
            ) {

                if (
                        !allowDeleteAction(
                                session
                        )
                ) {

                    return true;
                }


                String messageId =
                        json
                                .path(
                                        "messageId"
                                )
                                .asText(
                                        ""
                                )
                                .trim();


                String token =
                        json
                                .path(
                                        "token"
                                )
                                .asText(
                                        ""
                                )
                                .trim();


                handleDeleteMessage(
                        session,
                        room,
                        messageId,
                        token
                );


                return true;
            }


            // =================================================
            // REACTION
            // =================================================

            if (
                    "reaction"
                            .equalsIgnoreCase(
                                    type
                            )
            ) {

                if (
                        !allowReactionAction(
                                session
                        )
                ) {

                    return true;
                }


                String messageId =
                        json
                                .path(
                                        "messageId"
                                )
                                .asText(
                                        ""
                                )
                                .trim();


                String emoji =
                        json
                                .path(
                                        "emoji"
                                )
                                .asText(
                                        ""
                                )
                                .trim();


                String token =
                        json
                                .path(
                                        "token"
                                )
                                .asText(
                                        ""
                                )
                                .trim();


                handleReaction(
                        session,
                        room,
                        messageId,
                        emoji,
                        token
                );


                return true;
            }


            // =================================================
            // TYPING
            // =================================================

            if (
                    "typing"
                            .equalsIgnoreCase(
                                    type
                            )
            ) {

                if (
                        !allowTypingAction(
                                session
                        )
                ) {

                    broadcastTyping(
                            room,
                            sender,
                            false,
                            session
                    );


                    return true;
                }


                boolean typing =
                        json
                                .path(
                                        "typing"
                                )
                                .asBoolean(
                                        false
                                );


                broadcastTyping(
                        room,
                        sender,
                        typing,
                        session
                );


                return true;
            }


            // =================================================
            // UNKNOWN STRUCTURED EVENT
            // =================================================

            return true;


        } catch (Exception exception) {

            System.err.println(
                    "Could not parse WebSocket event: "
                            + exception.getMessage()
            );


            return false;
        }
    }


    // =====================================================
    // NORMAL MESSAGE
    // =====================================================

    private void handleChatMessage(
            WebSocketSession session,
            String room,
            String sender,
            String message,
            String token,
            String replyToId) {


        if (
                !ChatValidator.isValidMessage(
                        message
                )
        ) {

            sendActionError(
                    session,
                    "send",
                    "Invalid message."
            );


            return;
        }


        if (
                !OwnershipTokenUtil.isValidToken(
                        token
                )
        ) {

            sendActionError(
                    session,
                    "send",
                    "Message verification failed."
            );


            return;
        }


        String ownerId;


        try {

            ownerId =
                    OwnershipTokenUtil
                            .hashToken(
                                    token
                            );


        } catch (Exception exception) {

            sendActionError(
                    session,
                    "send",
                    "Message verification failed."
            );


            return;
        }


        // -------------------------------------------------
        // STOP TYPING
        // -------------------------------------------------

        broadcastTyping(
                room,
                sender,
                false,
                session
        );


        try {

            ChatMessage savedMessage =
                    chatService.saveMessage(
                            room,
                            sender,
                            message,
                            ownerId,
                            replyToId
                    );


            String json =
                    objectMapper
                            .writeValueAsString(
                                    Map.of(
                                            "type",
                                            "message",

                                            "data",
                                            savedMessage
                                    )
                            );


            broadcast(
                    room,
                    json
            );


        } catch (IllegalArgumentException exception) {

            sendActionError(
                    session,
                    "send",
                    exception.getMessage()
            );


        } catch (Exception exception) {

            System.err.println(
                    "Could not send message: "
                            + exception.getMessage()
            );


            sendActionError(
                    session,
                    "send",
                    "Could not send message."
            );
        }
    }


    // =====================================================
    // DELETE MESSAGE
    // =====================================================

    private void handleDeleteMessage(
            WebSocketSession session,
            String room,
            String messageId,
            String token) {


        if (
                !OwnershipTokenUtil.isValidToken(
                        token
                )
        ) {

            sendActionError(
                    session,
                    "delete",
                    "Delete verification failed."
            );


            return;
        }


        String ownerId;


        try {

            ownerId =
                    OwnershipTokenUtil
                            .hashToken(
                                    token
                            );


        } catch (Exception exception) {

            sendActionError(
                    session,
                    "delete",
                    "Delete verification failed."
            );


            return;
        }


        try {

            ChatMessage deletedMessage =
                    chatService.deleteOwnMessage(
                            room,
                            messageId,
                            ownerId
                    );


            String json =
                    objectMapper
                            .writeValueAsString(
                                    Map.of(
                                            "type",
                                            "message_deleted",

                                            "messageId",
                                            deletedMessage
                                                    .getId()
                                    )
                            );


            broadcast(
                    room,
                    json
            );


        } catch (IllegalArgumentException exception) {

            sendActionError(
                    session,
                    "delete",
                    exception.getMessage()
            );


        } catch (Exception exception) {

            System.err.println(
                    "Could not delete message: "
                            + exception.getMessage()
            );


            sendActionError(
                    session,
                    "delete",
                    "Could not delete message."
            );
        }
    }


    // =====================================================
    // REACTION
    // =====================================================

    private void handleReaction(
            WebSocketSession session,
            String room,
            String messageId,
            String emoji,
            String token) {


        if (
                !OwnershipTokenUtil.isValidToken(
                        token
                )
        ) {

            sendActionError(
                    session,
                    "reaction",
                    "Reaction verification failed."
            );


            return;
        }


        String reactorOwnerId;


        try {

            reactorOwnerId =
                    OwnershipTokenUtil
                            .hashToken(
                                    token
                            );


        } catch (Exception exception) {

            sendActionError(
                    session,
                    "reaction",
                    "Reaction verification failed."
            );


            return;
        }


        try {

            ChatMessage updatedMessage =
                    chatService.toggleReaction(
                            room,
                            messageId,
                            emoji,
                            reactorOwnerId
                    );


            // =================================================
            // DID THIS USER ADD OR REMOVE IT?
            // =================================================

            boolean active =
                    updatedMessage.hasReaction(
                            emoji,
                            reactorOwnerId
                    );


            // =================================================
            // PUBLIC COUNTS
            // =================================================

            String publicJson =
                    objectMapper
                            .writeValueAsString(
                                    Map.of(
                                            "type",
                                            "message_reactions",

                                            "messageId",
                                            updatedMessage
                                                    .getId(),

                                            "reactions",
                                            updatedMessage
                                                    .getReactions()
                                    )
                            );


            broadcast(
                    room,
                    publicJson
            );


            // =================================================
            // PRIVATE STATE
            // =================================================

            sendJson(
                    session,
                    Map.of(
                            "type",
                            "reaction_state",

                            "messageId",
                            updatedMessage
                                    .getId(),

                            "emoji",
                            emoji,

                            "active",
                            active
                    )
            );


        } catch (IllegalArgumentException exception) {

            sendActionError(
                    session,
                    "reaction",
                    exception.getMessage()
            );


        } catch (Exception exception) {

            System.err.println(
                    "Could not update reaction: "
                            + exception.getMessage()
            );


            sendActionError(
                    session,
                    "reaction",
                    "Could not update reaction."
            );
        }
    }


    // =====================================================
    // CONNECTION CLOSED
    // =====================================================

    @Override
    public void afterConnectionClosed(
            WebSocketSession session,
            CloseStatus status) {


        // =================================================
        // WAS THIS SOCKET REPLACED BY A RECONNECT?
        // =================================================

        boolean superseded =
                Boolean.TRUE.equals(
                        session
                                .getAttributes()
                                .get(
                                        SUPERSEDED_ATTRIBUTE
                                )
                );


        // =================================================
        // RATE LIMITER CLEANUP
        // =================================================

        Object limiterObject =
                session
                        .getAttributes()
                        .remove(
                                RATE_LIMITER_ATTRIBUTE
                        );


        /*
         * If this connection was superseded,
         * the new connection may be using the
         * same limiter object.
         *
         * Therefore do not clear it here.
         */

        if (
                !superseded
                        &&
                        limiterObject
                                instanceof SessionRateLimiter limiter
        ) {

            limiter.clear();
        }


        // =================================================
        // ROOM + USER
        // =================================================

        String room =
                (String)
                        session
                                .getAttributes()
                                .get(
                                        "room"
                                );


        String name =
                (String)
                        session
                                .getAttributes()
                                .get(
                                        "name"
                                );


        if (
                room == null
                        ||
                        name == null
        ) {

            return;
        }


        boolean removed;

        boolean roomEmpty;


        // =================================================
        // REMOVE SESSION ATOMICALLY
        // =================================================

        synchronized (rooms) {


            Set<WebSocketSession> sessions =
                    rooms.get(
                            room
                    );


            if (
                    sessions == null
            ) {

                return;
            }


            removed =
                    sessions.remove(
                            session
                    );


            roomEmpty =
                    sessions.isEmpty();


            if (
                    roomEmpty
            ) {

                rooms.remove(
                        room,
                        sessions
                );
            }
        }


        // =================================================
        // OLD REPLACED CONNECTION
        // =================================================

        if (
                !removed
                        ||
                        superseded
        ) {

            return;
        }


        // =================================================
        // NOBODY REMAINS
        // =================================================

        if (
                roomEmpty
        ) {

            return;
        }


        // =================================================
        // CLEAR TYPING
        // =================================================

        broadcastTyping(
                room,
                name,
                false,
                null
        );


        // =================================================
        // USERS
        // =================================================

        broadcastUsers(
                room
        );


        // =================================================
        // REAL LEAVE MESSAGE
        // =================================================

        broadcastSystemMessage(
                room,
                name
                        + " left the room"
        );
    }


    // =====================================================
    // TRANSPORT ERROR
    // =====================================================

    @Override
    public void handleTransportError(
            WebSocketSession session,
            Throwable exception)
            throws Exception {


        System.err.println(
                "WebSocket transport error: "
                        + exception.getMessage()
        );


        if (
                session.isOpen()
        ) {

            session.close(
                    CloseStatus.SERVER_ERROR
            );
        }
    }


    // =====================================================
    // USERS
    // =====================================================

    private void broadcastUsers(
            String room) {


        Set<WebSocketSession> sessions =
                rooms.get(
                        room
                );


        if (
                sessions == null
        ) {

            return;
        }


        Set<String> names =
                new TreeSet<>(
                        String.CASE_INSENSITIVE_ORDER
                );


        for (
                WebSocketSession session
                : sessions
        ) {

            if (
                    !session.isOpen()
            ) {

                continue;
            }


            String name =
                    (String)
                            session
                                    .getAttributes()
                                    .get(
                                            "name"
                                    );


            if (
                    name != null
            ) {

                names.add(
                        name
                );
            }
        }


        try {

            String json =
                    objectMapper
                            .writeValueAsString(
                                    Map.of(
                                            "type",
                                            "users",

                                            "users",
                                            new ArrayList<>(
                                                    names
                                            )
                                    )
                            );


            broadcast(
                    room,
                    json
            );


        } catch (Exception exception) {

            System.err.println(
                    "Could not broadcast users: "
                            + exception.getMessage()
            );
        }
    }


    // =====================================================
    // SYSTEM MESSAGE
    // =====================================================

    private void broadcastSystemMessage(
            String room,
            String message) {


        try {

            String json =
                    objectMapper
                            .writeValueAsString(
                                    Map.of(
                                            "type",
                                            "system",

                                            "message",
                                            message
                                    )
                            );


            broadcast(
                    room,
                    json
            );


        } catch (Exception exception) {

            System.err.println(
                    "Could not broadcast system message: "
                            + exception.getMessage()
            );
        }
    }


    // =====================================================
    // TYPING
    // =====================================================

    private void broadcastTyping(
            String room,
            String sender,
            boolean typing,
            WebSocketSession excludedSession) {


        try {

            String json =
                    objectMapper
                            .writeValueAsString(
                                    Map.of(
                                            "type",
                                            "typing",

                                            "sender",
                                            sender,

                                            "typing",
                                            typing
                                    )
                            );


            broadcastExcept(
                    room,
                    json,
                    excludedSession
            );


        } catch (Exception exception) {

            System.err.println(
                    "Could not broadcast typing: "
                            + exception.getMessage()
            );
        }
    }


    // =====================================================
    // =====================================================
    // RATE LIMITING
    // =====================================================
    // =====================================================


    // =====================================================
    // GET LIMITER
    // =====================================================

    private SessionRateLimiter getRateLimiter(
            WebSocketSession session) {


        Object existing =
                session
                        .getAttributes()
                        .get(
                                RATE_LIMITER_ATTRIBUTE
                        );


        if (
                existing
                        instanceof SessionRateLimiter limiter
        ) {

            return limiter;
        }


        SessionRateLimiter limiter =
                new SessionRateLimiter();


        session
                .getAttributes()
                .put(
                        RATE_LIMITER_ATTRIBUTE,
                        limiter
                );


        return limiter;
    }


    // =====================================================
    // MESSAGE LIMIT
    // =====================================================

    private boolean allowMessageAction(
            WebSocketSession session) {


        SessionRateLimiter limiter =
                getRateLimiter(
                        session
                );


        if (
                !limiter.allow(
                        "message-burst",
                        MESSAGE_BURST_LIMIT,
                        MESSAGE_BURST_WINDOW_MS
                )
        ) {

            sendRateLimitWarning(
                    session,
                    "Too many messages. Please slow down."
            );


            return false;
        }


        if (
                !limiter.allow(
                        "message-minute",
                        MESSAGE_MINUTE_LIMIT,
                        MESSAGE_MINUTE_WINDOW_MS
                )
        ) {

            sendRateLimitWarning(
                    session,
                    "Too many messages. Please slow down."
            );


            return false;
        }


        return true;
    }


    // =====================================================
    // REACTION LIMIT
    // =====================================================

    private boolean allowReactionAction(
            WebSocketSession session) {


        SessionRateLimiter limiter =
                getRateLimiter(
                        session
                );


        if (
                !limiter.allow(
                        "reaction-burst",
                        REACTION_BURST_LIMIT,
                        REACTION_BURST_WINDOW_MS
                )
        ) {

            sendRateLimitWarning(
                    session,
                    "Too many reactions. Please slow down."
            );


            return false;
        }


        if (
                !limiter.allow(
                        "reaction-minute",
                        REACTION_MINUTE_LIMIT,
                        REACTION_MINUTE_WINDOW_MS
                )
        ) {

            sendRateLimitWarning(
                    session,
                    "Too many reactions. Please slow down."
            );


            return false;
        }


        return true;
    }


    // =====================================================
    // DELETE LIMIT
    // =====================================================

    private boolean allowDeleteAction(
            WebSocketSession session) {


        if (
                getRateLimiter(
                        session
                )
                        .allow(
                                "delete",
                                DELETE_LIMIT,
                                DELETE_WINDOW_MS
                        )
        ) {

            return true;
        }


        sendRateLimitWarning(
                session,
                "Too many delete requests. Please slow down."
        );


        return false;
    }


    // =====================================================
    // TYPING LIMIT
    // =====================================================

    private boolean allowTypingAction(
            WebSocketSession session) {


        return getRateLimiter(
                session
        )
                .allow(
                        "typing",
                        TYPING_LIMIT,
                        TYPING_WINDOW_MS
                );
    }


    // =====================================================
    // RATE LIMIT WARNING
    // =====================================================

    private void sendRateLimitWarning(
            WebSocketSession session,
            String message) {


        SessionRateLimiter limiter =
                getRateLimiter(
                        session
                );


        if (
                !limiter.allow(
                        "rate-warning",
                        1,
                        2_000L
                )
        ) {

            return;
        }


        sendActionError(
                session,
                "rate_limit",
                message
        );
    }


    // =====================================================
    // ACTION ERROR
    // =====================================================

    private void sendActionError(
            WebSocketSession session,
            String action,
            String message) {


        try {

            sendJson(
                    session,
                    Map.of(
                            "type",
                            "action_error",

                            "action",
                            action,

                            "message",
                            message
                    )
            );


        } catch (Exception exception) {

            System.err.println(
                    "Could not send action error: "
                            + exception.getMessage()
            );
        }
    }


    // =====================================================
    // CONNECTION ERROR
    // =====================================================

    private void sendError(
            WebSocketSession session,
            String message)
            throws Exception {


        sendJson(
                session,
                Map.of(
                        "type",
                        "error",

                        "message",
                        message
                )
        );
    }


    // =====================================================
    // SEND JSON
    // =====================================================

    private void sendJson(
            WebSocketSession session,
            Object value)
            throws Exception {


        if (
                session == null
                        ||
                        !session.isOpen()
        ) {

            return;
        }


        String json =
                objectMapper
                        .writeValueAsString(
                                value
                        );


        synchronized (session) {

            session.sendMessage(
                    new TextMessage(
                            json
                    )
            );
        }
    }


    // =====================================================
    // BROADCAST
    // =====================================================

    private void broadcast(
            String room,
            String json) {


        broadcastExcept(
                room,
                json,
                null
        );
    }


    // =====================================================
    // BROADCAST EXCEPT
    // =====================================================

    private void broadcastExcept(
            String room,
            String json,
            WebSocketSession excludedSession) {


        Set<WebSocketSession> sessions =
                rooms.get(
                        room
                );


        if (
                sessions == null
        ) {

            return;
        }


        for (
                WebSocketSession session
                : sessions
        ) {

            if (
                    !session.isOpen()
            ) {

                continue;
            }


            if (
                    excludedSession != null
                            &&
                            session.equals(
                                    excludedSession
                            )
            ) {

                continue;
            }


            try {

                synchronized (session) {

                    session.sendMessage(
                            new TextMessage(
                                    json
                            )
                    );
                }


            } catch (Exception exception) {

                System.err.println(
                        "Could not send WebSocket event: "
                                + exception.getMessage()
                );
            }
        }
    }


    // =====================================================
    // VALID CLIENT ID
    // =====================================================

    private boolean isValidClientId(
            String clientId) {


        if (
                clientId == null
                        ||
                        clientId.isBlank()
        ) {

            return false;
        }


        return clientId.matches(
                "[a-fA-F0-9]{32}"
        );
    }


    // =====================================================
    // QUERY PARAMETER
    // =====================================================

    private String getQueryParameter(
            WebSocketSession session,
            String requestedKey) {


        URI uri =
                session.getUri();


        if (
                uri == null
                        ||
                        uri.getRawQuery() == null
        ) {

            return null;
        }


        String[] parameters =
                uri
                        .getRawQuery()
                        .split(
                                "&"
                        );


        for (
                String parameter
                : parameters
        ) {

            String[] parts =
                    parameter
                            .split(
                                    "=",
                                    2
                            );


            if (
                    parts.length != 2
            ) {

                continue;
            }


            String key =
                    decode(
                            parts[0]
                    );


            if (
                    requestedKey.equals(
                            key
                    )
            ) {

                return decode(
                        parts[1]
                );
            }
        }


        return null;
    }


    // =====================================================
    // DECODE
    // =====================================================

    private String decode(
            String value) {


        return URLDecoder.decode(
                value,
                StandardCharsets.UTF_8
        );
    }
}