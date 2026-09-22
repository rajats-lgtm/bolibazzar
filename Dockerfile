# Web app + API. Multi-stage so the runtime image carries no build toolchain.
# Debian slim rather than Alpine: the Alpine package CDN is unreachable from
# some corporate networks, and slim needs no extra packages here.
# syntax=docker/dockerfile:1

FROM node:20-slim AS deps
WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --network-timeout 600000

FROM node:20-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# NEXT_PUBLIC_* values are inlined at build time, so they must be present here.
ARG NEXT_PUBLIC_BASE_URL
ARG NEXT_PUBLIC_RAZORPAY_KEY_ID
ENV NEXT_PUBLIC_BASE_URL=$NEXT_PUBLIC_BASE_URL
ENV NEXT_PUBLIC_RAZORPAY_KEY_ID=$NEXT_PUBLIC_RAZORPAY_KEY_ID

# No database or secrets needed at build time: the Mongo client connects
# lazily on first request, and sessions are signed at runtime.
ENV NEXT_TELEMETRY_DISABLED=1
RUN yarn build

FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0

# `output: 'standalone'` emits a minimal server with only the deps it needs.
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/public ./public

# Seed script, so the UAT database can be populated from inside the container.
COPY --from=builder --chown=node:node /app/scripts ./scripts
COPY --from=builder --chown=node:node /app/node_modules/mongodb ./node_modules/mongodb
COPY --from=builder --chown=node:node /app/node_modules/bson ./node_modules/bson

USER node
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=5s --start-period=40s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server.js"]
