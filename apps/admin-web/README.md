# apps/admin-web

Production Next.js admin dashboard for BoliBazzar operations team.

## Current implementation

The admin dashboard is live at `/?admin` on the combined web deploy (see root `app/page.js` → `AdminDashboard` component).

## Split-out roadmap

When ready to run admin as a separate deploy:

1. Copy `app/page.js` → extract `AdminDashboard`, `Navbar` (admin variant) into this folder
2. Copy `app/api/[[...path]]/route.js` → same for backend (or keep single API)
3. Deploy to a private subdomain (e.g. admin.bolibazzar.in) with the `ADMIN_EMAILS` env var

## Access

Gate: `ADMIN_EMAILS` env var (comma-separated). Any email in the list unlocks the dashboard after login.

Current features:
- Platform stats (buyer requests, approved suppliers, closed deals, buyer intent GMV)
- Supplier table with GST verification
- Request table with status
- Latest activity feed
