# BoliBazzar Monorepo

> **You Ask. Sellers Compete. You Win.**
> India's AI-powered reverse marketplace.

This monorepo contains everything to run BoliBazzar across web and mobile.

## 🗂 Structure

```
bolibazzar/
├── apps/
│   ├── buyer-mobile/         Expo iOS + Android app for BUYERS
│   ├── supplier-mobile/      Expo iOS + Android app for SUPPLIERS
│   ├── admin-web/            Next.js admin dashboard (desktop-only)
│   └── desktop-landing/      Public marketing site + store download buttons
├── backend/                  Next.js API (MongoDB + Razorpay + AI + Push)
├── docs/                     Store listings, EAS + Push guides
│   ├── store-assets/         App Store + Play Store copy, icon, screenshots brief
│   ├── EAS_BUILD.md          Step-by-step iOS/Android submit guide
│   └── PUSH.md               Push notifications setup
└── app/                      🚧 Combined dev-server (Next.js) that hosts admin + landing + PWA preview
```

> The `app/` folder is the currently running Next.js dev server (Vercel-ready).
> It hosts the public landing (`/`) and mobile PWA preview (`/?app`) in one
> deployment. The confidential CEO admin portal is a separate deployment under
> `apps/admin-web`; it is not linked from the customer experience.

## 🚀 Quick start

**Desktop / API (currently running):**
```bash
yarn install
yarn dev              # http://localhost:3000
```

**Buyer mobile:**
```bash
cd apps/buyer-mobile
npm install
npx expo start        # scan QR with Expo Go
```

**Supplier mobile:**
```bash
cd apps/supplier-mobile
npm install
npx expo start
```

## 🔑 Environment variables (`.env` at root)

```
MONGO_URL=mongodb://localhost:27017
DB_NAME=bolibazaar
EMERGENT_LLM_KEY=sk-emergent-...      # AI extraction
RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_KEY_SECRET=...
ADMIN_EMAILS=admin@bolibazzar.in       # comma-separated admin allowlist
ADMIN_ACCESS_KEY=...                   # server-only CEO access key
# Optional
TWILIO_ACCOUNT_SID=                    # WhatsApp alerts (blank = mock)
TWILIO_AUTH_TOKEN=
WHATSAPP_FROM=whatsapp:+14155238886
```

## 📱 Building the mobile apps

See [`docs/EAS_BUILD.md`](./docs/EAS_BUILD.md) for a step-by-step guide from `npx expo start` to App Store submission.

## 🔔 Push notifications

See [`docs/PUSH.md`](./docs/PUSH.md). Backend endpoints `/api/push/register` + `/api/push/notify` are already live.

## 🏪 Store listings

See [`docs/store-assets/LISTINGS.md`](./docs/store-assets/LISTINGS.md) for App Store + Play Store copy, keywords, icon and screenshot briefs.

## 🔐 Private admin portal

Run `apps/admin-web` separately on a private subdomain. Access requires both the
CEO email in `ADMIN_EMAILS` and the server-only `ADMIN_ACCESS_KEY`. Sessions are
httpOnly, expire after eight hours, and are recorded in the `admin_audit`
collection. Keep the allowlist limited to the CEO account and place the portal
behind a VPN or identity-provider policy in production.

## 🛠 Tech

- **Web**: Next.js 15, React 19, Tailwind, shadcn/ui, Framer Motion
- **Mobile**: Expo 52, React Native 0.76, expo-router, react-native-svg
- **Backend**: Next.js API routes, MongoDB, Razorpay, OpenAI (via Emergent LLM proxy)
- **AI**: GPT-4o-mini for multilingual requirement extraction (English, Hindi, Tamil, Marathi, Bengali)
- **Payments**: Razorpay Checkout (Standard) with UPI / cards / netbanking / wallets
- **Push**: Expo Push → APNs (iOS) + FCM (Android)

## ⚖ License

Proprietary — © 2025 BoliBazzar Technologies. Made for Bharat.
