// ======================================================
// QUICKTALK ROOM
// STEP 21C
//
// CORE:
// - Real-time messaging
// - Temporary ownership
// - Reconnect recovery
// - Stable client connection ID
// - Duplicate-name protection
// - Typing
// - Reply
// - Delete
// - Toggle reactions
// - Search
// - Unread messages
// ======================================================


// ======================================================
// USER + ROOM
// ======================================================

let name =
    sessionStorage.getItem(
        "quicktalkName"
    );


const pathParts =
    window.location.pathname.split("/");


const room =
    decodeURIComponent(
        pathParts[
        pathParts.length - 1
            ]
    );


// ======================================================
// CONNECTION ID
// ======================================================

const CLIENT_ID_STORAGE_KEY =
    "quicktalkClientId";


let quickTalkClientId =
    prepareClientId();


// ======================================================
// CONNECTION STATE
// ======================================================

let socket =
    null;


let historyLoaded =
    false;


let leavingRoom =
    false;


let serverRejected =
    false;


let reconnectTimer =
    null;


let reconnectAttempts =
    0;


const MAX_RECONNECT_DELAY =
    10000;


// ======================================================
// MESSAGE STATE
// ======================================================

let lastRenderedMessage =
    null;


let lastRenderedDateKey =
    null;


let searchHighlightTimer =
    null;


const renderedMessageIds =
    new Set();


const messageStore =
    new Map();


const renderedMessageElements =
    new Map();


// ======================================================
// TYPING
// ======================================================

const typingUsers =
    new Set();


let typingStopTimer =
    null;


let sentTypingState =
    false;


const TYPING_STOP_DELAY =
    1200;


// ======================================================
// UNREAD
// ======================================================

let tabUnreadCount =
    0;


let pendingNewMessageCount =
    0;


const baseDocumentTitle =
    "QuickTalk | #" + room;


// ======================================================
// OWNERSHIP
// ======================================================

const OWNERSHIP_STORAGE_PREFIX =
    "quicktalkOwner::";


const OWNERSHIP_LIFETIME_MS =
    24 * 60 * 60 * 1000;


let ownershipToken =
    null;


let ownershipStorageKey =
    null;


// ======================================================
// REPLY
// ======================================================

let replyingToMessageId =
    null;


// ======================================================
// DELETE
// ======================================================

let pendingDeleteMessageId =
    null;


// ======================================================
// REACTIONS
// ======================================================

const REACTION_OPTIONS =
    [
        "👍",
        "❤️",
        "😂",
        "😮",
        "😢"
    ];


let activeReactionMessageId =
    null;


// ======================================================
// MY REACTION STATE
// ======================================================

const myReactionState =
    new Map();


let myReactionStorageKey =
    null;


const MY_REACTION_STORAGE_SUFFIX =
    "::my-reactions";


// ======================================================
// ELEMENTS
// ======================================================

const messageInput =
    document.getElementById(
        "messageInput"
    );


const messageCounter =
    document.getElementById(
        "messageCounter"
    );


const joinOverlay =
    document.getElementById(
        "joinOverlay"
    );


const directNameInput =
    document.getElementById(
        "directNameInput"
    );


const joinError =
    document.getElementById(
        "joinError"
    );


const mobileUsersOverlay =
    document.getElementById(
        "mobileUsersOverlay"
    );


const messageSearchOverlay =
    document.getElementById(
        "messageSearchOverlay"
    );


const messageSearchInput =
    document.getElementById(
        "messageSearchInput"
    );


const messageSearchResults =
    document.getElementById(
        "messageSearchResults"
    );


const messageSearchResultCount =
    document.getElementById(
        "messageSearchResultCount"
    );


const typingIndicator =
    document.getElementById(
        "typingIndicator"
    );


const typingIndicatorText =
    document.getElementById(
        "typingIndicatorText"
    );


const newMessagesNotice =
    document.getElementById(
        "newMessagesNotice"
    );


const newMessagesCount =
    document.getElementById(
        "newMessagesCount"
    );


const messagesContainer =
    document.getElementById(
        "messages"
    );


const replyComposer =
    document.getElementById(
        "replyComposer"
    );


const replyComposerSender =
    document.getElementById(
        "replyComposerSender"
    );


const replyComposerMessage =
    document.getElementById(
        "replyComposerMessage"
    );


const deleteMessageOverlay =
    document.getElementById(
        "deleteMessageOverlay"
    );


const deleteMessagePreview =
    document.getElementById(
        "deleteMessagePreview"
    );


// ======================================================
// START
// ======================================================

if (name) {

    startQuickTalk();

} else {

    showJoinOverlay();
}


// ======================================================
// CONNECTION ID
// ======================================================

function prepareClientId() {

    let existing =
        null;


    try {

        existing =
            sessionStorage.getItem(
                CLIENT_ID_STORAGE_KEY
            );


    } catch (error) {

        console.warn(
            "Session storage unavailable."
        );
    }


    if (
        isValidClientId(
            existing
        )
    ) {

        return existing;
    }


    const generated =
        generateClientId();


    try {

        sessionStorage.setItem(
            CLIENT_ID_STORAGE_KEY,
            generated
        );


    } catch (error) {

        console.warn(
            "Could not store connection ID."
        );
    }


    return generated;
}


function generateClientId() {

    const bytes =
        new Uint8Array(
            16
        );


    window.crypto.getRandomValues(
        bytes
    );


    return Array
        .from(
            bytes
        )
        .map(
            function (byte) {

                return byte
                    .toString(
                        16
                    )
                    .padStart(
                        2,
                        "0"
                    );
            }
        )
        .join("");
}


function isValidClientId(
    value
) {

    return (
        typeof value
        === "string"
        &&
        /^[a-fA-F0-9]{32}$/.test(
            value
        )
    );
}


// ======================================================
// USERNAME COMPARISON
// ======================================================

function sameUserName(
    first,
    second
) {

    if (
        !first
        ||
        !second
    ) {

        return false;
    }


    return (
        first
            .trim()
            .toLowerCase()
        ===
        second
            .trim()
            .toLowerCase()
    );
}


// ======================================================
// JOIN
// ======================================================

function showJoinOverlay(
    errorMessage = ""
) {

    document
        .getElementById(
            "joinRoomName"
        )
        .textContent =
        "#" + room;


    joinOverlay
        .classList
        .add(
            "show"
        );


    if (errorMessage) {

        showJoinError(
            errorMessage
        );

    } else {

        clearJoinError();
    }


    setTimeout(
        function () {

            directNameInput.focus();

        },
        100
    );
}


function hideJoinOverlay() {

    joinOverlay
        .classList
        .remove(
            "show"
        );


    clearJoinError();
}


function showJoinError(
    message
) {

    joinError.textContent =
        message;


    joinError
        .classList
        .add(
            "show"
        );


    directNameInput
        .classList
        .add(
            "input-error"
        );
}


function clearJoinError() {

    joinError.textContent =
        "";


    joinError
        .classList
        .remove(
            "show"
        );


    directNameInput
        .classList
        .remove(
            "input-error"
        );
}


directNameInput.addEventListener(
    "input",
    clearJoinError
);


document
    .getElementById(
        "directJoinForm"
    )
    .addEventListener(
        "submit",
        function (event) {

            event.preventDefault();


            clearJoinError();


            const enteredName =
                directNameInput
                    .value
                    .trim();


            if (!enteredName) {

                showJoinError(
                    "Please enter your name."
                );


                directNameInput.focus();


                return;
            }


            if (
                enteredName.length > 30
            ) {

                showJoinError(
                    "Name cannot be longer than 30 characters."
                );


                directNameInput.focus();


                return;
            }


            if (
                containsControlCharacters(
                    enteredName
                )
            ) {

                showJoinError(
                    "Please enter a valid name."
                );


                directNameInput.focus();


                return;
            }


            name =
                enteredName;


            sessionStorage.setItem(
                "quicktalkName",
                name
            );


            leavingRoom =
                false;


            serverRejected =
                false;


            reconnectAttempts =
                0;


            hideJoinOverlay();


            startQuickTalk();
        }
    );


function containsControlCharacters(
    value
) {

    return /[\u0000-\u001F\u007F]/.test(
        value
    );
}


// ======================================================
// OWNERSHIP
// ======================================================

function prepareOwnershipToken() {

    cleanupExpiredOwnershipTokens();


    ownershipStorageKey =
        buildOwnershipStorageKey();


    let storedValue =
        null;


    try {

        storedValue =
            localStorage.getItem(
                ownershipStorageKey
            );


    } catch (error) {

        console.warn(
            "Local storage unavailable."
        );
    }


    if (storedValue) {

        try {

            const stored =
                JSON.parse(
                    storedValue
                );


            if (
                isValidOwnershipToken(
                    stored.token
                )
                &&
                Number.isFinite(
                    stored.expiresAt
                )
                &&
                stored.expiresAt
                > Date.now()
            ) {

                ownershipToken =
                    stored.token;


                touchOwnershipToken();


                return;
            }


        } catch (error) {

            console.warn(
                "Could not read temporary token."
            );
        }
    }


    createNewOwnershipToken();
}


