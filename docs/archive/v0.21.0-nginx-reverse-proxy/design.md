# 설계 - v0.21.0

## 변경 규모
**규모**: 일반 기능
**근거**: 3개+ 컴포넌트 수정 (nginx 신규, docker-compose, agent-server, 프론트엔드), 인프라 구성 변경

---

## 문제 요약
각 백엔드 서비스가 개별 포트를 외부에 직접 노출하고, Next.js API Route가 API Key 주입용 프록시로 존재한다. nginx 리버스 프록시로 단일 진입점(포트 80)을 만들고 불필요한 레이어를 제거한다.

> 상세: [README.md](README.md) 참조

## 접근법

nginx를 Docker Compose에 추가하여 포트 80으로 단일 진입점을 제공한다. agent-server에 `setGlobalPrefix("api")`를 추가하여 두 NestJS 서비스의 경로 패턴을 `/api/*`로 통일한 뒤, nginx가 경로 기반으로 분기한다.

```
:80 (nginx)
  ├── /api/agent/*  → agent-server:3002/api/agent/*
  ├── /api/*        → server:3001/api/*
  └── /*            → frontend:3000
```

## 대안 검토

| 방식 | 장점 | 단점 | 선택 |
|------|------|------|------|
| A: `/api/server/*`, `/api/agent-server/*` prefix 분리 | 서비스명이 URL에 명시적 | 모든 FE URL 변경 필요, 서비스 내부/외부 경로 불일치 | ❌ |
| B: 기존 경로 그대로 패스스루 | 변경 최소 | `/api/*`와 `/agent/*` 네이밍 비일관, agent-server healthcheck 버그 잔존 | ❌ |
| C: agent-server global prefix 추가 + nginx 패스스루 | FE 훅 URL 변경 거의 없음, healthcheck 버그 동시 해결, 일관된 `/api/*` 패턴 | agent-server main.ts 1줄 수정 필요 | ✅ |

**선택 이유**: 대안 C는 agent-server에 `setGlobalPrefix("api")` 1줄만 추가하면, 프론트엔드 훅(`useRunAgent`, `useAgentRuns`)이 이미 호출하는 `/api/agent/run`, `/api/agent/runs`가 그대로 동작한다. Next.js API Route 프록시만 삭제하면 끝.

## 기술 결정

### 1. 현재 서비스 경로 (발견 사실)

| 서비스 | Global Prefix | 실제 경로 |
|--------|--------------|----------|
| server (3001) | `app.setGlobalPrefix("api")` | `/api/health`, `/api/pools`, `/api/protocol/stats`, `/api/volumes` |
| agent-server (3002) | **없음** | `/agent/run`, `/agent/runs`, `/agent/status`, `/agent/manifests` |

**발견된 버그:**
- agent-server Docker healthcheck가 `/api/health` 호출 → 404 (prefix 없음)
- `AGENT_SERVER_URL` 기본값이 `localhost:3001` (server) → 실제 대상은 3002 (agent-server)

### 2. nginx 라우팅 규칙

```nginx
location /api/agent/ {
    proxy_pass http://agent-server:3002;
}

location /api/ {
    proxy_pass http://server:3001;
}

location / {
    proxy_pass http://frontend:3000;
}
```

- `location` longest prefix 매칭으로 `/api/agent/`가 `/api/`보다 우선
- `proxy_pass`에 trailing slash 없음 → 원본 경로 그대로 전달 (rewrite 불필요)

### 3. agent-server 변경

- `main.ts`에 `app.setGlobalPrefix("api")` 추가 → `/agent/*` → `/api/agent/*`
- Health controller 추가 → Docker healthcheck `/api/health` 정상 동작
- `@UseGuards(ApiKeyGuard)` 제거
- `api-key.guard.ts` 삭제

### 4. 프론트엔드 변경

| 파일 | 변경 전 | 변경 후 |
|------|--------|--------|
| `useRunAgent.ts` | `fetch("/api/agent/run")` | **변경 없음** (nginx가 라우팅) |
| `useAgentRuns.ts` | `fetch("/api/agent/runs?...")` | **변경 없음** |
| `usePoolList.ts` | `fetch(\`${API_URL}/api/pools\`)` | `fetch("/api/pools")` (상대경로) |
| `useProtocolStats.ts` | `fetch(\`${API_URL}/api/protocol/stats\`)` | `fetch("/api/protocol/stats")` (상대경로) |
| `app/api/agent/run/route.ts` | API Key 프록시 | **삭제** |
| `app/api/agent/runs/route.ts` | API Key 프록시 | **삭제** |

### 5. docker-compose.yml 변경

- nginx 서비스 추가 (port 80:80)
- server, agent-server: `ports` 매핑 제거 (외부 노출 차단)
- agent-server: `API_KEY` 환경변수 제거
- frontend: 주석 해제 + ports 제거

### 6. 환경변수 정리

| 변수 | 조치 |
|------|------|
| `NEXT_PUBLIC_API_URL` | 삭제 (상대경로로 대체) |
| `AGENT_SERVER_URL` | 삭제 (API Route 삭제) |
| `API_KEY` (agent-server) | 삭제 (Guard 제거) |
| `SERVER_PORT`, `AGENT_SERVER_PORT` | 삭제 (외부 포트 매핑 제거) |

---

## 범위 / 비범위

**범위 (In Scope):**
- nginx 설정 + Docker Compose 추가
- agent-server global prefix + health + API Key guard 제거
- Next.js API Route 프록시 삭제
- 프론트엔드 URL 상대경로 전환
- 환경변수 정리

**비범위 (Out of Scope):**
- SSL/TLS
- claude-proxy (Docker 외부)
- usc-worker (포트 미사용)
- Options/Chat 관련 dead code 정리
- 프론트엔드 Docker 이미지 최적화

## 아키텍처 개요

### Before
```
브라우저
  ├── :3000 (Next.js)
  │     ├── /api/agent/run  → [API Key 주입] → :3002/agent/run
  │     └── /api/agent/runs → [API Key 주입] → :3002/agent/runs
  ├── :3001 (server, 직접 노출)
  └── :3002 (agent-server, 직접 노출)
```

### After
```
브라우저
  └── :80 (nginx)
        ├── /api/agent/*  → agent-server:3002 (Docker 내부)
        ├── /api/*        → server:3001 (Docker 내부)
        └── /*            → frontend:3000 (Docker 내부)

Docker 내부:
  agent-server → host.docker.internal:3003 (claude-proxy, 변경 없음)
```

## 테스트 전략

검증 방법: docker compose up 후 curl + 브라우저

| # | 검증 항목 | 방법 |
|---|----------|------|
| 1 | nginx 기동 | `curl localhost/api/health` → 200 |
| 2 | server 라우팅 | `curl localhost/api/pools` → 200 |
| 3 | agent-server 라우팅 | `curl localhost/api/agent/status` → 200 |
| 4 | 프론트엔드 라우팅 | `curl localhost` → HTML |
| 5 | FE → agent-server | 브라우저에서 Agent 실행 버튼 동작 |
| 6 | FE → server | 브라우저에서 Pool 목록 로딩 |
| 7 | 직접 포트 접근 차단 | `curl localhost:3001` → 연결 거부 |

## 리스크/오픈 이슈

- `NEXT_PUBLIC_CHAT_API_BASE`가 `localhost:3002/api`를 가리키는 dead code — Options 범위이므로 이번에 미변경
- 프론트엔드 Docker 이미지 빌드 시 `NEXT_PUBLIC_*` 환경변수 주입 타이밍 확인 필요 (빌드 타임 vs 런타임)
