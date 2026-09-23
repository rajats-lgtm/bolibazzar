# BoliBazzar — production deployment

Everything runs in Docker: database, API, admin console, marketing site, TLS
termination and nightly backups. One command deploys the lot.

```bash
cp .env.prod.example .env.prod     # fill in EVERY value
./scripts/prod.sh preflight        # refuses to proceed on a bad config
./scripts/prod.sh up
```

## The stack

| Container | Role | Exposed |
|---|---|---|
| `caddy` | TLS termination, reverse proxy, automatic Let's Encrypt | **80, 443 only** |
| `api` | Customer app + API | internal |
| `admin` | CEO console (proxies to `api`) | internal |
| `landing` | Marketing site | internal |
| `mongo` | Database, authentication enabled | internal |
| `backup` | Nightly `mongodump`, 14-day retention | internal |

Only Caddy publishes ports. MongoDB is reachable **only** from the app
containers — it is never exposed to the host or the internet.

## Before you deploy

### 1. DNS

Point all three names at the server's public IP before starting, or Caddy
cannot obtain certificates:

```
app.bolibazzar.in      A    <server-ip>
bolibazzar.in          A    <server-ip>
admin.bolibazzar.in    A    <server-ip>
```

### 2. Secrets

```bash
openssl rand -hex 32    # run once per secret
```

Generate fresh values for `SESSION_SECRET`, `ADMIN_ACCESS_KEY`,
`MONGO_ROOT_PASSWORD` and `MONGO_APP_PASSWORD`. Never reuse UAT values.

### 3. Email — this one is not optional

Login codes are delivered by email. **Without a working SMTP transport, no real
user can sign in**: the login endpoint returns `503` rather than pretending to
have sent a code. Set `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS` and `MAIL_FROM`.

Any transactional provider works (SendGrid, SES, Postmark, Resend). Verify your
sending domain with SPF and DKIM, or codes will land in spam.

`GET /api/health` reports `email_live`, so you can confirm it is configured.

### 4. Payments

Use **live** Razorpay keys. Test-mode settlement is impossible when
`APP_ENV=production` — the code path is unreachable, whatever the env says.

## What pre-flight refuses to deploy

`./scripts/prod.sh preflight` fails, rather than warns, on:

- any required variable left blank
- a secret shorter than 24 characters
- `RAZORPAY_KEY_ID` that is still a `rzp_test_` key
- `DEMO_BIDDERS=true`, which would let seeded demo accounts bid against real buyers

`up` and `deploy` run it automatically first.

## Day-to-day

| Command | What it does |
|---|---|
| `./scripts/prod.sh status` | Health, URLs, CPU and memory per container |
| `./scripts/prod.sh logs` | Follow logs from every service |
| `./scripts/prod.sh deploy` | Rebuild and roll out; Caddy keeps serving throughout |
| `./scripts/prod.sh backup` | Take a backup immediately |
| `./scripts/prod.sh restore <archive>` | Restore (asks you to type the database name) |
| `./scripts/prod.sh down` | Stop everything; volumes are preserved |

## Backups

The `backup` container runs `mongodump` daily into the `backups` volume and
prunes archives older than `BACKUP_RETENTION_DAYS`.

**Copy them off the host.** A backup on the same machine does not survive losing
that machine:

```bash
docker run --rm -v bolibazzar_backups:/b -v "$PWD:/out" alpine \
  sh -c 'cp /b/*.archive.gz /out/'
# then sync to S3, GCS or equivalent
```

Rehearse a restore before you need one.

## Security notes

- **Admin console.** The access key is the only gate beyond the email
  allowlist. Put it behind an IP allowlist, mTLS or an identity proxy in
  `deploy/Caddyfile` before exposing it publicly. It already sends
  `X-Robots-Tag: noindex` and `X-Frame-Options: DENY`.
- **Sessions** are httpOnly cookies, signed with HMAC and carrying their expiry
  inside the signature, so a copied cookie expires server-side too. `Secure` is
  set automatically because `NEXT_PUBLIC_BASE_URL` is `https://`.
- **MongoDB** runs with `--auth`, and the application connects as a
  `readWrite`-only user, not root. Root is used solely for backups.
- **Rotating `SESSION_SECRET`** signs everyone out. That is the kill switch if
  you suspect session compromise.
- **Never build or deploy from a machine you do not trust.** Build on CI or a
  clean host.

## Scaling later

The stateless services (`api`, `admin`, `landing`) can each run multiple
replicas behind Caddy without code changes — sessions are stateless tokens, not
server-side state. The auction advances on read, so there is no background
worker to coordinate. MongoDB is the one stateful piece; move it to a managed
cluster (Atlas) and point `MONGO_URL` at it when you outgrow a single node.

## Known gaps before real users

1. **Email must be configured.** Without it nobody can log in. This is the
   single hardest blocker.
2. **OTP rate limiting is per-destination** (5 per 15 minutes). There is no
   global or per-IP limit, so consider a WAF or Caddy `rate_limit` in front.
3. **No error tracking or uptime monitoring** is wired up. Add Sentry and an
   external health check against `/api/health` before launch.
4. **Demo suppliers ship in the seed data.** Do not run `scripts/seed.mjs`
   against production, and keep `DEMO_BIDDERS=false`.
5. **Delivery tracking auto-advances** on a timer for orders nobody is driving.
   Real suppliers must move their own orders through the stages, or buyers will
   see a progress bar that does not reflect reality.
