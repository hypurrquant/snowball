# Snowball Protocol

DeFi 프로토콜 on Creditcoin Testnet (Chain ID: 102031)

5개 프로토콜: DEX (Uniswap V3) · Borrow (Liquity V2) · Lend (Morpho Blue) · Yield Vaults · Agent (ERC-8004)

---

## Architecture

```
                        ┌──────────────────────────┐
                        │   Frontend (Next.js)     │
                        │   localhost:3000          │
                        └────────────┬─────────────┘
                                     │
                    ┌────────────────┼────────────────┐
                    ▼                ▼                 ▼
             ┌────────────┐  ┌─────────────┐  ┌──────────────┐
             │   nginx    │  │   nginx     │  │    nginx     │
             │  /api/*    │  │ /api/agent/*│  │   (future)   │
             └─────┬──────┘  └──────┬──────┘  └──────────────┘
                   ▼                ▼
            ┌────────────┐  ┌──────────────┐
            │   server   │  │ agent-server │──→ claude-proxy ──→ codex CLI (LLM)
            │  (NestJS)  │  │   (NestJS)   │         │
            │  :3001     │  │   :3002      │         ▼
            └────────────┘  └──────┬───────┘    LLM 판단 JSON
                                   │
                                   ▼
                          AgentVault.executeOnBehalf()
                                   │
                                   ▼
                     Creditcoin Testnet (102031)
```

### Monorepo 구조

| 패키지 | 설명 |
|--------|------|
| `apps/web` | Next.js 프론트엔드 |
| `apps/server` | NestJS API (Volume/TVL 수집) |
| `apps/agent-server` | NestJS Agent 서버 (Observer → Planner → Executor) |
| `apps/claude-proxy` | Codex CLI 프록시 (LLM 판단용) |
| `apps/usc-worker` | Sepolia→USC 브릿지 워커 |
| `packages/core` | 공유 주소/ABI/설정 |
| `packages/agent-runtime` | Agent 런타임 (Capability Registry, Snapshot, Planner) |
| `packages/liquity` | Liquity V2 Solidity 컨트랙트 |

---

## Quick Start

### Prerequisites

- Node.js 20+, pnpm 9+
- Docker, Docker Compose
- [Codex CLI](https://github.com/openai/codex) (`npm i -g @openai/codex`)
- `OPENAI_API_KEY` 환경변수 (codex CLI용)

### 1. 환경변수

```bash
cp .env.example .env
# AGENT_PRIVATE_KEY, DEPLOYER_PRIVATE_KEY 설정
```

### 2. 의존성 설치

```bash
pnpm install
```

### 3. 서버 실행 (Docker)

```bash
# nginx + server + agent-server + usc-worker
docker compose up -d
```

### 4. Claude Proxy 실행 (Docker 밖)

```bash
cd apps/claude-proxy
make up      # 로그와 함께 실행
# make logs  — 로그만 보기
# make down  — 종료
```

> codex CLI는 Docker 안에서 실행 불가 → 호스트에서 직접 실행

### 5. 프론트엔드

```bash
# 로컬 개발
pnpm --filter @snowball/web dev

# 또는 just 사용
just fe
```

> 배포 서버에서는 `pnpm --filter @snowball/web build` 후 정적 파일 서빙

---

## Agent E2E 파이프라인

Agent는 Liquity V2 Trove 이자율을 시장 평균 대비 자동 조정한다.

```
1. agent-server (cron/API) → Observer: 온체인 데이터 수집 (user rate, avg rate)
2. agent-server → claude-proxy → codex CLI: LLM이 올릴지/내릴지 판단
3. agent-server → Executor: AgentVault.executeOnBehalf() 온체인 TX 실행
```

### Agent API

```bash
# 수동 실행
curl -X POST http://localhost/api/agent/run \
  -H "Content-Type: application/json" \
  -d '{"user": "0x...", "manifestId": "snowball-demo-defi-manager", "troveId": "..."}'

# 실행 이력
curl http://localhost/api/agent/runs

# 상태
curl http://localhost/api/agent/status
```

### 위임 설정 (Agent에게 이자율 조정 권한 부여)

```bash
NODE_PATH=apps/web/node_modules npx tsx scripts/sim/setup-delegation.ts
```

---

## Scripts

```bash
# 스크립트 실행 (viem 의존성이 apps/web/node_modules에 있음)
NODE_PATH=apps/web/node_modules npx tsx scripts/deploy/<script>.ts
NODE_PATH=apps/web/node_modules npx tsx scripts/sim/<script>.ts
```

| 경로 | 용도 |
|------|------|
| `scripts/deploy/` | 컨트랙트 배포 |
| `scripts/sim/` | 시뮬레이션/테스트 |
| `scripts/simulation-accounts.json` | 8 페르소나 + deployer 계정 |

---

## 외부 서버 배포

```bash
# 1. 코드 클론 + .env 설정
git clone ... && cp .env.example .env

# 2. Docker 서비스
docker compose up -d

# 3. Claude Proxy (Linux에서는 CLAUDE_PROXY_URL 수정 필요)
echo 'CLAUDE_PROXY_URL=http://172.17.0.1:3003' >> .env
docker compose up -d agent-server  # 재시작
cd apps/claude-proxy && OPENAI_API_KEY=sk-... make up

# 4. 프론트엔드 빌드
pnpm --filter @snowball/web build
# 빌드 결과: apps/web/.next/ → nginx나 pm2로 서빙
```

> Linux Docker에서 `host.docker.internal`이 안 되므로 `172.17.0.1` (Docker bridge IP) 사용.
> 또는 docker-compose.yml에 `extra_hosts: ["host.docker.internal:host-gateway"]` 추가.

---

## Documentation

| 문서 | 설명 |
|------|------|
| [`docs/ssot/`](./docs/ssot/) | 프로토콜별 컨트랙트 주소 (SSOT) |
| [`docs/guide/deploy-history.md`](./docs/guide/deploy-history.md) | 배포 이력 |
| [`docs/test/agent-test.md`](./docs/test/agent-test.md) | Agent E2E 테스트 시나리오 |
| [`docs/guide/OPERATIONS.md`](./docs/guide/OPERATIONS.md) | 운영 가이드 |

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Smart Contracts | Solidity 0.8.24, Foundry |
| Frontend | Next.js 15, TailwindCSS, wagmi v2, viem |
| Backend | NestJS, TypeScript, SQLite |
| Agent | agent-runtime (Observer→Planner→Executor), Codex CLI |
| Infra | Docker Compose, nginx |
| Blockchain | Creditcoin Testnet (102031) |
