# DoD — v0.20.0 Claude CLI Proxy

## 기능 완료 조건

| # | 조건 | 검증 방법 |
|---|------|----------|
| F1 | `apps/claude-proxy/` 서버가 `POST /plan`에 대해 claude CLI를 실행하고 JSON 응답을 반환한다 | `curl -X POST localhost:3002/plan -d '{"prompt":"say hello in JSON"}' → 200 + JSON` |
| F2 | `cli-planner.ts`가 프록시 서버에 요청을 보내고 PlanStep[]을 반환한다 | tsc 컴파일 통과 + 기존 plan() 시그니처 호환 |
| F3 | `PLANNER_MODE=cli` 환경변수로 cli-planner가 기본 사용된다 | runtime.ts에서 분기 확인 |
| F4 | `PLANNER_MODE=api` 환경변수로 기존 anthropic-planner로 fallback 가능하다 | 코드 분기 확인 |
| F5 | Claude CLI 응답에서 JSON 추출이 실패해도 안전하게 빈 actions를 반환한다 | cli-planner.ts 파싱 에러 핸들링 확인 |
| F6 | `CLAUDE_PROXY_URL` 환경변수로 프록시 주소를 설정할 수 있다 | 환경변수 미설정 시 기본값 `http://host.docker.internal:3002` |

## 비기능 완료 조건

| # | 조건 | 검증 방법 |
|---|------|----------|
| N1 | agent-runtime tsc --noEmit 통과 | 명령 실행 → exit 0 |
| N2 | claude-proxy 서버에 외부 의존성 없음 (node 내장 모듈만) | package.json 확인 |
| N3 | .env.example에 새 환경변수 문서화 | 파일 확인 |

## 엣지케이스

| # | 조건 | 검증 방법 |
|---|------|----------|
| E1 | claude-proxy 서버가 꺼져있을 때 agent-server가 명확한 에러를 반환한다 | HTTP 연결 실패 → 에러 로그 + plan 실패 처리 |
| E2 | claude CLI가 타임아웃될 때 프록시가 적절히 응답한다 | execSync timeout 설정 확인 |
| E3 | claude CLI 응답이 JSON이 아닌 일반 텍스트일 때 파싱 fallback 동작 | actions: [] 반환 |
