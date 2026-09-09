# QuickTalk v1.0 Testing

## Automated tests

Run from the project root.

PowerShell:

```powershell
.\mvnw.cmd test
```

macOS/Linux:

```bash
./mvnw test
```

The release source includes tests for application startup, input validation, rate limiting, message ownership, reaction toggling, and deleted-message cleanup. The application-context test disables MongoDB index creation and does not need real Atlas credentials.

## Manual regression checklist

Use two browser sessions, for example one named `Mehedi` and another named `Rahim`.

| Check | Expected result |
|---|---|
| Landing page opens | Normal layout appears |
| Create/join room | Room opens with chosen name |
| Share room URL | Link can be copied and opened |
| Second user joins | Online count updates |
| Real-time message | Other browser receives it immediately |
| Typing indicator | Appears and clears correctly |
| Reply | Reply reference points to the original message |
| Reaction | Emoji count updates for everyone |
| Reaction toggle | Same browser can remove its own reaction |
| Two-user reaction | Count reaches 2, then returns to 1 when one toggles off |
| Delete own message | Message becomes deleted for everyone |
| Delete other user's message | Server rejects the action |
| Search | Loaded messages can be found |
| Unread/new message UI | Appears when the user is away from the newest messages |
| Refresh/reconnect | Client reconnects and resynchronizes stored messages |
| Duplicate username | Different active client using the same name is rejected |
| Invalid room URL | Invalid room is not opened |
| Invalid REST room | API returns HTTP 400 |
| Message/reaction flooding | Rate-limit warning is returned |
| Mobile layout | User drawer, chat, share, and leave controls remain usable |
| MongoDB | Messages are saved in `quicktalk.messages` |
| TTL | `message_ttl` exists on `createdAt` with 24-hour expiry |
