# GitHub Actions Setup

## Required secrets (Settings → Secrets and variables → Actions)

### Web (Vercel)
- `VERCEL_TOKEN` — https://vercel.com/account/tokens
- `VERCEL_ORG_ID` — from `.vercel/project.json` after running `vercel link`
- `VERCEL_PROJECT_ID` — same file

### Mobile (EAS)
- `EXPO_TOKEN` — https://expo.dev/settings/access-tokens → Create token

## Manual mobile build

Actions → **Mobile EAS Build** → Run workflow → pick platform/profile/app.

## Automatic triggers

- **Web CI/CD**: every push to `main` under `app/` → build + deploy to Vercel
- **Mobile**: every push under `apps/*-mobile/**` → build both apps preview
- **Manual only**: production builds — use workflow_dispatch to avoid burning EAS credits
