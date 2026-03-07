FROM node:22-alpine AS base

# better-sqlite3 native build deps
RUN apk add --no-cache python3 make g++
RUN corepack enable && corepack prepare pnpm@latest --activate

# --- Dependencies ---
FROM base AS deps
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/core/package.json ./packages/core/
COPY packages/agent-runtime/package.json ./packages/agent-runtime/
COPY apps/agent-server/package.json ./apps/agent-server/

RUN pnpm install --frozen-lockfile 2>/dev/null || pnpm install

# --- Runner ---
FROM base AS runner
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/core/node_modules ./packages/core/node_modules
COPY --from=deps /app/packages/agent-runtime/node_modules ./packages/agent-runtime/node_modules
COPY --from=deps /app/apps/agent-server/node_modules ./apps/agent-server/node_modules

COPY packages/core ./packages/core
COPY packages/agent-runtime ./packages/agent-runtime
COPY apps/agent-server ./apps/agent-server

WORKDIR /app/apps/agent-server

EXPOSE 3002
ENV AGENT_SERVER_PORT=3002

HEALTHCHECK --interval=30s --timeout=5s --retries=3 --start-period=15s \
  CMD wget -q --spider http://localhost:3002/api/health || exit 1

CMD ["npx", "ts-node", "src/main.ts"]