function buildOwnershipStorageKey() {

    const normalizedName =
        (
            name || ""
        )
            .trim()
            .toLowerCase();


    return (
        OWNERSHIP_STORAGE_PREFIX
        +
        encodeURIComponent(
            room
        )
        +
        "::"
        +
        encodeURIComponent(
            normalizedName
        )
    );
}


function createNewOwnershipToken() {

    ownershipToken =
        generateSecureOwnershipToken();


    touchOwnershipToken();
}


function generateSecureOwnershipToken() {

    const bytes =
        new Uint8Array(
            32
        );


    window.crypto.getRandomValues(
        bytes
    );


    return Array
        .from(
            bytes
        )
        .map(
            function (byte) {

                return byte
                    .toString(
                        16
                    )
                    .padStart(
                        2,
                        "0"
                    );
            }
        )
        .join("");
}


function isValidOwnershipToken(
    token
) {

    return (
        typeof token
        === "string"
        &&
        /^[a-fA-F0-9]{64}$/.test(
            token
        )
    );
}


function touchOwnershipToken() {

    if (
        !ownershipToken
        ||
        !ownershipStorageKey
    ) {

        return;
    }


    try {

        localStorage.setItem(
            ownershipStorageKey,
            JSON.stringify(
                {
                    token:
                    ownershipToken,

                    expiresAt:
                        Date.now()
                        +
                        OWNERSHIP_LIFETIME_MS
                }
            )
        );


    } catch (error) {

        console.warn(
            "Could not store temporary token."
        );
    }
}


function cleanupExpiredOwnershipTokens() {

    let length;


    try {

        length =
            localStorage.length;


    } catch (error) {

        return;
    }


    const now =
        Date.now();


    for (
        let index =
            length - 1;

        index >= 0;

        index--
    ) {

        const key =
            localStorage.key(
                index
            );


        if (
            !key
            ||
            !key.startsWith(
                OWNERSHIP_STORAGE_PREFIX
            )
        ) {

            continue;
        }


        if (
            key.endsWith(
                MY_REACTION_STORAGE_SUFFIX
            )
        ) {

            continue;
        }


        try {

            const value =
                localStorage.getItem(
                    key
                );


            const stored =
                JSON.parse(
                    value
                );


            if (
                !stored
                ||
                !isValidOwnershipToken(
                    stored.token
                )
                ||
                !Number.isFinite(
                    stored.expiresAt
                )
                ||
                stored.expiresAt
                <= now
            ) {

                localStorage.removeItem(
                    key
                );


                localStorage.removeItem(
                    key
                    +
                    MY_REACTION_STORAGE_SUFFIX
                );
            }


        } catch (error) {

            localStorage.removeItem(
                key
            );


            localStorage.removeItem(
                key
                +
                MY_REACTION_STORAGE_SUFFIX
            );
        }
    }
}


// ======================================================
// LOCAL REACTION STATE
// ======================================================

function prepareMyReactionState() {

    myReactionState.clear();


    if (
        !ownershipStorageKey
        ||
        !ownershipToken
    ) {

        return;
    }


    myReactionStorageKey =
        ownershipStorageKey
        +
        MY_REACTION_STORAGE_SUFFIX;


    let rawValue =
        null;


    try {

        rawValue =
            localStorage.getItem(
                myReactionStorageKey
            );


    } catch (error) {

        console.warn(
            "Could not read reaction state."
        );


        return;
    }


    if (!rawValue) {

        return;
    }


    try {

        const stored =
            JSON.parse(
                rawValue
            );


        if (
            !stored
            ||
            stored.token
            !== ownershipToken
            ||
            !Number.isFinite(
                stored.expiresAt
            )
            ||
            stored.expiresAt
            <= Date.now()
        ) {

            localStorage.removeItem(
                myReactionStorageKey
            );


            return;
        }


        const reactions =
            stored.reactions;


        if (
            !reactions
            ||
            typeof reactions
            !== "object"
        ) {

            return;
        }


        for (
            const [
                messageId,
                emojis
            ]
            of Object.entries(
            reactions
        )
            ) {

            if (
                !Array.isArray(
                    emojis
                )
            ) {

                continue;
            }


            const validEmojis =
                emojis.filter(
                    function (emoji) {

                        return REACTION_OPTIONS
                            .includes(
                                emoji
                            );
                    }
                );


            if (
                validEmojis.length > 0
            ) {

                myReactionState.set(
                    messageId,
                    new Set(
                        validEmojis
                    )
                );
            }
        }


    } catch (error) {

        try {

            localStorage.removeItem(
                myReactionStorageKey
            );

        } catch (ignored) {
        }
    }
}


function saveMyReactionState() {

    if (
        !myReactionStorageKey
        ||
        !ownershipToken
    ) {

        return;
    }


    const reactions =
        {};


    for (
        const [
            messageId,
            emojis
        ]
        of myReactionState.entries()
        ) {

        if (
            emojis.size === 0
        ) {

            continue;
        }


        reactions[
            messageId
            ] =
            Array.from(
                emojis
            );
    }


    try {

        localStorage.setItem(
            myReactionStorageKey,
            JSON.stringify(
                {
                    token:
                    ownershipToken,

                    expiresAt:
                        Date.now()
                        +
                        OWNERSHIP_LIFETIME_MS,

                    reactions:
                    reactions
                }
            )
        );


    } catch (error) {

        console.warn(
            "Could not save reaction state."
        );
    }
}


function hasMyReaction(
    messageId,
    emoji
) {

    const reactions =
        myReactionState.get(
            messageId
        );


    return Boolean(
        reactions
        &&
        reactions.has(
            emoji
        )
    );
}


function applyMyReactionState(
    messageId,
    emoji,
    active
) {

    if (
        !messageId
        ||
        !REACTION_OPTIONS.includes(
            emoji
        )
    ) {

        return;
    }


    let reactions =
        myReactionState.get(
            messageId
        );


    if (active) {

        if (!reactions) {

            reactions =
                new Set();


            myReactionState.set(
                messageId,
                reactions
            );
        }


        reactions.add(
            emoji
        );


    } else {

        if (reactions) {

            reactions.delete(
                emoji
            );


            if (
                reactions.size === 0
            ) {

                myReactionState.delete(
                    messageId
                );
            }
        }
    }


    saveMyReactionState();


    renderReactionSummary(
        messageId
    );


    updateReactionPickerState(
        messageId
    );
}


function removeMyReactionStateForMessage(
    messageId
) {

    if (!messageId) {

        return;
    }


    if (
        myReactionState.delete(
            messageId
        )
    ) {

        saveMyReactionState();
    }
}


function reconcileMyReactionState(
    messageId,
    publicReactions
) {

    const mine =
        myReactionState.get(
            messageId
        );


    if (!mine) {

        return;
    }


    let changed =
        false;


    for (
        const emoji
        of Array.from(
        mine
    )
        ) {

        const count =
            Number(
                (
                    publicReactions
                    ||
                    {}
                )[emoji]
                ||
                0
            );


        if (
            count <= 0
        ) {

            mine.delete(
                emoji
            );


            changed =
                true;
        }
    }


    if (
        mine.size === 0
    ) {

        myReactionState.delete(
            messageId
        );
    }


    if (changed) {

        saveMyReactionState();
    }
}


// ======================================================
// START QUICKTALK
// ======================================================

async function startQuickTalk() {

    document.title =
        baseDocumentTitle;


    prepareOwnershipToken();


    prepareMyReactionState();


    document
        .getElementById(
            "roomName"
        )
        .textContent =
        "#" + room;


    document
        .getElementById(
            "chatRoomTitle"
        )
        .textContent =
        "#" + room;


    document
        .getElementById(
            "currentUserName"
        )
        .textContent =
        "@" + name;


    document
        .getElementById(
            "mobileRoomName"
        )
        .textContent =
        "#" + room;


    if (!historyLoaded) {

        await loadHistory();


        historyLoaded =
            true;
    }


    connectWebSocket();
}


// ======================================================
// HISTORY
// ======================================================

async function loadHistory() {

    try {

        const messages =
            await fetchRoomMessages();


        if (
            messages.length > 0
        ) {

            hideMessagesIntro();
        }


        for (
            const message
            of messages
            ) {

            displayMessage(
                message,
                false
            );
        }


    } catch (error) {

        console.error(
            "Could not load history:",
            error
        );


        showToast(
            "Could not load previous messages.",
            "error"
        );
    }
}


async function fetchRoomMessages() {

    const response =
        await fetch(
            "/api/messages/"
            +
            encodeURIComponent(
                room
            )
        );


    if (!response.ok) {

        throw new Error(
            "Could not load messages."
        );
    }


    return await response.json();
}


