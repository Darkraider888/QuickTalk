package com.mehedi.quicktalk.service;

import com.mehedi.quicktalk.model.ChatMessage;
import com.mehedi.quicktalk.repository.ChatMessageRepository;
import com.mehedi.quicktalk.util.ChatValidator;
import com.mehedi.quicktalk.util.OwnershipTokenUtil;

import org.springframework.stereotype.Service;

import java.util.Collections;
import java.util.List;
import java.util.Set;


@Service
public class ChatService {


    // =====================================================
    // ALLOWED REACTIONS
    // =====================================================

    private static final Set<String>
            ALLOWED_REACTIONS =
            Set.of(
                    "👍",
                    "❤️",
                    "😂",
                    "😮",
                    "😢"
            );


    // =====================================================
    // REPOSITORY
    // =====================================================

    private final ChatMessageRepository
            chatMessageRepository;


    public ChatService(
            ChatMessageRepository chatMessageRepository) {


        this.chatMessageRepository =
                chatMessageRepository;
    }


    // =====================================================
    // SAVE MESSAGE
    // =====================================================

    public ChatMessage saveMessage(
            String room,
            String sender,
            String message,
            String ownerId,
            String replyToId) {


        // -------------------------------------------------
        // ROOM
        // -------------------------------------------------

        if (
                !ChatValidator.isValidRoom(
                        room
                )
        ) {

            throw new IllegalArgumentException(
                    "Invalid room name."
            );
        }


        // -------------------------------------------------
        // SENDER
        // -------------------------------------------------

        if (
                !ChatValidator.isValidName(
                        sender
                )
        ) {

            throw new IllegalArgumentException(
                    "Invalid sender name."
            );
        }


        // -------------------------------------------------
        // MESSAGE
        // -------------------------------------------------

        if (
                !ChatValidator.isValidMessage(
                        message
                )
        ) {

            throw new IllegalArgumentException(
                    "Invalid message."
            );
        }


        // -------------------------------------------------
        // OWNERSHIP
        // -------------------------------------------------

        if (
                !OwnershipTokenUtil.isValidOwnerId(
                        ownerId
                )
        ) {

            throw new IllegalArgumentException(
                    "Invalid message ownership."
            );
        }


        String cleanRoom =
                room.trim();


        String cleanReplyToId =
                null;


        // =================================================
        // REPLY
        // =================================================

        if (
                replyToId != null
                        &&
                        !replyToId.isBlank()
        ) {

            String requestedReplyId =
                    replyToId.trim();


            if (
                    requestedReplyId.length()
                            > 100
            ) {

                throw new IllegalArgumentException(
                        "Invalid reply target."
                );
            }


            ChatMessage originalMessage =
                    chatMessageRepository
                            .findById(
                                    requestedReplyId
                            )
                            .orElseThrow(
                                    () ->
                                            new IllegalArgumentException(
                                                    "The original message is no longer available."
                                            )
                            );


            // ---------------------------------------------
            // SAME ROOM
            // ---------------------------------------------

            if (
                    originalMessage.getRoom()
                            == null
                            ||
                            !originalMessage
                                    .getRoom()
                                    .equals(
                                            cleanRoom
                                    )
            ) {

                throw new IllegalArgumentException(
                        "Invalid reply target."
                );
            }


            // ---------------------------------------------
            // CANNOT START NEW REPLY TO DELETED MESSAGE
            // ---------------------------------------------

            if (
                    originalMessage.isDeleted()
            ) {

                throw new IllegalArgumentException(
                        "The original message was deleted."
                );
            }


            cleanReplyToId =
                    originalMessage.getId();
        }


        // =================================================
        // CREATE
        // =================================================

        ChatMessage chatMessage =
                new ChatMessage(
                        cleanRoom,
                        sender.trim(),
                        message.trim(),
                        ownerId.trim(),
                        cleanReplyToId
                );


        return chatMessageRepository.save(
                chatMessage
        );
    }


    // =====================================================
    // DELETE OWN MESSAGE
    // =====================================================

