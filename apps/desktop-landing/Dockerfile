# syntax=docker/dockerfile:1
FROM node:20-slim AS deps
WORKDIR /app
COPY apps/desktop-landing/package.json apps/desktop-landing/package-lock.json ./
RUN npm ci --no-audit --no-fund

FROM node:20-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY apps/desktop-landing ./
ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_APP_STORE_URL
ARG NEXT_PUBLIC_PLAY_STORE_URL
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_APP_STORE_URL=$NEXT_PUBLIC_APP_STORE_URL
ENV NEXT_PUBLIC_PLAY_STORE_URL=$NEXT_PUBLIC_PLAY_STORE_URL
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3002 HOSTNAME=0.0.0.0
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
USER node
EXPOSE 3002
HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:3002/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server.js"]
