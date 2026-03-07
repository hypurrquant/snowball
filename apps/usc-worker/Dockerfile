FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@latest --activate

# --- Dependencies ---
FROM base AS deps
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/usc-worker/package.json ./apps/usc-worker/

RUN pnpm install --frozen-lockfile 2>/dev/null || pnpm install

# --- Runner ---
FROM base AS runner
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/usc-worker/node_modules ./apps/usc-worker/node_modules

COPY apps/usc-worker ./apps/usc-worker

WORKDIR /app/apps/usc-worker

CMD ["node", "src/index.mjs"]