    public synchronized ChatMessage deleteOwnMessage(
            String room,
            String messageId,
            String ownerId) {


        // -------------------------------------------------
        // ROOM
        // -------------------------------------------------

        if (
                !ChatValidator.isValidRoom(
                        room
                )
        ) {

            throw new IllegalArgumentException(
                    "Invalid room."
            );
        }


        // -------------------------------------------------
        // MESSAGE ID
        // -------------------------------------------------

        if (
                messageId == null
                        ||
                        messageId.isBlank()
                        ||
                        messageId.trim().length()
                                > 100
        ) {

            throw new IllegalArgumentException(
                    "Invalid message."
            );
        }


        // -------------------------------------------------
        // OWNERSHIP HASH
        // -------------------------------------------------

        if (
                !OwnershipTokenUtil.isValidOwnerId(
                        ownerId
                )
        ) {

            throw new IllegalArgumentException(
                    "Invalid ownership."
            );
        }


        ChatMessage chatMessage =
                chatMessageRepository
                        .findById(
                                messageId.trim()
                        )
                        .orElseThrow(
                                () ->
                                        new IllegalArgumentException(
                                                "Message not found."
                                        )
                        );


        // -------------------------------------------------
        // SAME ROOM
        // -------------------------------------------------

        if (
                chatMessage.getRoom()
                        == null
                        ||
                        !chatMessage
                                .getRoom()
                                .equals(
                                        room.trim()
                                )
        ) {

            throw new IllegalArgumentException(
                    "Message not found."
            );
        }


        // -------------------------------------------------
        // ALREADY DELETED
        // -------------------------------------------------

        if (
                chatMessage.isDeleted()
        ) {

            throw new IllegalArgumentException(
                    "Message already deleted."
            );
        }


        // -------------------------------------------------
        // REAL OWNERSHIP CHECK
        // -------------------------------------------------

        if (
                !chatMessage.isOwnedBy(
                        ownerId
                )
        ) {

            throw new IllegalArgumentException(
                    "You can only delete your own messages."
            );
        }


        // -------------------------------------------------
        // REMOVE CONTENT
        // -------------------------------------------------

        chatMessage.markDeleted();


        return chatMessageRepository.save(
                chatMessage
        );
    }


    // =====================================================
    // TOGGLE REACTION
    // =====================================================

    public synchronized ChatMessage toggleReaction(
            String room,
            String messageId,
            String emoji,
            String reactorOwnerId) {


        // -------------------------------------------------
        // ROOM
        // -------------------------------------------------

        if (
                !ChatValidator.isValidRoom(
                        room
                )
        ) {

            throw new IllegalArgumentException(
                    "Invalid room."
            );
        }


        // -------------------------------------------------
        // MESSAGE ID
        // -------------------------------------------------

        if (
                messageId == null
                        ||
                        messageId.isBlank()
                        ||
                        messageId.trim().length()
                                > 100
        ) {

            throw new IllegalArgumentException(
                    "Invalid message."
            );
        }


        // -------------------------------------------------
        // REACTION
        // -------------------------------------------------

        if (
                emoji == null
                        ||
                        !ALLOWED_REACTIONS.contains(
                                emoji
                        )
        ) {

            throw new IllegalArgumentException(
                    "Invalid reaction."
            );
        }


        // -------------------------------------------------
        // REACTOR ID
        // -------------------------------------------------

        if (
                !OwnershipTokenUtil.isValidOwnerId(
                        reactorOwnerId
                )
        ) {

            throw new IllegalArgumentException(
                    "Invalid reaction identity."
            );
        }


        ChatMessage chatMessage =
                chatMessageRepository
                        .findById(
                                messageId.trim()
                        )
                        .orElseThrow(
                                () ->
                                        new IllegalArgumentException(
                                                "Message not found."
                                        )
                        );


        // -------------------------------------------------
        // SAME ROOM
        // -------------------------------------------------

        if (
                chatMessage.getRoom()
                        == null
                        ||
                        !chatMessage
                                .getRoom()
                                .equals(
                                        room.trim()
                                )
        ) {

            throw new IllegalArgumentException(
                    "Message not found."
            );
        }


        // -------------------------------------------------
        // DELETED MESSAGE
        // -------------------------------------------------

        if (
                chatMessage.isDeleted()
        ) {

            throw new IllegalArgumentException(
                    "You cannot react to a deleted message."
            );
        }


        // -------------------------------------------------
        // TOGGLE
        // -------------------------------------------------

        chatMessage.toggleReaction(
                emoji,
                reactorOwnerId
        );


        return chatMessageRepository.save(
                chatMessage
        );
    }


    // =====================================================
    // ROOM HISTORY
    // =====================================================

    public List<ChatMessage> getRoomMessages(
            String room) {


        if (
                !ChatValidator.isValidRoom(
                        room
                )
        ) {

            throw new IllegalArgumentException(
                    "Invalid room name."
            );
        }


        List<ChatMessage> messages =
                chatMessageRepository
                        .findTop100ByRoomOrderByCreatedAtDesc(
                                room
                        );


        Collections.reverse(
                messages
        );


        return messages;
    }
}