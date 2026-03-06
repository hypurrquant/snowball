# Snowball Protocol

# Dev server
up:
    pnpm --filter @snowball/web dev

down:
    -lsof -ti :3000 | xargs kill -9 2>/dev/null
