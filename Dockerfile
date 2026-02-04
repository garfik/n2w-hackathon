# =============================================================================
# Stage 1: build client assets
# =============================================================================
FROM oven/bun:1 AS builder

WORKDIR /app

# Install deps (including dev for build)
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile

# Build client (HTML + JS/CSS) into dist/
# BUN_PUBLIC_* are baked into the client bundle at build time (set via build --build-arg or compose .env)
ARG BUN_PUBLIC_BETTER_AUTH_URL
ENV BUN_PUBLIC_BETTER_AUTH_URL=$BUN_PUBLIC_BETTER_AUTH_URL
COPY build.ts ./
COPY src ./src
COPY tsconfig.json ./
COPY components.json ./
RUN bun run build

# =============================================================================
# Stage 2: production runtime (Bun + libvips for sharp)
# =============================================================================
FROM oven/bun:1 AS runner

# libvips for sharp (image processing)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libvips42 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Production deps only
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile --production

# App code + built client + migrations (for RUN_MIGRATIONS_ON_START)
COPY --from=builder /app/dist ./dist
COPY src ./src
COPY drizzle ./drizzle
COPY build.ts tsconfig.json bunfig.toml bun-env.d.ts ./
COPY components.json ./

# Env vars (override at run via -e or env_file); see .env.example
# RUN_MIGRATIONS_ON_START=1: run db migrations before starting (used in Docker)
ENV NODE_ENV=production
ENV PORT=7001
ENV RUN_MIGRATIONS_ON_START=1

EXPOSE 7001

# Start server (serves API + static from dist)
CMD ["bun", "run", "start"]
