# EAS Build & Store Submission Guide

This guide walks you from your local machine to actual App Store + Play Store binaries.

## 1. Install EAS CLI

```bash
npm install -g eas-cli
eas login          # sign in with your Expo account
```

## 2. First-time project link

```bash
cd boli-mobile-expo
eas init           # links this local project to an EAS project id
```

## 3. iOS setup (needs Apple Developer $99/yr)

```bash
eas credentials    # choose iOS → set up distribution certificate + push key
```
- Sign in with your Apple ID when prompted.
- Update `eas.json → submit → production → ios` with:
  - `appleId` — the email on your Apple Developer account
  - `ascAppId` — the App Store Connect App ID (create the app first at appstoreconnect.apple.com)
  - `appleTeamId` — your 10-char team ID

## 4. Android setup (needs Play Console $25 one-time)

1. Create the app on play.google.com/console → Internal testing track.
2. In Play Console → Setup → API access → create a service account with **Release manager** role.
3. Download the JSON key → save as `play-service-account.json` inside `boli-mobile-expo/`.
4. Add it to `.gitignore` (never commit).

## 5. Build production binaries

```bash
eas build --platform ios --profile production          # produces .ipa
eas build --platform android --profile production      # produces .aab
```

Both run on Expo's servers — you don't need a Mac for the iOS build.

## 6. Submit to the stores

```bash
eas submit --platform ios --latest
eas submit --platform android --latest
```

## 7. Push notifications setup (see PUSH.md)

EAS automatically registers a **Push Notification key** during `eas credentials` for iOS. Android uses FCM — add your `google-services.json` to the project root when prompted.

---

## Troubleshooting

| Error | Fix |
|-------|-----|
| `Missing bundle identifier` | Check `app.json → ios.bundleIdentifier = in.bolibazzar.app` |
| `Provisioning profile expired` | Run `eas credentials → iOS → refresh` |
| `Version code already used` | `eas.json` has `autoIncrement: true` — just re-run build |
| Play Console rejects `.aab` | Verify signing key with `eas credentials → Android → keystore` |
