# Running BoliBazzar locally

Everything runs on your machine with no external accounts. Payments, WhatsApp
and push all degrade safely when unconfigured.

## 0. Prerequisites

Node 20 is required (Next 15 rejects Node 18.17). It is installed keg-only, so
your system `node` is untouched. Put it on your PATH for each terminal:

```bash
export PATH="/opt/homebrew/opt/node@20/bin:$PATH"
node -v   # v20.20.2
```

To make that permanent, add the `export` line to `~/.zshrc`.

## 1. Start the database

```bash
cd ~/Desktop/BoliBazzar/bolibazzar
yarn db          # runs scripts/dev-db.mjs
```

This boots a real `mongod` on `127.0.0.1:27017`, storing data in `.devdata/mongo`
so it survives restarts. **Leave this terminal running.**

To use a real cluster instead, set `MONGO_URL` in `.env` and skip this step.

## 2. Seed the database (first run only)

```bash
yarn seed
```

Creates indexes, ten demo supplier accounts, and two test accounts:

| Role     | Email               |
|----------|---------------------|
| Buyer    | `buyer@test.in`     |
| Supplier | `supplier@test.in`  |
| Admin    | see `ADMIN_EMAILS`  |

Sign-in is by one-time passcode. With `OTP_DEV_MODE=true` the code is returned
in the API response and shown in the sign-in dialog, so no email provider is
needed.

## 3. Start the apps

Each in its own terminal:

```bash
yarn dev        # :3000  main app + API
yarn admin      # :3001  CEO admin console
yarn landing    # :3002  public marketing site
```

| URL | What it is |
|---|---|
| http://localhost:3000/ | Landing page |
| http://localhost:3000/?app | The buyer product (PWA) |
| http://localhost:3000/?app&view=supplier | Supplier console |
| http://localhost:3000/?store=supplier@test.in | Public storefront |
| http://localhost:3001 | Admin console (email + `ADMIN_ACCESS_KEY`) |
| http://localhost:3002 | Marketing site |

## 4. Mobile apps

```bash
cd apps/buyer-mobile && npm install && npx expo start
cd apps/supplier-mobile && npm install && npx expo start
```

Scan the QR code with Expo Go. `.env` in each app already points at your Mac's
LAN IP — update `EXPO_PUBLIC_API_BASE_URL` if your IP changes.

## 5. Verify it works

```bash
yarn dev                      # in one terminal
node scripts/smoke.mjs        # 163 end-to-end API assertions
node scripts/ui-check.mjs     # drives the buyer and supplier UI in Chrome

yarn admin                    # the admin console, in another terminal
node scripts/admin-check.mjs http://localhost:3002

yarn landing                  # the marketing site, in another terminal
node scripts/landing-check.mjs http://localhost:3001
```

`smoke.mjs` reads `ADMIN_EMAILS` and `ADMIN_ACCESS_KEY` from the environment
and skips the admin sections when they are unset, so
`set -a && . ./.env && set +a` first to run the whole thing. The email
assertions need a local mail sink and skip without one.

`smoke.mjs` walks the whole journey — OTP login, AI extraction, the live
auction, payment, order, delivery, chat, reviews — and asserts every
authorization rule holds.

`landing-check.mjs` covers the public marketing site, which deploys on its
own: that the walkthrough animation really advances through its stages, and
that "Create an account" and "Register your business" link into the matching
side of the app's sign-up fork.

`admin-check.mjs` covers the admin console, which is a separate app that
proxies to the API — a broken proxy or a tab that throws shows up nowhere
else. It opens every tab, checks the login gate refuses a wrong key, and
checks that signing out really ends the session.

## Environment flags

| Variable | Purpose |
|---|---|
| `SESSION_SECRET` | Signs buyer/supplier sessions. Rotating it logs everyone out. |
| `OTP_DEV_MODE` | `true` returns login codes in the API response. **Set `false` in production.** |
| `PAYMENTS_TEST_MODE` | `true` settles payments with no gateway signature. Ignored when `NODE_ENV=production`. |
| `DEMO_BIDDERS` | `true` lets seeded demo suppliers bid so the auction works with no live humans. Set `false` for a pure human marketplace. |
| `AUCTION_WINDOW_SECONDS` | Length of the live bidding window (default 120). |
| `ADMIN_EMAILS` / `ADMIN_ACCESS_KEY` | Admin allowlist and shared secret. Both required to sign in. |

## Before going to production

1. `OTP_DEV_MODE=false` and wire a real email/SMS sender in `lib/notify.js`
   (`sendOtp` currently logs email codes to the console).
2. `PAYMENTS_TEST_MODE=false` — it is already ignored when `NODE_ENV=production`.
3. `DEMO_BIDDERS=false` once you have real suppliers.
4. Set `CORS_ORIGINS` to your real domains (never `*` — sessions are cookie-based).
5. Rotate `SESSION_SECRET` and `ADMIN_ACCESS_KEY`.

## Troubleshooting

**Dev server hangs at "Starting..."** — usually low disk or stale processes.
Clear them with:

```bash
pkill -9 -f next-server; pkill -9 -f "next dev"; rm -rf .next
```

**Port already in use** — `kill $(lsof -ti tcp:3000)`.

**`.devdata` rebuild loops** — the webpack watcher already ignores it
(`next.config.js`). If you move the Mongo data directory, ignore the new path too.