async function syncMissedMessages() {

    try {

        const messages =
            await fetchRoomMessages();


        for (
            const message
            of messages
            ) {

            displayMessage(
                message,
                true
            );
        }


    } catch (error) {

        console.error(
            "Could not sync messages:",
            error
        );
    }
}


// ======================================================
// WEBSOCKET
// ======================================================

function connectWebSocket() {

    if (
        leavingRoom
        ||
        serverRejected
        ||
        !name
    ) {

        return;
    }


    clearReconnectTimer();


    updateConnectionStatus(
        "connecting",

        reconnectAttempts > 0
            ? "Reconnecting..."
            : "Connecting"
    );


    if (
        !isValidClientId(
            quickTalkClientId
        )
    ) {

        quickTalkClientId =
            prepareClientId();
    }


    const protocol =
        window.location.protocol
        === "https:"
            ? "wss:"
            : "ws:";


    const url =
        protocol
        + "//"
        + window.location.host
        + "/ws?room="
        + encodeURIComponent(
            room
        )
        + "&name="
        + encodeURIComponent(
            name
        )
        + "&clientId="
        + encodeURIComponent(
            quickTalkClientId
        );


    socket =
        new WebSocket(
            url
        );


    // ==================================================
    // OPEN
    // ==================================================

    socket.onopen =
        async function () {

            const wasReconnect =
                reconnectAttempts > 0;


            reconnectAttempts =
                0;


            sentTypingState =
                false;


            updateConnectionStatus(
                "connected",
                "Connected"
            );


            await syncMissedMessages();


            if (wasReconnect) {

                showToast(
                    "Connection restored.",
                    "success"
                );
            }


            if (
                messageInput
                    .value
                    .trim()
            ) {

                handleTypingInput();
            }


            messageInput.focus();
        };


    // ==================================================
    // RECEIVE
    // ==================================================

    socket.onmessage =
        function (event) {

            let eventData;


            try {

                eventData =
                    JSON.parse(
                        event.data
                    );


            } catch (error) {

                console.error(
                    "Invalid WebSocket data:",
                    error
                );


                return;
            }


            // MESSAGE

            if (
                eventData.type
                === "message"
            ) {

                if (
                    eventData.data
                    &&
                    eventData.data.sender
                ) {

                    removeTypingUser(
                        eventData.data.sender
                    );
                }


                displayMessage(
                    eventData.data,
                    true
                );


                return;
            }


            // DELETE

            if (
                eventData.type
                === "message_deleted"
            ) {

                applyMessageDeleted(
                    eventData.messageId
                );


                return;
            }


            // PUBLIC REACTION COUNTS

            if (
                eventData.type
                === "message_reactions"
            ) {

                applyReactionUpdate(
                    eventData.messageId,
                    eventData.reactions
                );


                return;
            }


            // PRIVATE REACTION STATE

            if (
                eventData.type
                === "reaction_state"
            ) {

                applyMyReactionState(
                    eventData.messageId,
                    eventData.emoji,
                    eventData.active === true
                );


                return;
            }


            // TYPING

            if (
                eventData.type
                === "typing"
            ) {

                handleTypingEvent(
                    eventData
                );


                return;
            }


            // USERS

            if (
                eventData.type
                === "users"
            ) {

                displayUsers(
                    eventData.users
                );


                return;
            }


            // SYSTEM

            if (
                eventData.type
                === "system"
            ) {

                displaySystemMessage(
                    eventData.message
                );


                return;
            }


            // ACTION ERROR

            if (
                eventData.type
                === "action_error"
            ) {

                console.warn(
                    "QuickTalk action error:",
                    eventData.message
                );


                const serverMessage =
                    (
                        typeof eventData.message
                        === "string"
                        &&
                        eventData.message.trim()
                    )
                        ? eventData.message.trim()
                        : "That action could not be completed.";


                showToast(
                    serverMessage,
                    "error"
                );


                return;
            }


            // CONNECTION REJECTION

            if (
                eventData.type
                === "error"
            ) {

                serverRejected =
                    true;


                clearReconnectTimer();


                clearTypingState();


                closeReactionPicker();


                updateConnectionStatus(
                    "disconnected",
                    "Not connected"
                );


                sessionStorage.removeItem(
                    "quicktalkName"
                );


                name =
                    null;


                displayUsers(
                    []
                );


                closeMobileUsers();


                closeMessageSearch();


                cancelDeleteMessage();


                cancelReply();


                directNameInput.value =
                    "";


                showJoinOverlay(
                    eventData.message
                    ||
                    "Could not join the room."
                );
            }
        };


    // ==================================================
    // CLOSED
    // ==================================================

    socket.onclose =
        function () {

            socket =
                null;


            sentTypingState =
                false;


            clearTypingState();


            closeReactionPicker();


            displayUsers(
                []
            );


            if (
                leavingRoom
                ||
                serverRejected
                ||
                !name
            ) {

                return;
            }


            updateConnectionStatus(
                "connecting",
                "Reconnecting..."
            );


            scheduleReconnect();
        };


    // ==================================================
    // ERROR
    // ==================================================

    socket.onerror =
        function (error) {

            console.error(
                "WebSocket error:",
                error
            );


            updateConnectionStatus(
                "connecting",
                "Reconnecting..."
            );
        };
}


// ======================================================
// RECONNECT
// ======================================================

function scheduleReconnect() {

    if (
        leavingRoom
        ||
        serverRejected
        ||
        !name
    ) {

        return;
    }


    clearReconnectTimer();


    reconnectAttempts++;


    const delay =
        Math.min(
            reconnectAttempts
            * 2000,

            MAX_RECONNECT_DELAY
        );


    reconnectTimer =
        setTimeout(
            connectWebSocket,
            delay
        );
}


function clearReconnectTimer() {

    if (!reconnectTimer) {

        return;
    }


    clearTimeout(
        reconnectTimer
    );


    reconnectTimer =
        null;
}


function updateConnectionStatus(
    state,
    text
) {

    const status =
        document.getElementById(
            "connectionStatus"
        );


    const statusText =
        document.getElementById(
            "connectionStatusText"
        );


    if (
        !status
        ||
        !statusText
    ) {

        return;
    }


    status.className =
        "connection-status "
        + state;


    statusText.textContent =
        text;
}


// ======================================================
// TYPING
// ======================================================

function handleTypingInput() {

    if (
        !socket
        ||
        socket.readyState
        !== WebSocket.OPEN
    ) {

        return;
    }


    const hasText =
        messageInput
            .value
            .trim()
        !== "";


    if (!hasText) {

        sendTypingState(
            false
        );


        clearTimeout(
            typingStopTimer
        );


        return;
    }


    if (!sentTypingState) {

        sendTypingState(
            true
        );
    }


    clearTimeout(
        typingStopTimer
    );


    typingStopTimer =
        setTimeout(
            function () {

                sendTypingState(
                    false
                );

            },
            TYPING_STOP_DELAY
        );
}


function sendTypingState(
    typing
) {

    if (
        !socket
        ||
        socket.readyState
        !== WebSocket.OPEN
    ) {

        sentTypingState =
            false;


        return;
    }


    if (
        sentTypingState
        === typing
    ) {

        return;
    }


    socket.send(
        JSON.stringify(
            {
                type:
                    "typing",

                typing:
                typing
            }
        )
    );


    sentTypingState =
        typing;
}


function handleTypingEvent(
    eventData
) {

    const sender =
        eventData.sender;


    if (
        !sender
        ||
        sameUserName(
            sender,
            name
        )
    ) {

        return;
    }


    if (
        eventData.typing
    ) {

        typingUsers.add(
            sender
        );

    } else {

        removeTypingUser(
            sender
        );
    }


    renderTypingIndicator();
}


function removeTypingUser(
    sender
) {

    if (!sender) {

        return;
    }


    for (
        const typingUser
        of Array.from(
        typingUsers
    )
        ) {

        if (
            sameUserName(
                typingUser,
                sender
            )
        ) {

            typingUsers.delete(
                typingUser
            );
        }
    }


    renderTypingIndicator();
}


function clearTypingState() {

    typingUsers.clear();


    clearTimeout(
        typingStopTimer
    );


    typingStopTimer =
        null;


    sentTypingState =
        false;


    renderTypingIndicator();
}


function renderTypingIndicator() {

    if (
        !typingIndicator
        ||
        !typingIndicatorText
    ) {

        return;
    }


    const users =
        Array.from(
            typingUsers
        );


    if (
        users.length === 0
    ) {

        typingIndicator
            .classList
            .remove(
                "show"
            );


        typingIndicatorText.textContent =
            "";


        return;
    }


    if (
        users.length === 1
    ) {

        typingIndicatorText.textContent =
            users[0]
            + " is typing...";


    } else if (
        users.length === 2
    ) {

        typingIndicatorText.textContent =
            users[0]
            + " and "
            + users[1]
            + " are typing...";


    } else {

        typingIndicatorText.textContent =
            users.length
            + " people are typing...";
    }


    typingIndicator
        .classList
        .add(
            "show"
        );
}


// ======================================================
// REPLY
// ======================================================

