# Multi-stage Dockerfile for NagarSetu on Google Cloud Run
# Node image with build dependencies to compile better-sqlite3 native bindings

FROM node:20-slim AS base
WORKDIR /app
# Install build tools required for compiling better-sqlite3
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Stage 1: Install dependencies
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

# Stage 2: Build Next.js application
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Stage 3: Runner image for Cloud Run
FROM node:20-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=8080
ENV HOSTNAME="0.0.0.0"

# Create writable directory for SQLite database and file uploads
RUN mkdir -p /app/data/uploads && chmod -R 777 /app/data

# Copy built standalone server and static assets
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Cloud Run listens on PORT (default 8080)
EXPOSE 8080

CMD ["node", "server.js"]
