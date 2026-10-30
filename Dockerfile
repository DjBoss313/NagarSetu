# Multi-stage Dockerfile for NagarSetu on Google Cloud Run
# Base image includes build tools required to compile better-sqlite3 native bindings

FROM node:20-slim AS base
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

# Stage 3: Minimal Production Runner for Google Cloud Run
FROM node:20-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=8080
ENV HOSTNAME="0.0.0.0"

# Create writable directory for SQLite database and uploaded citizen photos
RUN mkdir -p /app/data/uploads && chmod -R 777 /app/data

# Copy built standalone server and static assets
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Copy compiled better-sqlite3 native module
COPY --from=builder /app/node_modules/better-sqlite3 ./node_modules/better-sqlite3

# Copy seed datasets for auto-seed on empty DB
COPY --from=builder /app/data/seed_reports.json ./data/seed_reports.json
COPY --from=builder /app/data/sensitive_places.json ./data/sensitive_places.json

# Cloud Run listens on PORT (default 8080)
EXPOSE 8080

CMD ["node", "server.js"]
