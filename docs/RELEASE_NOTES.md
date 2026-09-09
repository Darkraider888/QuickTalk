# QuickTalk v1.0 Release Notes

**Release:** v1.0.0  
**Edition:** Core temporary real-time chat

## Included

QuickTalk v1.0 includes room creation/joining, shareable room links, real-time WebSocket chat, latest-100-message history, 24-hour MongoDB TTL expiration, online users, typing indicators, message search, unread/new-message indicators, replies, owner-only deletion, toggle reactions, reconnect/missed-message recovery, responsive desktop/mobile UI, server-side validation, security headers, WebSocket payload protection, event rate limiting, and automated tests.

## Storage and identity

There are no accounts and no cookies. `sessionStorage` is used for temporary name/connection state and `localStorage` is used for temporary message ownership and reaction UI state.

## Verification

The release source contains tests for application-context startup, validation, rate limiting, message ownership, reaction toggling, and deletion behavior. The project supplied for this release had a successful Maven test run before packaging. The release package also isolates the application-context test from real Atlas credentials by disabling MongoDB index creation in that test.

## Deliberately deferred

Editing, pinning, music, media/file sharing, voice features, advanced room controls, and other larger features are intentionally left for later versions so v1.0 remains focused on stable temporary messaging.