function startReply(
    messageKey
) {

    closeReactionPicker();


    const target =
        messageStore.get(
            messageKey
        );


    if (
        !target
        ||
        !target.id
        ||
        target.deleted
    ) {

        showToast(
            "That message is no longer available.",
            "error"
        );


        return;
    }


    replyingToMessageId =
        target.id;


    replyComposerSender.textContent =
        sameUserName(
            target.sender,
            name
        )
            ? "↩ Replying to yourself"
            : "↩ Replying to "
            + target.sender;


    replyComposerMessage.textContent =
        createReplyPreview(
            target.message
        );


    replyComposer
        .classList
        .add(
            "show"
        );


    replyComposer.setAttribute(
        "aria-hidden",
        "false"
    );


    messageInput.focus();
}


function cancelReply() {

    replyingToMessageId =
        null;


    if (!replyComposer) {

        return;
    }


    replyComposer
        .classList
        .remove(
            "show"
        );


    replyComposer.setAttribute(
        "aria-hidden",
        "true"
    );


    replyComposerSender.textContent =
        "";


    replyComposerMessage.textContent =
        "";
}


function createReplyPreview(
    text
) {

    if (!text) {

        return "";
    }


    const cleanText =
        text.replace(
            /\s+/g,
            " "
        );


    if (
        cleanText.length <= 90
    ) {

        return cleanText;
    }


    return (
        cleanText.substring(
            0,
            87
        )
        + "..."
    );
}


function createReplyReference(
    chatMessage
) {

    if (
        !chatMessage.replyToId
        ||
        chatMessage.deleted
    ) {

        return null;
    }


    const reference =
        document.createElement(
            "button"
        );


    reference.type =
        "button";


    reference.className =
        "message-reply-reference";


    reference.dataset.replyToId =
        chatMessage.replyToId;


    renderReplyReference(
        reference,
        chatMessage.replyToId
    );


    return reference;
}


function renderReplyReference(
    reference,
    replyToId
) {

    reference.innerHTML =
        "";


    reference.disabled =
        false;


    reference.onclick =
        null;


    reference
        .classList
        .remove(
            "message-reply-unavailable"
        );


    const original =
        messageStore.get(
            replyToId
        );


    const icon =
        document.createElement(
            "span"
        );


    icon.className =
        "message-reply-icon";


    icon.textContent =
        "↩";


    const copy =
        document.createElement(
            "span"
        );


    copy.className =
        "message-reply-copy";


    const senderElement =
        document.createElement(
            "span"
        );


    senderElement.className =
        "message-reply-sender";


    const previewElement =
        document.createElement(
            "span"
        );


    previewElement.className =
        "message-reply-preview";


    if (!original) {

        senderElement.textContent =
            "Reply";


        previewElement.textContent =
            "Original message unavailable";


        reference.disabled =
            true;


        reference
            .classList
            .add(
                "message-reply-unavailable"
            );


        copy.appendChild(
            senderElement
        );


        copy.appendChild(
            previewElement
        );


        reference.appendChild(
            icon
        );


        reference.appendChild(
            copy
        );


        return;
    }


    senderElement.textContent =
        sameUserName(
            original.sender,
            name
        )
            ? "Reply to You"
            : "Reply to "
            + original.sender;


    if (
        original.deleted
    ) {

        previewElement.textContent =
            "Original message deleted";

    } else {

        previewElement.textContent =
            createReplyPreview(
                original.message
            );
    }


    copy.appendChild(
        senderElement
    );


    copy.appendChild(
        previewElement
    );


    reference.appendChild(
        icon
    );


    reference.appendChild(
        copy
    );


    if (
        renderedMessageElements.has(
            replyToId
        )
    ) {

        reference.onclick =
            function (event) {

                event.stopPropagation();


                jumpToMessage(
                    replyToId
                );
            };


    } else {

        reference.disabled =
            true;


        reference
            .classList
            .add(
                "message-reply-unavailable"
            );
    }
}


function refreshReplyReferencesForOriginal(
    messageId
) {

    document
        .querySelectorAll(
            ".message-reply-reference"
        )
        .forEach(
            function (reference) {

                if (
                    reference.dataset.replyToId
                    === messageId
                ) {

                    renderReplyReference(
                        reference,
                        messageId
                    );
                }
            }
        );
}


// ======================================================
// MESSAGE ACTIONS
// ======================================================

function createMessageActions(
    messageKey,
    chatMessage
) {

    if (
        !chatMessage
        ||
        chatMessage.deleted
    ) {

        return null;
    }


    const actions =
        document.createElement(
            "div"
        );


    actions.className =
        "message-actions";


    // REPLY

    const replyButton =
        document.createElement(
            "button"
        );


    replyButton.type =
        "button";


    replyButton.className =
        "message-action-button message-reply-button";


    replyButton.textContent =
        "↩";


    replyButton.title =
        "Reply";


    replyButton.setAttribute(
        "aria-label",
        "Reply to message"
    );


    replyButton.addEventListener(
        "click",
        function (event) {

            event.stopPropagation();


            startReply(
                messageKey
            );
        }
    );


    actions.appendChild(
        replyButton
    );


    // DELETE

    if (
        sameUserName(
            chatMessage.sender,
            name
        )
        &&
        chatMessage.ownershipProtected
    ) {

        const deleteButton =
            document.createElement(
                "button"
            );


        deleteButton.type =
            "button";


        deleteButton.className =
            "message-action-button message-delete-button";


        deleteButton.textContent =
            "🗑";


        deleteButton.title =
            "Delete message";


        deleteButton.setAttribute(
            "aria-label",
            "Delete your message"
        );


        deleteButton.addEventListener(
            "click",
            function (event) {

                event.stopPropagation();


                requestDeleteMessage(
                    messageKey
                );
            }
        );


        actions.appendChild(
            deleteButton
        );
    }


    return actions;
}


// ======================================================
// REACTIONS
// ======================================================

function createReactionPicker(
    messageKey,
    chatMessage
) {

    if (
        !chatMessage
        ||
        chatMessage.deleted
    ) {

        return null;
    }


    const picker =
        document.createElement(
            "div"
        );


    picker.className =
        "message-reaction-picker";


    picker.dataset.messageKey =
        messageKey;


    for (
        const emoji
        of REACTION_OPTIONS
        ) {

        const button =
            document.createElement(
                "button"
            );


        button.type =
            "button";


        button.className =
            "message-reaction-option";


        button.dataset.emoji =
            emoji;


        const selected =
            hasMyReaction(
                messageKey,
                emoji
            );


        if (selected) {

            button.classList.add(
                "selected"
            );
        }


        button.textContent =
            emoji;


        button.title =
            selected
                ? "Remove " + emoji
                : "React " + emoji;


        button.setAttribute(
            "aria-pressed",
            selected
                ? "true"
                : "false"
        );


        button.addEventListener(
            "click",
            function (event) {

                event.stopPropagation();


                sendReaction(
                    messageKey,
                    emoji
                );
            }
        );


        picker.appendChild(
            button
        );
    }


    return picker;
}


function updateReactionPickerState(
    messageId
) {

    const element =
        renderedMessageElements.get(
            messageId
        );


    if (!element) {

        return;
    }


    const picker =
        element.querySelector(
            ".message-reaction-picker"
        );


    if (!picker) {

        return;
    }


    picker
        .querySelectorAll(
            ".message-reaction-option"
        )
        .forEach(
            function (button) {

                const emoji =
                    button.dataset.emoji;


                const selected =
                    hasMyReaction(
                        messageId,
                        emoji
                    );


                button
                    .classList
                    .toggle(
                        "selected",
                        selected
                    );


                button.setAttribute(
                    "aria-pressed",
                    selected
                        ? "true"
                        : "false"
                );


                button.title =
                    selected
                        ? "Remove " + emoji
                        : "React " + emoji;
            }
        );
}


function toggleReactionPicker(
    messageKey
) {

    const message =
        messageStore.get(
            messageKey
        );


    if (
        !message
        ||
        message.deleted
    ) {

        return;
    }


    const element =
        renderedMessageElements.get(
            messageKey
        );


    if (!element) {

        return;
    }


    const picker =
        element.querySelector(
            ".message-reaction-picker"
        );


    if (!picker) {

        return;
    }


    if (
        activeReactionMessageId
        === messageKey
        &&
        picker.classList.contains(
            "show"
        )
    ) {

        closeReactionPicker();


        return;
    }


    closeReactionPicker();


    updateReactionPickerState(
        messageKey
    );


    picker.classList.add(
        "show"
    );


    element.classList.add(
        "message-controls-open"
    );


    activeReactionMessageId =
        messageKey;
}


function closeReactionPicker() {

    document
        .querySelectorAll(
            ".message-reaction-picker.show"
        )
        .forEach(
            function (picker) {

                picker.classList.remove(
                    "show"
                );
            }
        );


    document
        .querySelectorAll(
            ".message-controls-open"
        )
        .forEach(
            function (element) {

                element.classList.remove(
                    "message-controls-open"
                );
            }
        );


    activeReactionMessageId =
        null;
}


