# BoliBazzar — UAT environment

A single command brings up the whole product: MongoDB, the customer app + API,
the admin console and the marketing site, seeded with test data and verified
healthy.

## Start it

```bash
cp .env.uat.example .env.uat      # then fill in the secrets (see below)
./scripts/uat.sh up
```

That builds the images, starts the stack, seeds the database and waits until
every service reports healthy. First run takes roughly ten minutes; afterwards
it is under a minute.

| Command | What it does |
|---|---|
| `./scripts/uat.sh up` | Build, start, seed, verify |
| `./scripts/uat.sh status` | Show URLs, logins and container health |
| `./scripts/uat.sh logs` | Follow logs from every service |
| `./scripts/uat.sh down` | Stop, keeping the database |
| `./scripts/uat.sh reset` | Stop and wipe the database |

## What testers get

| | URL |
|---|---|
| Customer app | `$PUBLIC_BASE_URL/?app` |
| Marketing site | port `3002` |
| Admin console | port `3001` |
| **Mail inbox** | port `8025` — every email the app sends |
| API health | `$PUBLIC_BASE_URL/api/health` |

### Test accounts

| Role | Login | Password |
|---|---|---|
| Buyer | `buyer@test.in` | 6-digit code shown on screen |
| Supplier | `supplier@test.in` | 6-digit code shown on screen |
| Admin | value of `ADMIN_EMAILS` | `ADMIN_ACCESS_KEY` from `.env.uat` |

Any other email works too — a new account is created on first sign-in. Because
`OTP_DEV_MODE=true`, the login code appears in the sign-in dialog, so no SMS or
email provider is required.

The stack also runs **Mailpit**, a local mail sink, so the real email code path
is exercised rather than stubbed. Every message the app sends — including the
branded login-code email — lands in the inbox at port `8025`. That means you can
test and review production email locally, with no provider and no domain. To
rehearse live delivery, point `SMTP_*` in `.env.uat` at a real server instead.

## What to test

1. **Post a requirement.** Type it in plain English or Hindi, e.g.
   *"iPhone 17 Pro Max 256GB Black under 1.2 lakh in Mumbai"*. The AI extracts
   the product, budget and location.
2. **Watch the live auction.** Offers arrive over a 120-second window and
   suppliers undercut each other. Prices genuinely move while you watch.
3. **Compare offers.** Each carries an AI value score and a plain-English
   reason. Exactly one is flagged as the AI Pick.
4. **Chat with a supplier**, then accept and pay. Payment settles without a
   real gateway.
5. **Track the order** from confirmed through to delivered, and leave a review.
6. **Sign in as a supplier** (separate session) to see live requests, bid,
   set auto-bid rules and move orders through fulfilment.
7. **Sign in to the admin console** to see every customer, supplier, request,
   offer, payment and order, plus an audit trail of admin actions.

## Configuration

Everything lives in `.env.uat`. The values that matter most:

| Variable | Notes |
|---|---|
| `PUBLIC_BASE_URL` | Where testers reach the app. Use the host's LAN IP or the UAT hostname — **not** `localhost`, or phones and other machines cannot connect. |
| `CORS_ORIGINS` | Sessions are cookie-based, so this cannot be `*`. List the app, admin and landing origins. |
| `SESSION_SECRET` | Signs sessions. Rotating it logs everyone out. |
| `ADMIN_EMAILS` / `ADMIN_ACCESS_KEY` | Both are required to reach the admin console. |
| `OTP_DEV_MODE` | Returns login codes in the API response. |
| `PAYMENTS_TEST_MODE` | Settles payments with no gateway. |
| `DEMO_BIDDERS` | Seeded suppliers bid automatically. Set `false` to test a pure human marketplace. |
| `AUCTION_WINDOW_SECONDS` | Length of the bidding window. |

### `APP_ENV` and why it exists

A UAT runs a *production build* but is not a *production environment*. Testers
still need to sign in without an SMS gateway and pay without a real card.

`APP_ENV=uat` states that intent. `OTP_DEV_MODE` and `PAYMENTS_TEST_MODE` are
honoured only when `APP_ENV` is not `production`, and when `APP_ENV` is unset it
falls back to `NODE_ENV` — so the safe answer is always the default. Setting
`APP_ENV=production` disables both, whatever else is configured.

`/api/health` reports the active environment, so a tester can always see which
mode they are in.

## Mobile apps

The apps are Expo SDK 57 and run in Expo Go from the App Store or Play Store.

```bash
cd apps/buyer-mobile   && npx expo start    # buyer
cd apps/supplier-mobile && npx expo start --port 8082
```

Point `EXPO_PUBLIC_API_BASE_URL` in each app's `.env` at the UAT API
(`$PUBLIC_BASE_URL/api`). The phone must be able to reach that address, so a
LAN IP or a public hostname — not `localhost`.

## Verifying a deployment

```bash
node scripts/smoke.mjs  http://<uat-host>:3000   # 76 end-to-end API assertions
node scripts/ui-check.mjs http://<uat-host>:3000 # drives the real UI in Chrome
```

The smoke test walks the whole journey — OTP login, AI extraction, the live
auction, payment, orders, delivery, chat, reviews — and asserts every
authorization rule holds. The UI check drives the same journey in a real
browser and saves screenshots to `.devdata/screenshots`.

## Before promoting to production

1. `APP_ENV=production` — this alone disables dev logins and test payments.
2. Serve over HTTPS. Session cookies are marked `Secure` automatically when
   `PUBLIC_BASE_URL` uses `https://`.
3. Set `CORS_ORIGINS` to the real domains.
4. Generate fresh `SESSION_SECRET` and `ADMIN_ACCESS_KEY`.
5. `DEMO_BIDDERS=false` once real suppliers are onboarded.
6. Wire a real OTP sender in `lib/notify.js` (`sendOtp` currently logs email
   codes to the console).
7. Use managed MongoDB rather than the bundled container, and take backups.

## Notes on this setup

- **Images are built with `--network=host`.** On some corporate networks
  Docker's bridge network cannot reach the package registries, and Compose's
  `build.network` key is not honoured by BuildKit. `scripts/uat.sh` passes the
  flag explicitly.
- **MongoDB is not published to the host.** Only the app containers can reach
  it. Add a `ports:` entry to `docker-compose.uat.yml` if you need direct access.
- **The API connects to MongoDB lazily**, so the image builds without a
  database and a brief database outage does not permanently wedge the server.
