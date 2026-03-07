# DoD (Definition of Done) - v0.21.0

## 기능 완료 조건

| # | 조건 | 검증 방법 |
|---|------|----------|
| F1 | nginx가 Docker Compose에서 포트 80으로 기동됨 | `docker compose up` 후 `curl -s -o /dev/null -w '%{http_code}' localhost` → 200 |
| F2 | `/api/agent/*` 요청이 agent-server로 라우팅됨 | `curl localhost/api/agent/status` → 200 + JSON 응답 |
| F3 | `/api/*` 요청이 server로 라우팅됨 | `curl localhost/api/pools` → 200 + JSON 응답 |
| F4 | `/*` 요청이 프론트엔드로 라우팅됨 | `curl localhost` → HTML 응답 |
| F5 | agent-server에 `setGlobalPrefix("api")`가 적용됨 | `curl agent-server:3002/api/agent/status` (Docker 내부) → 200 |
| F6 | agent-server health 엔드포인트 동작 | `curl localhost/api/health` → server의 health 또는 agent-server의 `/api/health` → 200 |
| F7 | API Key guard가 제거됨 | `curl localhost/api/agent/status` (X-API-Key 헤더 없이) → 200 |
| F8 | Next.js API Route 프록시 2개 삭제됨 | `apps/web/src/app/api/agent/` 디렉토리가 존재하지 않음 |
| F9 | 프론트엔드 Pool 목록이 nginx 경유로 로드됨 | 브라우저에서 Pool 페이지 → 풀 목록 표시 |
| F10 | 프론트엔드 Agent 실행이 nginx 경유로 동작함 | 브라우저에서 Agent 실행 버튼 → 정상 응답 |
| F11 | server, agent-server의 호스트 포트 매핑이 제거됨 | `docker compose ps` → 80만 외부 노출 |

## 비기능 완료 조건

| # | 조건 | 검증 방법 |
|---|------|----------|
| N1 | TypeScript strict 모드 에러 0 | `npx tsc --noEmit` (apps/web, apps/agent-server) |
| N2 | 프론트엔드 빌드 성공 | `cd apps/web && pnpm build` |
| N3 | `NEXT_PUBLIC_API_URL` 환경변수 참조 제거됨 | `grep -r 'NEXT_PUBLIC_API_URL' apps/web/src/` → 결과 없음 |
| N4 | `AGENT_SERVER_URL` 환경변수 참조 제거됨 | `grep -r 'AGENT_SERVER_URL' apps/web/src/` → 결과 없음 |
| N5 | `API_KEY` 관련 코드 제거됨 (agent-server) | `grep -r 'ApiKeyGuard\|api-key.guard' apps/agent-server/src/` → 결과 없음 |

## 엣지케이스

| # | 시나리오 | 기대 동작 | 검증 방법 |
|---|---------|----------|----------|
| E1 | 직접 포트 접근 (localhost:3001, :3002) | 연결 거부 | `curl localhost:3001` → Connection refused |
| E2 | 존재하지 않는 API 경로 | nginx가 upstream 404 그대로 전달 | `curl localhost/api/nonexistent` → 404 |
| E3 | agent-server 다운 시 | nginx 502 반환 | agent-server 중지 후 `curl localhost/api/agent/status` → 502 |
| E4 | claude-proxy 접근 (Docker 내부 → 호스트) | agent-server가 host.docker.internal:3003으로 정상 접근 | agent-server 로그에서 Codex proxy 호출 확인 |

## PRD 목표 ↔ DoD 매핑

| PRD 목표 | DoD 항목 |
|----------|---------|
| 1. nginx 단일 진입점 (포트 80) | F1, F11 |
| 2. 경로 기반 라우팅 | F2, F3, F4 |
| 3. Next.js API Route 프록시 제거 | F8 |
| 4. API Key guard 제거 | F7, N5 |
| 5. .env 포트 하드코딩 제거 | N3, N4, F11 |

## 설계 결정 ↔ DoD 매핑

| 설계 결정 | DoD 항목 |
|----------|---------|
| agent-server setGlobalPrefix("api") | F5 |
| nginx longest prefix 라우팅 | F2, F3, F4 |
| Health controller 추가 | F6 |
| 프론트엔드 상대경로 전환 | F9, F10, N3 |
| Docker 포트 매핑 제거 | F11, E1 |
