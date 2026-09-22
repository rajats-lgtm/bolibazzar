# syntax=docker/dockerfile:1
FROM node:20-slim AS deps
WORKDIR /app
COPY apps/admin-web/package.json apps/admin-web/package-lock.json ./
RUN npm ci --no-audit --no-fund

FROM node:20-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY apps/admin-web ./
# Next resolves rewrites at BUILD time and bakes them into routes-manifest.json,
# so the API origin must be known here, not only at runtime.
ARG ADMIN_API_ORIGIN=http://localhost:3000
ENV ADMIN_API_ORIGIN=$ADMIN_API_ORIGIN
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3001 HOSTNAME=0.0.0.0
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
USER node
EXPOSE 3001
HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:3001/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server.js"]