function sendReaction(
    messageKey,
    emoji
) {

    const message =
        messageStore.get(
            messageKey
        );


    if (
        !message
        ||
        !message.id
        ||
        message.deleted
    ) {

        closeReactionPicker();


        return;
    }


    if (
        !REACTION_OPTIONS.includes(
            emoji
        )
    ) {

        return;
    }


    if (
        !socket
        ||
        socket.readyState
        !== WebSocket.OPEN
    ) {

        closeReactionPicker();


        showToast(
            "Reconnecting. Please try again.",
            "error"
        );


        return;
    }


    if (
        !isValidOwnershipToken(
            ownershipToken
        )
    ) {

        prepareOwnershipToken();


        prepareMyReactionState();
    }


    if (
        !isValidOwnershipToken(
            ownershipToken
        )
    ) {

        showToast(
            "Could not update reaction.",
            "error"
        );


        return;
    }


    touchOwnershipToken();


    socket.send(
        JSON.stringify(
            {
                type:
                    "reaction",

                messageId:
                message.id,

                emoji:
                emoji,

                token:
                ownershipToken
            }
        )
    );


    closeReactionPicker();
}


function applyReactionUpdate(
    messageId,
    reactions
) {

    if (!messageId) {

        return;
    }


    const message =
        messageStore.get(
            messageId
        );


    if (message) {

        message.reactions =
            reactions || {};
    }


    reconcileMyReactionState(
        messageId,
        reactions || {}
    );


    renderReactionSummary(
        messageId
    );


    updateReactionPickerState(
        messageId
    );
}


function renderReactionSummary(
    messageId
) {

    const message =
        messageStore.get(
            messageId
        );


    const element =
        renderedMessageElements.get(
            messageId
        );


    if (
        !message
        ||
        !element
    ) {

        return;
    }


    let summary =
        element.querySelector(
            ".message-reaction-summary"
        );


    if (
        message.deleted
    ) {

        if (summary) {

            summary.remove();
        }


        return;
    }


    const reactions =
        message.reactions || {};


    const visible =
        REACTION_OPTIONS.filter(
            function (emoji) {

                return Number(
                    reactions[emoji]
                    ||
                    0
                ) > 0;
            }
        );


    if (
        visible.length === 0
    ) {

        if (summary) {

            summary.remove();
        }


        return;
    }


    if (!summary) {

        summary =
            document.createElement(
                "div"
            );


        summary.className =
            "message-reaction-summary";


        element.appendChild(
            summary
        );
    }


    summary.innerHTML =
        "";


    for (
        const emoji
        of visible
        ) {

        const count =
            Number(
                reactions[emoji]
            );


        const mine =
            hasMyReaction(
                messageId,
                emoji
            );


        const chip =
            document.createElement(
                "button"
            );


        chip.type =
            "button";


        chip.className =
            "message-reaction-chip";


        if (mine) {

            chip.classList.add(
                "my-reaction"
            );
        }


        chip.setAttribute(
            "aria-pressed",
            mine
                ? "true"
                : "false"
        );


        chip.title =
            mine
                ? "Remove your " + emoji + " reaction"
                : "React with " + emoji;


        const emojiElement =
            document.createElement(
                "span"
            );


        emojiElement.className =
            "message-reaction-chip-emoji";


        emojiElement.textContent =
            emoji;


        const countElement =
            document.createElement(
                "span"
            );


        countElement.className =
            "message-reaction-chip-count";


        countElement.textContent =
            count;


        chip.addEventListener(
            "click",
            function (event) {

                event.preventDefault();


                event.stopPropagation();


                sendReaction(
                    messageId,
                    emoji
                );
            }
        );


        chip.appendChild(
            emojiElement
        );


        chip.appendChild(
            countElement
        );


        summary.appendChild(
            chip
        );
    }
}


document.addEventListener(
    "click",
    function (event) {

        const target =
            event.target;


        if (
            target.closest(
                ".message-bubble"
            )
            ||
            target.closest(
                ".message-reaction-picker"
            )
            ||
            target.closest(
                ".message-actions"
            )
            ||
            target.closest(
                ".message-reaction-summary"
            )
        ) {

            return;
        }


        closeReactionPicker();
    }
);


// ======================================================
// DELETE
// ======================================================

function requestDeleteMessage(
    messageKey
) {

    closeReactionPicker();


    const target =
        messageStore.get(
            messageKey
        );


    if (
        !target
        ||
        !target.id
        ||
        target.deleted
    ) {

        return;
    }


    if (
        !sameUserName(
            target.sender,
            name
        )
        ||
        !target.ownershipProtected
    ) {

        return;
    }


    pendingDeleteMessageId =
        target.id;


    deleteMessagePreview.textContent =
        createReplyPreview(
            target.message
        );


    deleteMessageOverlay.classList.add(
        "show"
    );


    deleteMessageOverlay.setAttribute(
        "aria-hidden",
        "false"
    );
}


function cancelDeleteMessage() {

    pendingDeleteMessageId =
        null;


    if (!deleteMessageOverlay) {

        return;
    }


    deleteMessageOverlay.classList.remove(
        "show"
    );


    deleteMessageOverlay.setAttribute(
        "aria-hidden",
        "true"
    );


    if (deleteMessagePreview) {

        deleteMessagePreview.textContent =
            "";
    }
}


function confirmDeleteMessage() {

    const messageId =
        pendingDeleteMessageId;


    if (!messageId) {

        cancelDeleteMessage();


        return;
    }


    if (
        !socket
        ||
        socket.readyState
        !== WebSocket.OPEN
    ) {

        cancelDeleteMessage();


        showToast(
            "Reconnecting. Please try again.",
            "error"
        );


        return;
    }


    if (
        !isValidOwnershipToken(
            ownershipToken
        )
    ) {

        prepareOwnershipToken();


        prepareMyReactionState();
    }


    if (
        !isValidOwnershipToken(
            ownershipToken
        )
    ) {

        cancelDeleteMessage();


        showToast(
            "Could not delete the message.",
            "error"
        );


        return;
    }


    touchOwnershipToken();


    socket.send(
        JSON.stringify(
            {
                type:
                    "delete_message",

                messageId:
                messageId,

                token:
                ownershipToken
            }
        )
    );


    cancelDeleteMessage();
}


function applyMessageDeleted(
    messageId
) {

    if (!messageId) {

        return;
    }


    removeMyReactionStateForMessage(
        messageId
    );


    const message =
        messageStore.get(
            messageId
        );


    if (message) {

        message.message =
            null;


        message.replyToId =
            null;


        message.deleted =
            true;


        message.ownershipProtected =
            false;


        message.reactions =
            {};
    }


    const element =
        renderedMessageElements.get(
            messageId
        );


    if (element) {

        element.classList.add(
            "deleted-message"
        );


        const replyReference =
            element.querySelector(
                ".message-reply-reference"
            );


        if (replyReference) {

            replyReference.remove();
        }


        const bubble =
            element.querySelector(
                ".message-bubble"
            );


        if (bubble) {

            bubble.textContent =
                "This message was deleted.";


            bubble.removeAttribute(
                "tabindex"
            );


            bubble.classList.add(
                "message-bubble-deleted"
            );
        }


        const actions =
            element.querySelector(
                ".message-actions"
            );


        if (actions) {

            actions.remove();
        }


        const picker =
            element.querySelector(
                ".message-reaction-picker"
            );


        if (picker) {

            picker.remove();
        }


        const summary =
            element.querySelector(
                ".message-reaction-summary"
            );


        if (summary) {

            summary.remove();
        }
    }


    if (
        replyingToMessageId
        === messageId
    ) {

        cancelReply();
    }


    if (
        activeReactionMessageId
        === messageId
    ) {

        closeReactionPicker();
    }


    lastRenderedMessage =
        null;


    refreshReplyReferencesForOriginal(
        messageId
    );


    if (
        messageSearchOverlay
        &&
        messageSearchOverlay.classList.contains(
            "show"
        )
    ) {

        renderSearchResults();
    }
}


// ======================================================
// SEARCH
// ======================================================

function toggleMessageSearch() {

    if (
        messageSearchOverlay.classList.contains(
            "show"
        )
    ) {

        closeMessageSearch();

    } else {

        openMessageSearch();
    }
}


function openMessageSearch() {

    closeMobileUsers();


    closeReactionPicker();


    messageSearchOverlay.classList.add(
        "show"
    );


    messageSearchOverlay.setAttribute(
        "aria-hidden",
        "false"
    );


    const button =
        document.getElementById(
            "searchButton"
        );


    if (button) {

        button.setAttribute(
            "aria-expanded",
            "true"
        );
    }


    renderSearchResults();


    setTimeout(
        function () {

            messageSearchInput.focus();


            messageSearchInput.select();

        },
        80
    );
}


