# Snowball Protocol

# Docker — server only (default)
up:
    docker compose up -d --build server
    @echo "Server running at http://localhost:3001"

down:
    docker compose down

up-all:
    docker compose up -d --build

logs:
    docker compose logs -f server

restart:
    docker compose restart server

# Dev (local, without Docker)
dev:
    pnpm --filter @snowball/web dev

dev-server:
    cd apps/server && npx ts-node src/main.ts
