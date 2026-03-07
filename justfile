# Snowball Protocol

# Docker — all services
up *args:
    #!/usr/bin/env bash
    if [ -z "{{args}}" ]; then
        docker compose -f docker-compose.local.yml up -d --build
        echo "All services running: server(:3001) agent-server(:3002) usc-worker frontend(:3000)"
    else
        docker compose -f docker-compose.local.yml up -d --build {{args}}
        echo "Started: {{args}}"
    fi

down:
    docker compose -f docker-compose.local.yml down

logs *args:
    #!/usr/bin/env bash
    if [ -z "{{args}}" ]; then
        docker compose logs -f
    else
        docker compose logs -f {{args}}
    fi

restart *args:
    #!/usr/bin/env bash
    if [ -z "{{args}}" ]; then
        docker compose restart
    else
        docker compose restart {{args}}
    fi

# Dev (local, without Docker)
dev:
    pnpm --filter @snowball/web dev

fe:
    pnpm --filter @snowball/web dev

dev-server:
    cd apps/server && npx ts-node src/main.ts