function closeMessageSearch() {

    if (!messageSearchOverlay) {

        return;
    }


    messageSearchOverlay.classList.remove(
        "show"
    );


    messageSearchOverlay.setAttribute(
        "aria-hidden",
        "true"
    );


    const button =
        document.getElementById(
            "searchButton"
        );


    if (button) {

        button.setAttribute(
            "aria-expanded",
            "false"
        );
    }
}


messageSearchInput.addEventListener(
    "input",
    renderSearchResults
);


function renderSearchResults() {

    const query =
        messageSearchInput
            .value
            .trim()
            .toLowerCase();


    messageSearchResults.innerHTML =
        "";


    const searchableMessages =
        Array
            .from(
                messageStore.entries()
            )
            .filter(
                function (
                    [key, message]
                ) {

                    return !message.deleted;
                }
            );


    if (!query) {

        messageSearchResultCount.textContent =
            searchableMessages.length
            +
            (
                searchableMessages.length
                === 1
                    ? " loaded message"
                    : " loaded messages"
            );


        createSearchEmpty(
            "Find a message",
            "Search by message text or sender name."
        );


        return;
    }


    const matches =
        searchableMessages
            .filter(
                function (
                    [key, message]
                ) {

                    const sender =
                        (
                            message.sender
                            || ""
                        )
                            .toLowerCase();


                    const content =
                        (
                            message.message
                            || ""
                        )
                            .toLowerCase();


                    return (
                        sender.includes(
                            query
                        )
                        ||
                        content.includes(
                            query
                        )
                    );
                }
            )
            .sort(
                function (
                    first,
                    second
                ) {

                    return (
                        new Date(
                            second[1].createdAt
                        ).getTime()
                        -
                        new Date(
                            first[1].createdAt
                        ).getTime()
                    );
                }
            );


    messageSearchResultCount.textContent =
        matches.length
        +
        (
            matches.length === 1
                ? " result"
                : " results"
        );


    if (
        matches.length === 0
    ) {

        createSearchEmpty(
            "No messages found",
            "Try another word or sender name."
        );


        return;
    }


    for (
        const [
            messageKey,
            message
        ]
        of matches.slice(
        0,
        50
    )
        ) {

        const result =
            document.createElement(
                "button"
            );


        result.type =
            "button";


        result.className =
            "message-search-result";


        const top =
            document.createElement(
                "div"
            );


        top.className =
            "message-search-result-top";


        const sender =
            document.createElement(
                "strong"
            );


        sender.textContent =
            sameUserName(
                message.sender,
                name
            )
                ? "You"
                : message.sender;


        const date =
            document.createElement(
                "span"
            );


        date.textContent =
            formatSearchResultDate(
                new Date(
                    message.createdAt
                )
            );


        top.appendChild(
            sender
        );


        top.appendChild(
            date
        );


        const preview =
            document.createElement(
                "p"
            );


        preview.textContent =
            createSearchPreview(
                message.message
            );


        result.appendChild(
            top
        );


        result.appendChild(
            preview
        );


        result.addEventListener(
            "click",
            function () {

                jumpToMessage(
                    messageKey
                );
            }
        );


        messageSearchResults.appendChild(
            result
        );
    }
}


function createSearchEmpty(
    titleText,
    descriptionText
) {

    const empty =
        document.createElement(
            "div"
        );


    empty.className =
        "message-search-empty";


    const title =
        document.createElement(
            "strong"
        );


    title.textContent =
        titleText;


    const description =
        document.createElement(
            "span"
        );


    description.textContent =
        descriptionText;


    empty.appendChild(
        title
    );


    empty.appendChild(
        description
    );


    messageSearchResults.appendChild(
        empty
    );
}


function createSearchPreview(
    text
) {

    if (!text) {

        return "";
    }


    if (
        text.length <= 120
    ) {

        return text;
    }


    return (
        text.substring(
            0,
            117
        )
        + "..."
    );
}


function formatSearchResultDate(
    date
) {

    const today =
        new Date();


    const sameDay =
        today.getFullYear()
        === date.getFullYear()
        &&
        today.getMonth()
        === date.getMonth()
        &&
        today.getDate()
        === date.getDate();


    const time =
        date.toLocaleTimeString(
            [],
            {
                hour:
                    "2-digit",

                minute:
                    "2-digit"
            }
        );


    if (sameDay) {

        return "Today · "
            + time;
    }


    return (
        date.toLocaleDateString(
            [],
            {
                month:
                    "short",

                day:
                    "numeric"
            }
        )
        + " · "
        + time
    );
}


function jumpToMessage(
    messageKey
) {

    const element =
        renderedMessageElements.get(
            messageKey
        );


    if (!element) {

        showToast(
            "That message is not currently visible.",
            "error"
        );


        return;
    }


    closeMessageSearch();


    closeReactionPicker();


    element.scrollIntoView(
        {
            behavior:
                "smooth",

            block:
                "center"
        }
    );


    document
        .querySelectorAll(
            ".message-search-highlight"
        )
        .forEach(
            function (item) {

                item.classList.remove(
                    "message-search-highlight"
                );
            }
        );


    element.classList.add(
        "message-search-highlight"
    );


    if (searchHighlightTimer) {

        clearTimeout(
            searchHighlightTimer
        );
    }


    searchHighlightTimer =
        setTimeout(
            function () {

                element.classList.remove(
                    "message-search-highlight"
                );

            },
            2200
        );
}


// ======================================================
// KEYBOARD
// ======================================================

document.addEventListener(
    "keydown",
    function (event) {

        const searchShortcut =
            (
                event.ctrlKey
                ||
                event.metaKey
            )
            &&
            event.key.toLowerCase()
            === "k";


        if (searchShortcut) {

            event.preventDefault();


            toggleMessageSearch();


            return;
        }


        if (
            event.key
            !== "Escape"
        ) {

            return;
        }


        if (
            activeReactionMessageId
        ) {

            closeReactionPicker();


            return;
        }


        if (
            deleteMessageOverlay
            &&
            deleteMessageOverlay.classList.contains(
                "show"
            )
        ) {

            cancelDeleteMessage();


            return;
        }


        if (
            messageSearchOverlay.classList.contains(
                "show"
            )
        ) {

            closeMessageSearch();


            return;
        }


        if (
            mobileUsersOverlay.classList.contains(
                "show"
            )
        ) {

            closeMobileUsers();


            return;
        }


        if (
            replyingToMessageId
        ) {

            cancelReply();


            messageInput.focus();
        }
    }
);


// ======================================================
// DISPLAY MESSAGE
// ======================================================

function displayMessage(
    chatMessage,
    isLiveMessage = false
) {

    if (!chatMessage) {

        return;
    }


    const messageKey =
        createMessageKey(
            chatMessage
        );


    // ==================================================
    // STORE LATEST SERVER STATE
    // ==================================================

    messageStore.set(
        messageKey,
        chatMessage
    );


    reconcileMyReactionState(
        messageKey,
        chatMessage.reactions || {}
    );


    // ==================================================
    // ALREADY RENDERED
    // ==================================================

    if (
        renderedMessageIds.has(
            messageKey
        )
    ) {

        /*
         * The database state may have changed while
         * the browser was disconnected.
         */

        if (
            chatMessage.deleted
        ) {

            applyMessageDeleted(
                messageKey
            );


            return;
        }


        renderReactionSummary(
            messageKey
        );


        updateReactionPickerState(
            messageKey
        );


        refreshReplyReferencesForOriginal(
            messageKey
        );


        return;
    }


    renderedMessageIds.add(
        messageKey
    );


    hideMessagesIntro();


    const wasNearBottom =
        isNearMessageBottom();


    const messageDate =
        new Date(
            chatMessage.createdAt
        );


    addDateSeparatorIfNeeded(
        messageDate
    );


    const grouped =
        !chatMessage.deleted
        &&
        shouldGroupMessage(
            chatMessage,
            messageDate
        );


    const isMine =
        sameUserName(
            chatMessage.sender,
            name
        );


    const container =
        document.createElement(
            "div"
        );


    container.className =
        isMine
            ? "message my-message"
            : "message other-message";


    container.dataset.messageKey =
        messageKey;


    if (grouped) {

        container.classList.add(
            "grouped-message"
        );
    }


    if (
        chatMessage.deleted
    ) {

        container.classList.add(
            "deleted-message"
        );
    }


    // INFO

    if (!grouped) {

        const info =
            document.createElement(
                "div"
            );


        info.className =
            "message-info";


        const sender =
            document.createElement(
                "span"
            );


        sender.className =
            "message-sender";


        sender.textContent =
            isMine
                ? "You"
                : chatMessage.sender;


        const time =
            document.createElement(
                "span"
            );


        time.className =
            "message-time";


        time.textContent =
            formatMessageTime(
                messageDate
            );


        info.appendChild(
            sender
        );


        info.appendChild(
            time
        );


        container.appendChild(
            info
        );
    }


    // REPLY REFERENCE

    const replyReference =
        createReplyReference(
            chatMessage
        );


    if (replyReference) {

        container.appendChild(
            replyReference
        );
    }


    // BUBBLE SHELL

    const bubbleShell =
        document.createElement(
            "div"
        );


    bubbleShell.className =
        "message-bubble-shell";


    // BUBBLE

    const bubble =
        document.createElement(
            "div"
        );


    bubble.className =
        "message-bubble";


    if (
        chatMessage.deleted
    ) {

        bubble.textContent =
            "This message was deleted.";


        bubble.classList.add(
            "message-bubble-deleted"
        );


    } else {

        bubble.textContent =
            chatMessage.message;


        bubble.tabIndex =
            0;


        bubble.addEventListener(
            "click",
            function (event) {

                event.stopPropagation();


                toggleReactionPicker(
                    messageKey
                );
            }
        );


        bubble.addEventListener(
            "keydown",
            function (event) {

                if (
                    event.key === "Enter"
                    ||
                    event.key === " "
                ) {

                    event.preventDefault();


                    event.stopPropagation();


                    toggleReactionPicker(
                        messageKey
                    );
                }
            }
        );
    }


    bubbleShell.appendChild(
        bubble
    );


    const actions =
        createMessageActions(
            messageKey,
            chatMessage
        );


    if (actions) {

        bubbleShell.appendChild(
            actions
        );
    }


    const picker =
        createReactionPicker(
            messageKey,
            chatMessage
        );


    if (picker) {

        bubbleShell.appendChild(
            picker
        );
    }


    container.appendChild(
        bubbleShell
    );


    messagesContainer.appendChild(
        container
    );


    renderedMessageElements.set(
        messageKey,
        container
    );


    renderReactionSummary(
        messageKey
    );


    updateReactionPickerState(
        messageKey
    );


    refreshReplyReferencesForOriginal(
        messageKey
    );


    if (
        chatMessage.deleted
    ) {

        lastRenderedMessage =
            null;

    } else {

        lastRenderedMessage =
            {
                sender:
                chatMessage.sender,

                date:
                messageDate
            };
    }


    if (
        messageSearchOverlay
        &&
        messageSearchOverlay.classList.contains(
            "show"
        )
        &&
        messageSearchInput
            .value
            .trim()
    ) {

        renderSearchResults();
    }


    if (
        isLiveMessage
        &&
        !isMine
    ) {

        registerIncomingMessage(
            wasNearBottom
        );
    }


    if (
        !isLiveMessage
        ||
        isMine
        ||
        wasNearBottom
    ) {

        scrollToBottom();
    }
}


