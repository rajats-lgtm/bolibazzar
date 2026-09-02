# BoliBazzar Mobile (Expo)

React Native / Expo mobile app for BoliBazzar — India's AI reverse marketplace.

## Quick start (on your local Mac / PC)

```bash
cd boli-mobile-expo
npm install       # or: yarn install
npx expo start    # scan QR with Expo Go app on iPhone / Android
```

The app talks to the same backend as the web version (`app.json → extra.apiBaseUrl`).

## Build store binaries

```bash
npm install -g eas-cli
eas login
eas build:configure
eas build --platform ios      # requires Apple Developer account
eas build --platform android  # produces .aab for Play Store
```

## Screens included

- **Splash** — brand splash with animated logo
- **Home** — AI search box (voice + text), example prompts, language chips
- **Requirement preview** — structured extraction with TTS playback
- **Offers** — live bidding countdown, AI-ranked cards, chat & pay CTAs
- **My Requests** — buyer history + tier + wallet balance
- **Supplier Dashboard** — incoming requests + submit offer
- **Payments** — Razorpay Checkout via WebView / native SDK

All UI shares the BoliBazzar brand: indigo → magenta → orange gradient, the B-cart logo, and the tagline *"You Ask. Sellers Compete. You Win."*

## Structure

```
/app          expo-router screens
  _layout.tsx    root layout + theme
  index.tsx      home (buyer AI search)
  offers.tsx     live bidding + offers
  supplier.tsx   supplier dashboard
  profile.tsx    profile + wallet + tier
/lib
  api.ts         BoliBazzar API client
  theme.ts       colour tokens
/components
  Logo.tsx       animated B-cart SVG
  OfferCard.tsx
  Countdown.tsx
```
