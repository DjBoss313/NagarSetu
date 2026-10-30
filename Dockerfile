# Multi-stage Dockerfile for NagarSetu
# Base image includes build tools required to compile better-sqlite3 native bindings

FROM node:22-slim AS base
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    gcc \
    libc6-dev \
    && rm -rf /var/lib/apt/lists/*

# Stage 1: Dependencies installation
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

# Stage 2: Application Build
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Stage 3: Minimal Production Runner
FROM node:22-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=8080
ENV HOSTNAME="0.0.0.0"

# Copy built standalone server and static assets
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Copy compiled better-sqlite3 native module and addon api
COPY --from=builder /app/node_modules/better-sqlite3 ./node_modules/better-sqlite3
COPY --from=builder /app/node_modules/node-addon-api ./node_modules/node-addon-api

# Copy seed datasets for auto-seed on empty DB
COPY --from=builder /app/data/seed_reports.json ./data/seed_reports.json
COPY --from=builder /app/data/sensitive_places.json ./data/sensitive_places.json

# Ensure data directory and uploads are fully writable by any user
RUN mkdir -p /app/data/uploads && chmod -R 777 /app/data

# Listen on PORT (default 8080 or platform-injected $PORT)
EXPOSE 8080

CMD ["node", "server.js"]
