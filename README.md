# Veyra

End-to-end encrypted chat: a React web app plus a small relay that stores only public keys and
sealed envelopes. The relay never sees message content or who sent a message.

Runs on **Cloudflare Workers** (static app + one Durable Object), or on Node for local development.

## Quick start

Requires Node.js 20.19+.

```bash
npm install
npm run dev        # relay on :8788, web app on http://localhost:5273
```

To test with two people, use a normal window and an incognito window and create two accounts.

| Command | Purpose |
| --- | --- |
| `npm run dev` | Relay + web app with hot reload |
| `npm test` | Crypto protocol and sign-in/backup tests |
| `npm run build` | Type-check everything and build `dist/` |
| `npm run db:reset` | Local only: stop the relay first, then wipe `server/data` and create a test account (`-- <handle> <password>`) |
| `npm run cf:dev` | Run the Cloudflare version locally |
| `npm run deploy` | Build and deploy to Cloudflare |

## Deploy

Pushing to `main` deploys automatically through Cloudflare Workers Builds
(build: `npm run build`, deploy: `npx wrangler deploy`). Setup, the `ADMIN_TOKEN` secret and
database reset are covered in [docs/DEPLOY.md](docs/DEPLOY.md).

## Security

- Keys are generated on the device (Ed25519 + X25519 identity, signed prekey, one-time prekeys); only public halves are uploaded.
- **X3DH** starts a conversation, the **Double Ratchet** gives every message its own key (forward secrecy, post-compromise recovery).
- **Sealed sender**: the relay sees only the recipient and an opaque blob. Groups are encrypted per member.
- **Safety numbers** let two people check that the relay did not swap keys.
- Sign-in: the password is stretched (PBKDF2-SHA-256, 310k rounds) and split into a vault key that never leaves the device and a login key the server stores only as a hash. The server keeps an encrypted backup it cannot open.
- Primitives come from the audited [`@noble`](https://paulmillr.com/noble/) libraries; this project itself is not audited.

Step-by-step explanation (Mongolian): [docs/HOW-IT-WORKS.md](docs/HOW-IT-WORKS.md)

## Features

Direct and group chats, files (≤ 0.5 MB) and voice messages, replies and reactions, disappearing
messages, read receipts and typing indicators, contact verification, recovery code, light/dark
themes and appearance settings.

## Layout

```
shared/       code used by app and relay: config, e2ee (crypto), protocol (wire types), encoding
server/       relay.ts (rules for both runtimes), index.ts (Node server), store.ts (JSON file store)
cloudflare/   worker.ts (Worker + Durable Object with SQLite)
src/
  net/        connection (WebSocket, signed login), engine (encrypt, decrypt, deliver)
  state/      chat reducer, initial state, preferences
  lib/        vault, account, storage, voice recorder, helpers
  components/ ui, layout, chat, panel, dialogs, auth
  i18n/       all UI strings
  styles/     design tokens and component styles
public/       static files and security headers (_headers)
scripts/      dev runner, local database reset
tests/        protocol and account tests
```
