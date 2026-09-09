# QuickTalk v1.0 Security Notes

QuickTalk v1.0 is a temporary chat application, not an identity or authentication platform. Its security model is intentionally limited to the needs of temporary room chat.

## Implemented protections

- MongoDB credentials are read from `MONGODB_URI` and are not stored in source configuration.
- Room names, usernames, and messages are validated on the server.
- Control and invisible format characters are rejected by the current validator.
- Room names are restricted to letters, numbers, `_`, and `-` with a 40-character maximum.
- Usernames are limited to 30 characters and messages to 500 characters.
- Browser ownership tokens are random and hashed with SHA-256 before being stored in MongoDB.
- Ownership hashes and reaction-owner hashes are not intentionally exposed in normal client JSON.
- Message deletion checks the ownership hash on the server.
- Emoji reactions are limited to the server-approved set.
- Incoming WebSocket text payloads are limited to 8 KiB.
- Message, reaction, delete, typing, and overall WebSocket event rate limits are applied.
- Duplicate active usernames in the same room are rejected.
- Security headers block framing, MIME sniffing, unnecessary browser permissions, and restrict content sources.
- Invalid REST input is returned as HTTP 400 instead of being treated as an internal error.
- User-provided chat content is rendered with `textContent` rather than inserted as HTML.

## Important limitations

The browser ownership token is not an account credential. A person using a different browser profile or cleared browser storage can receive a different temporary identity. The client connection ID is only for reconnect/presence continuity and must not be treated as authorization.

Messages are not end-to-end encrypted. Anyone with authorized database access can potentially read stored message content until it expires or is deleted.

Rate limiting is mainly session-oriented. It reduces accidental and basic abusive flooding but is not a complete distributed denial-of-service protection system.

Presence is in memory and designed for one application instance. A multi-instance deployment requires shared presence and event infrastructure.

The current Content Security Policy still allows inline JavaScript handlers because the room HTML contains `onclick` attributes. A later hardening pass can remove those handlers and then remove `'unsafe-inline'` from `script-src`.

MongoDB TTL cleanup is asynchronous. A document becomes eligible for expiration at 24 hours, but deletion can occur shortly afterward when MongoDB's TTL monitor runs.

## Secret handling

Never commit or share any of the following:

```text
.env
.idea/workspace.xml
real MongoDB connection strings
MongoDB usernames/passwords in screenshots
JVM crash logs
IDE run-configuration secrets
```

If a real database password is accidentally exposed, rotate the MongoDB database-user password and update `MONGODB_URI` immediately.