function createMessageKey(
    chatMessage
) {

    if (
        chatMessage.id
    ) {

        return chatMessage.id;
    }


    return (
        chatMessage.room
        + "|"
        + chatMessage.sender
        + "|"
        + chatMessage.createdAt
        + "|"
        + chatMessage.message
    );
}


// ======================================================
// GROUPING
// ======================================================

function shouldGroupMessage(
    chatMessage,
    currentDate
) {

    if (
        chatMessage.replyToId
        ||
        chatMessage.deleted
    ) {

        return false;
    }


    if (
        !lastRenderedMessage
    ) {

        return false;
    }


    if (
        !sameUserName(
            lastRenderedMessage.sender,
            chatMessage.sender
        )
    ) {

        return false;
    }


    if (
        getDateKey(
            lastRenderedMessage.date
        )
        !==
        getDateKey(
            currentDate
        )
    ) {

        return false;
    }


    const difference =
        currentDate.getTime()
        -
        lastRenderedMessage
            .date
            .getTime();


    return (
        difference >= 0
        &&
        difference
        <= 5 * 60 * 1000
    );
}


// ======================================================
// DATE
// ======================================================

function addDateSeparatorIfNeeded(
    date
) {

    const key =
        getDateKey(
            date
        );


    if (
        lastRenderedDateKey
        === key
    ) {

        return;
    }


    const separator =
        document.createElement(
            "div"
        );


    separator.className =
        "date-separator";


    const left =
        document.createElement(
            "span"
        );


    left.className =
        "date-separator-line";


    const text =
        document.createElement(
            "span"
        );


    text.className =
        "date-separator-text";


    text.textContent =
        formatDateSeparator(
            date
        );


    const right =
        document.createElement(
            "span"
        );


    right.className =
        "date-separator-line";


    separator.appendChild(
        left
    );


    separator.appendChild(
        text
    );


    separator.appendChild(
        right
    );


    messagesContainer.appendChild(
        separator
    );


    lastRenderedDateKey =
        key;


    lastRenderedMessage =
        null;
}


function getDateKey(
    date
) {

    return (
        date.getFullYear()
        + "-"
        + String(
            date.getMonth() + 1
        ).padStart(
            2,
            "0"
        )
        + "-"
        + String(
            date.getDate()
        ).padStart(
            2,
            "0"
        )
    );
}


function formatDateSeparator(
    date
) {

    const today =
        new Date();


    const todayStart =
        new Date(
            today.getFullYear(),
            today.getMonth(),
            today.getDate()
        );


    const messageStart =
        new Date(
            date.getFullYear(),
            date.getMonth(),
            date.getDate()
        );


    const difference =
        todayStart.getTime()
        -
        messageStart.getTime();


    const oneDay =
        24 * 60 * 60 * 1000;


    if (
        difference === 0
    ) {

        return "Today";
    }


    if (
        difference === oneDay
    ) {

        return "Yesterday";
    }


    return date.toLocaleDateString(
        [],
        {
            month:
                "short",

            day:
                "numeric",

            year:
                "numeric"
        }
    );
}


function formatMessageTime(
    date
) {

    return date.toLocaleTimeString(
        [],
        {
            hour:
                "2-digit",

            minute:
                "2-digit"
        }
    );
}


// ======================================================
// SYSTEM MESSAGE
// ======================================================

function displaySystemMessage(
    text
) {

    const wasNearBottom =
        isNearMessageBottom();


    const systemMessage =
        document.createElement(
            "div"
        );


    systemMessage.className =
        "system-message";


    const normalized =
        text.toLowerCase();


    if (
        normalized.includes(
            "joined the room"
        )
    ) {

        systemMessage.classList.add(
            "system-join"
        );
    }


    if (
        normalized.includes(
            "left the room"
        )
    ) {

        systemMessage.classList.add(
            "system-leave"
        );
    }


    const dot =
        document.createElement(
            "span"
        );


    dot.className =
        "system-message-dot";


    const content =
        document.createElement(
            "span"
        );


    content.textContent =
        text;


    systemMessage.appendChild(
        dot
    );


    systemMessage.appendChild(
        content
    );


    messagesContainer.appendChild(
        systemMessage
    );


    lastRenderedMessage =
        null;


    if (
        wasNearBottom
    ) {

        scrollToBottom();
    }
}


// ======================================================
// USERS
// ======================================================

function displayUsers(
    users
) {

    if (
        !Array.isArray(
            users
        )
    ) {

        users =
            [];
    }


    document
        .getElementById(
            "userCount"
        )
        .textContent =
        users.length;


    document
        .getElementById(
            "mobileUserCount"
        )
        .textContent =
        users.length;


    document
        .getElementById(
            "mobileHeaderUserCount"
        )
        .textContent =
        users.length;


    for (
        const typingUser
        of Array.from(
        typingUsers
    )
        ) {

        const stillOnline =
            users.some(
                function (user) {

                    return sameUserName(
                        user,
                        typingUser
                    );
                }
            );


        if (!stillOnline) {

            typingUsers.delete(
                typingUser
            );
        }
    }


    renderTypingIndicator();


    renderUserList(
        document.getElementById(
            "userList"
        ),
        users,
        false
    );


    renderUserList(
        document.getElementById(
            "mobileUserList"
        ),
        users,
        true
    );
}


function renderUserList(
    container,
    users,
    mobile
) {

    container.innerHTML =
        "";


    for (
        const user
        of users
        ) {

        const item =
            document.createElement(
                "div"
            );


        item.className =
            mobile
                ? "mobile-user-item"
                : "user-item";


        const avatar =
            document.createElement(
                "div"
            );


        avatar.className =
            mobile
                ? "mobile-user-avatar"
                : "user-avatar";


        avatar.textContent =
            user
                .charAt(
                    0
                )
                .toUpperCase();


        const info =
            document.createElement(
                "div"
            );


        info.className =
            mobile
                ? "mobile-user-info"
                : "user-info";


        const userName =
            document.createElement(
                "span"
            );


        userName.className =
            mobile
                ? "mobile-user-name"
                : "user-name";


        userName.textContent =
            sameUserName(
                user,
                name
            )
                ? user + " (You)"
                : user;


        const onlineText =
            document.createElement(
                "span"
            );


        onlineText.className =
            mobile
                ? "mobile-user-status"
                : "user-online-text";


        onlineText.textContent =
            "Online";


        info.appendChild(
            userName
        );


        info.appendChild(
            onlineText
        );


        const dot =
            document.createElement(
                "span"
            );


        dot.className =
            mobile
                ? "mobile-user-dot"
                : "online-dot";


        item.appendChild(
            avatar
        );


        item.appendChild(
            info
        );


        item.appendChild(
            dot
        );


        container.appendChild(
            item
        );
    }
}


