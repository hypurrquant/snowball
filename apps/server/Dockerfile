FROM node:22-alpine AS base

# better-sqlite3 native build deps
RUN apk add --no-cache python3 make g++
RUN corepack enable && corepack prepare pnpm@latest --activate

# --- Dependencies ---
FROM base AS deps
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/core/package.json ./packages/core/
COPY apps/server/package.json ./apps/server/

RUN pnpm install --frozen-lockfile 2>/dev/null || pnpm install

# --- Runner ---
FROM base AS runner
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/core/node_modules ./packages/core/node_modules
COPY --from=deps /app/apps/server/node_modules ./apps/server/node_modules

COPY packages/core ./packages/core
COPY apps/server ./apps/server

RUN mkdir -p /app/apps/server/data

WORKDIR /app/apps/server

EXPOSE 3001
ENV PORT=3001

HEALTHCHECK --interval=30s --timeout=5s --retries=3 --start-period=15s \
  CMD wget -q --spider http://localhost:3001/api/health || exit 1

CMD ["npx", "ts-node", "src/main.ts"]
