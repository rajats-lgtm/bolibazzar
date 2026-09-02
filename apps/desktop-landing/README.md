# apps/desktop-landing

Public-facing marketing site with App Store + Play Store download buttons.

## Current implementation

Rendered at `/` on the combined web deploy (see root `app/page.js` → `AppLanding` component).

Contains:
- Hero with animated phone mockup
- "Download on the App Store" + "Get it on Google Play" CTAs
- Feature grid (voice, AI bidding, UPI, chat, tracking, cashback)
- Big footer CTA

## Split-out roadmap

When ready to run marketing site as a separate deploy (e.g. Vercel/Netlify) so the mobile-app URLs can point to a fast static landing:

1. `npx create-next-app@latest apps/desktop-landing`
2. Copy `app/page.js` → extract `AppLanding` + `Splash` + `BoliBazzarLogo`
3. Deploy on the primary domain (bolibazzar.in)
4. Update Info.plist + AndroidManifest to link back for deferred deep-linking
