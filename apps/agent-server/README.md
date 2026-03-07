# Agent Server

Snowball Agent Server — NestJS 기반 AI Agent 실행 서버. AgentVault를 통해 사용자 자산을 위임받아 온체인 DeFi 전략을 자동 실행합니다.

## Quick Start

```bash
# 1. 환경변수 설정
cp .env.example .env
# .env 파일을 열어 AGENT_PRIVATE_KEY, ANTHROPIC_API_KEY, API_KEY 설정

# 2. 의존성 설치 (프로젝트 루트에서)
pnpm install

# 3. 서버 실행
pnpm start

# 4. 상태 확인
curl http://localhost:3000/agent/status
# → {"status":"ok"}
```

## 환경변수

| 변수 | 필수 | 설명 |
|------|------|------|
| `AGENT_PRIVATE_KEY` | Y | Agent 지갑 private key (온체인 실행용) |
| `ANTHROPIC_API_KEY` | Y | Claude API key (AI 플래너용) |
| `API_KEY` | Y | REST API 인증 키 (Authorization 헤더) |
| `RPC_URL` | N | RPC 엔드포인트 (기본: Creditcoin Testnet) |

## API Endpoints

| Method | Path | 설명 |
|--------|------|------|
| POST | `/agent/run` | Agent 실행 (API key 필요) |
| GET | `/agent/runs` | 실행 이력 조회 |
| GET | `/agent/runs/:id` | 단건 조회 |
| GET | `/agent/status` | 서버 상태 |
| GET | `/agent/manifests` | 등록 Agent 목록 |
