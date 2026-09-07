# Private admin portal

This app is intentionally separate from the customer desktop, buyer, and supplier experiences. The customer app does not link to or expose the admin portal.

## Required environment

Set these variables on the backend and admin deployment:

- `ADMIN_EMAILS`: comma-separated CEO allowlist, with no other accounts
- `ADMIN_ACCESS_KEY`: long random secret shared only with the CEO
- `ADMIN_API_ORIGIN`: backend origin, for example `https://api.bolibazzar.in`

The admin app proxies `/api/*` to `ADMIN_API_ORIGIN`; it does not own a second database connection.

## Security behavior

- Login requires both an allowlisted CEO email and `ADMIN_ACCESS_KEY`.
- The backend issues an eight-hour, `httpOnly`, `sameSite=strict` signed session cookie.
- Admin overview and audit endpoints reject unauthenticated requests.
- Login success, failed login, logout, overview access, and audit access are written to `admin_audit`.
- Deploy this app only on a private admin subdomain or behind an additional VPN/identity-provider layer.