// ======================================================
// MOBILE USERS
// ======================================================

function openMobileUsers() {

    closeMessageSearch();


    closeReactionPicker();


    mobileUsersOverlay.classList.add(
        "show"
    );


    mobileUsersOverlay.setAttribute(
        "aria-hidden",
        "false"
    );
}


function closeMobileUsers() {

    if (!mobileUsersOverlay) {

        return;
    }


    mobileUsersOverlay.classList.remove(
        "show"
    );


    mobileUsersOverlay.setAttribute(
        "aria-hidden",
        "true"
    );
}


window.addEventListener(
    "resize",
    function () {

        if (
            window.innerWidth
            > 700
        ) {

            closeMobileUsers();
        }
    }
);


// ======================================================
// SEND MESSAGE
// ======================================================

document
    .getElementById(
        "messageForm"
    )
    .addEventListener(
        "submit",
        function (event) {

            event.preventDefault();


            const message =
                messageInput
                    .value
                    .trim();


            if (!message) {

                return;
            }


            if (
                message.length > 500
            ) {

                showToast(
                    "Message cannot be longer than 500 characters.",
                    "error"
                );


                return;
            }


            if (
                !socket
                ||
                socket.readyState
                !== WebSocket.OPEN
            ) {

                showToast(
                    "Reconnecting. Please wait a moment.",
                    "error"
                );


                return;
            }


            if (
                !isValidOwnershipToken(
                    ownershipToken
                )
            ) {

                prepareOwnershipToken();


                prepareMyReactionState();
            }


            if (
                !isValidOwnershipToken(
                    ownershipToken
                )
            ) {

                showToast(
                    "Could not send the message. Please try again.",
                    "error"
                );


                return;
            }


            sendTypingState(
                false
            );


            clearTimeout(
                typingStopTimer
            );


            touchOwnershipToken();


            const outgoingMessage =
                {
                    type:
                        "message",

                    message:
                    message,

                    token:
                    ownershipToken
                };


            if (
                replyingToMessageId
            ) {

                outgoingMessage.replyToId =
                    replyingToMessageId;
            }


            socket.send(
                JSON.stringify(
                    outgoingMessage
                )
            );


            messageInput.value =
                "";


            updateMessageCounter();


            cancelReply();


            closeReactionPicker();


            messageInput.focus();
        }
    );


messageInput.addEventListener(
    "input",
    function () {

        updateMessageCounter();


        handleTypingInput();
    }
);


function updateMessageCounter() {

    const length =
        messageInput
            .value
            .length;


    messageCounter.textContent =
        length
        + " / 500";


    if (
        length >= 450
    ) {

        messageCounter.classList.add(
            "warning"
        );

    } else {

        messageCounter.classList.remove(
            "warning"
        );
    }
}


// ======================================================
// SHARE
// ======================================================

async function shareRoom() {

    const link =
        window.location.href;


    try {

        await navigator
            .clipboard
            .writeText(
                link
            );


        showCopiedState();


        showToast(
            "Room link copied.",
            "success"
        );


    } catch (error) {

        const temporaryInput =
            document.createElement(
                "textarea"
            );


        temporaryInput.value =
            link;


        temporaryInput.style.position =
            "fixed";


        temporaryInput.style.opacity =
            "0";


        document.body.appendChild(
            temporaryInput
        );


        temporaryInput.select();


        try {

            document.execCommand(
                "copy"
            );


            showCopiedState();


            showToast(
                "Room link copied.",
                "success"
            );


        } catch (copyError) {

            showToast(
                "Could not copy room link.",
                "error"
            );
        }


        temporaryInput.remove();
    }
}


function showCopiedState() {

    const button =
        document.getElementById(
            "shareButton"
        );


    const text =
        document.getElementById(
            "shareButtonText"
        );


    button.classList.add(
        "copied"
    );


    text.textContent =
        "Copied!";


    setTimeout(
        function () {

            button.classList.remove(
                "copied"
            );


            text.textContent =
                "Share Room";

        },
        1600
    );
}


// ======================================================
// TOAST
// ======================================================

function showToast(
    message,
    type = "info"
) {

    const container =
        document.getElementById(
            "toastContainer"
        );


    if (!container) {

        return;
    }


    const toast =
        document.createElement(
            "div"
        );


    toast.className =
        "toast toast-"
        + type;


    const dot =
        document.createElement(
            "span"
        );


    dot.className =
        "toast-dot";


    const text =
        document.createElement(
            "span"
        );


    text.className =
        "toast-text";


    text.textContent =
        message;


    toast.appendChild(
        dot
    );


    toast.appendChild(
        text
    );


    container.appendChild(
        toast
    );


    requestAnimationFrame(
        function () {

            toast.classList.add(
                "show"
            );
        }
    );


    setTimeout(
        function () {

            toast.classList.remove(
                "show"
            );


            setTimeout(
                function () {

                    toast.remove();

                },
                250
            );

        },
        3000
    );
}


// ======================================================
// UNREAD
// ======================================================

function isNearMessageBottom() {

    if (!messagesContainer) {

        return true;
    }


    const distance =
        messagesContainer.scrollHeight
        -
        messagesContainer.scrollTop
        -
        messagesContainer.clientHeight;


    return (
        distance <= 90
    );
}


function registerIncomingMessage(
    wasNearBottom
) {

    if (
        document.hidden
        ||
        !document.hasFocus()
    ) {

        tabUnreadCount++;
    }


    if (!wasNearBottom) {

        pendingNewMessageCount++;
    }


    updateUnreadMessageUI();
}


function updateUnreadMessageUI() {

    document.title =
        tabUnreadCount > 0
            ? "("
            + tabUnreadCount
            + ") "
            + baseDocumentTitle
            : baseDocumentTitle;


    if (
        !newMessagesNotice
        ||
        !newMessagesCount
    ) {

        return;
    }


    if (
        pendingNewMessageCount > 0
    ) {

        newMessagesNotice.classList.add(
            "show"
        );


        newMessagesCount.textContent =
            pendingNewMessageCount
            +
            (
                pendingNewMessageCount
                === 1
                    ? " new message"
                    : " new messages"
            );

    } else {

        newMessagesNotice.classList.remove(
            "show"
        );
    }
}


function userReturnedToQuickTalk() {

    tabUnreadCount =
        0;


    if (
        isNearMessageBottom()
    ) {

        pendingNewMessageCount =
            0;
    }


    updateUnreadMessageUI();
}


document.addEventListener(
    "visibilitychange",
    function () {

        if (
            !document.hidden
        ) {

            userReturnedToQuickTalk();
        }
    }
);


window.addEventListener(
    "focus",
    userReturnedToQuickTalk
);


if (
    messagesContainer
) {

    messagesContainer.addEventListener(
        "scroll",
        function () {

            if (
                !document.hidden
                &&
                isNearMessageBottom()
            ) {

                pendingNewMessageCount =
                    0;


                updateUnreadMessageUI();
            }
        }
    );
}


function jumpToNewestMessages() {

    scrollToBottom();


    pendingNewMessageCount =
        0;


    tabUnreadCount =
        0;


    updateUnreadMessageUI();


    messageInput.focus();
}


// ======================================================
// LEAVE
// ======================================================

function leaveRoom() {

    leavingRoom =
        true;


    sendTypingState(
        false
    );


    clearTypingState();


    clearReconnectTimer();


    closeReactionPicker();


    closeMobileUsers();


    closeMessageSearch();


    cancelDeleteMessage();


    cancelReply();


    if (
        socket
        &&
        (
            socket.readyState
            === WebSocket.OPEN
            ||
            socket.readyState
            === WebSocket.CONNECTING
        )
    ) {

        socket.close();
    }


    /*
     * Intentionally keep:
     *
     * quicktalkClientId
     * ownership token
     * reaction state
     *
     * They are temporary browser-side state.
     */

    sessionStorage.removeItem(
        "quicktalkName"
    );


    window.location.href =
        "/";
}


// ======================================================
// INTRO
// ======================================================

function hideMessagesIntro() {

    const intro =
        document.getElementById(
            "messagesIntro"
        );


    if (intro) {

        intro.remove();
    }
}


// ======================================================
// SCROLL
// ======================================================

function scrollToBottom() {

    if (!messagesContainer) {

        return;
    }


    messagesContainer.scrollTo(
        {
            top:
            messagesContainer.scrollHeight,

            behavior:
                "smooth"
        }
    );
}


// ======================================================
// PAGE CLOSE
// ======================================================

window.addEventListener(
    "beforeunload",
    function () {

        leavingRoom =
            true;


        sendTypingState(
            false
        );


        clearReconnectTimer();


        if (
            socket
            &&
            socket.readyState
            === WebSocket.OPEN
        ) {

            socket.close();
        }
    }
);