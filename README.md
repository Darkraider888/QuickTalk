# QuickTalk

**QuickTalk v1.0** is a temporary real-time chat application built with Java, Spring Boot, WebSocket, MongoDB, and vanilla JavaScript. It is designed for fast room-based conversations without accounts, passwords, or cookies.

Built by **Darkraider888**.
### 🌐 Live Demo

**[Open QuickTalk](https://quicktalk-1adv.onrender.com/)**

> The free hosted instance may take a short time to wake up after being inactive.<br>
![Java](https://img.shields.io/badge/Java-25-orange)
![Spring Boot](https://img.shields.io/badge/Spring%20Boot-4.1.1-brightgreen)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-green)
![WebSocket](https://img.shields.io/badge/WebSocket-Real--Time-blue)
![Release](https://img.shields.io/badge/release-v1.0.0-black)

## What QuickTalk does

- Create or join a room using a shareable room URL.
- Join with a temporary display name; no account is required.
- Send and receive messages in real time with WebSocket.
- Load the latest room history with a REST API.
- Automatically expire messages after 24 hours with a MongoDB TTL index.
- Show online users and typing indicators.
- Reply to messages.
- Delete your own messages using a temporary ownership token.
- Add and toggle emoji reactions.
- Search loaded messages.
- Recover missed messages after reconnecting.
- Show unread/new-message indicators.
- Work on desktop and mobile layouts.
- Apply server-side validation, security headers, payload limits, and rate limiting.

## Tech stack

| Layer | Technology |
|---|---|
| Backend | Java 25, Spring Boot 4.1.1 |
| Real-time | Spring WebSocket |
| REST | Spring Web MVC |
| Database | MongoDB Atlas / Spring Data MongoDB |
| Frontend | HTML, CSS, vanilla JavaScript |
| Build | Maven Wrapper |
| Tests | JUnit / Spring Boot test support |

## Architecture

```text
Browser
   |
   |-- GET /api/messages/{room} ----> REST history
   |
   `-- /ws --------------------------> real-time events
                                          |
                                          v
                                     Spring Boot
                                          |
                         validation + rate limiting
                                          |
                                          v
                                      ChatService
                                          |
                                          v
                                       MongoDB
                                          |
                                          `-- 24-hour TTL
```

The REST endpoint is used for initial history and missed-message recovery. WebSocket is used for live messages, presence, typing, reactions, deletion, and other room events.

## Browser storage

QuickTalk does **not** use cookies.

| Storage | Purpose |
|---|---|
| `sessionStorage` | Temporary username and connection ID for the current browser tab |
| `localStorage` | Temporary ownership token and the browser's reaction UI state |

The ownership token is generated in the browser. The server stores only its SHA-256 hash for ownership checks.

## Requirements

- Java 25
- Internet access to MongoDB Atlas, or another compatible MongoDB deployment
- A valid `MONGODB_URI` environment variable

## Setup


## Main endpoints

| Type | Path | Purpose |
|---|---|---|
| Page | `/` | QuickTalk landing page |
| Page | `/room/{roomName}` | Room interface |
| REST | `GET /api/messages/{room}` | Latest room message history |
| WebSocket | `/ws?room=...&name=...&clientId=...` | Real-time room connection |

## Message lifetime

Messages have a MongoDB TTL index named `message_ttl` on `createdAt` with a 24-hour expiration. MongoDB TTL cleanup runs in the background, so physical removal can happen shortly after a message becomes eligible for expiration rather than at the exact millisecond of the 24-hour mark.

## Security and stability included in v1.0

- Server-side room, username, and message validation.
- Control/invisible-format character checks.
- Ownership tokens validated and hashed before storage.
- Message ownership hashes are not exposed through normal JSON.
- Reaction owner hashes stay server-side; clients receive public counts.
- Allowed emoji reactions are server-whitelisted.
- WebSocket text payload limit.
- Per-session event rate limiting, with reconnect continuity for the same active client session.
- Duplicate-name protection inside a room.
- HTTP security headers including CSP, frame blocking, MIME sniffing protection, referrer policy, and permissions policy.
- API bad-input handling with HTTP 400 responses.
- MongoDB credentials supplied through an environment variable.

See [`docs/SECURITY.md`](docs/SECURITY.md) for details and limitations.

## Project structure

```text
QuickTalk/
├── .mvn/
├── docs/
├── src/
│   ├── main/
│   │   ├── java/com/mehedi/quicktalk/
│   │   │   ├── config/
│   │   │   ├── controller/
│   │   │   ├── model/
│   │   │   ├── repository/
│   │   │   ├── service/
│   │   │   ├── util/
│   │   │   └── websocket/
│   │   └── resources/
│   │       ├── static/
│   │       └── application.properties
│   └── test/
├── .env.example
├── .gitattributes
├── .gitignore
├── pom.xml
├── mvnw
└── mvnw.cmd
```

## Known v1.0 limitations

QuickTalk intentionally has no account/login system. Browser ownership proves possession of a temporary token, not a real-world identity. Presence is stored in memory, so v1.0 should run as a single application instance unless presence is later moved to shared infrastructure. The UI loads the newest 100 messages per room. Messages are not end-to-end encrypted. Advanced features such as edit, pin, music, media sharing, and richer room controls are reserved for later versions.

## Release documentation

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
- [`docs/SECURITY.md`](docs/SECURITY.md)
- [`docs/RELEASE_NOTES.md`](docs/RELEASE_NOTES.md)
- [`docs/TESTING.md`](docs/TESTING.md)
- [`docs/RELEASE_AUDIT.md`](docs/RELEASE_AUDIT.md)

---

**QuickTalk v1.0 — Temporary Real-Time Chat**
