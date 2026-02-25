.PHONY: build-contracts test deploy-oracle deploy-options extract-abi backend-dev docker-build docker-up docker-down frontend-dev frontend-build

# ─── Smart Contracts ───

build-contracts:
	cd packages/oracle && forge build
	cd packages/options && forge build

test:
	cd packages/oracle && forge test -v
	cd packages/options && forge test -v

deploy-oracle:
	cd packages/oracle && npx tsx scripts/deploy-viem.ts

deploy-options:
	cd packages/options && npx tsx scripts/deploy-viem.ts

deploy-all: deploy-oracle deploy-options

# ─── Backend ───

extract-abi:
	bash scripts/extract-abi.sh

backend-dev:
	cd backend && .venv/bin/uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

backend-install:
	cd backend && python3 -m venv .venv && .venv/bin/pip install -r requirements.txt

# ─── Frontend ───

frontend-dev:
	cd packages/frontend && pnpm dev

frontend-build:
	cd packages/frontend && pnpm build

frontend-install:
	cd packages/frontend && pnpm install

# ─── Docker ───

docker-build: extract-abi
	docker compose build

docker-up: extract-abi
	docker compose up -d

docker-down:
	docker compose down

docker-logs:
	docker compose logs -f

docker-logs-backend:
	docker compose logs -f backend

docker-logs-frontend:
	docker compose logs -f frontend
