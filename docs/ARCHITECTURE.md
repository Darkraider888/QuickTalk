# QuickTalk v1.0 Architecture

## Overview

QuickTalk is a small room-based chat system. The browser uses REST for stored history and WebSocket for live communication. Spring Boot validates events, applies ownership and rate-limit rules, and persists messages in MongoDB.

## Request flow

```text
                    +---------------------+
                    |       Browser       |
                    +----------+----------+
                               |
               +---------------+---------------+
               |                               |
               v                               v
 GET /api/messages/{room}                WebSocket /ws
       REST history                       live events
               |                               |
               +---------------+---------------+
                               v
                    +---------------------+
                    |     Spring Boot     |
                    +----------+----------+
                               |
                 validation / ownership /
                    rate limiting
                               |
                               v
                    +---------------------+
                    |     ChatService     |
                    +----------+----------+
                               |
                               v
                    +---------------------+
                    |       MongoDB       |
                    +---------------------+
```

## Backend components

| Component | Responsibility |
|---|---|
| `RoomController` | Validates room URLs and serves the room page |
| `ChatRestController` | Returns room message history |
| `ApiExceptionHandler` | Maps invalid API input to HTTP 400 |
| `ChatWebSocketHandler` | Connections, messages, presence, typing, delete, reactions, reconnect handling, rate limiting |
| `ChatService` | Core validation, ownership rules, reply rules, delete/reaction operations |
| `ChatMessageRepository` | MongoDB persistence and history query |
| `ChatMessage` | Stored message model and reaction/ownership state |
| `ChatValidator` | Room, name, and message validation |
| `OwnershipTokenUtil` | Ownership token validation and SHA-256 hashing |
| `SessionRateLimiter` | Sliding-window event limits per WebSocket session |
| `MongoIndexConfig` | Verifies the 24-hour TTL index |
| `SecurityHeadersConfig` | Adds browser security headers |

## Frontend state

`sessionStorage` holds the temporary name and a 32-hex-character client connection ID. The client ID helps the server recognize a reconnect from the same browser tab; it is not authorization.

`localStorage` holds the temporary message ownership token and local reaction-selection state. The ownership token is 64 hexadecimal characters generated with `crypto.getRandomValues()`.

## Persistence model

Each stored message contains its room, sender, text, optional reply target, deleted state, creation time, ownership hash, and reaction-owner hashes. The frontend receives only safe public fields and reaction counts.

History is limited to the newest 100 room messages. The service reverses the newest-first repository result before it is displayed chronologically.

## Real-time events

Client-to-server events include `message`, `delete_message`, `reaction`, and `typing`.

Server-to-client events include `message`, `message_deleted`, `message_reactions`, private `reaction_state`, `typing`, `users`, `system`, `action_error`, and `error`.

## Deployment note

Presence and active room connections are stored in the application process. QuickTalk v1.0 should therefore use a single running application instance. Horizontal scaling would require shared presence/pub-sub infrastructure in a later version.
