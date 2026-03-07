# DoD (Definition of Done) - v0.18.0

## 기능 완료 조건

### Goal 1: 실행 이력 영속화

| # | 조건 | 검증 방법 |
|---|------|----------|
| F1 | `apps/agent-server/` 시작 시 SQLite DB 파일(`data/agent.db`)이 생성되고, `agent_runs` 테이블이 존재한다 | 서버 시작 후 `sqlite3 data/agent.db ".tables"` 실행 → `agent_runs` 출력 |
| F2 | `POST /agent/run` 호출 시 runtime 실행 전에 `status='started'` 레코드가 DB에 삽입된다 (2-phase write Phase 1) | E2E 테스트: mock runtime이 호출되기 전 DB에 started 레코드 존재 확인 |
| F3 | runtime 실행 완료 후 해당 레코드가 terminal status(`success`/`no_action`/`error`/`aborted`)로 업데이트된다 (Phase 2) | E2E 테스트: POST /agent/run 후 GET /agent/runs/:id → status가 terminal |
| F4 | 서버 재시작 후 `GET /agent/runs`로 이전 실행 이력을 조회할 수 있다 | E2E 테스트: 임시 파일 DB로 insert → 앱 재생성 → GET /agent/runs → 이전 데이터 반환 |
| F5 | `GET /agent/runs?user=0x...`로 특정 유저의 이력만 필터링된다 | E2E 테스트: 2개 유저 데이터 insert → user 파라미터로 필터 → 해당 유저만 반환 |
| F6 | `GET /agent/runs/:id`로 단건 조회 시 존재하면 200, 없으면 404를 반환한다 | E2E 테스트: 존재하는 id → 200, 없는 id → 404 |

### Goal 2: 구조화된 로깅

| # | 조건 | 검증 방법 |
|---|------|----------|
| F7 | 서버 시작 시 `logs/` 디렉토리에 로그 파일이 생성된다 | 서버 시작 후 `ls logs/` → `agent-YYYY-MM-DD.log` 존재 |
| F8 | 에러 발생 시 별도 에러 로그 파일(`logs/error-YYYY-MM-DD.log`)에 기록된다 | 의도적 에러 발생 후 error 로그 파일에 해당 에러 존재 확인 |
| F9 | 로그 포맷이 JSON이다 (timestamp, level, context, message 필드 포함) | 로그 파일 1줄을 JSON.parse → 4개 필드 존재 확인 |
| F10 | 기존 `Logger` 호출 코드(`scheduler.service.ts`, `http-exception.filter.ts` 등) 변경 없이 파일 로깅이 동작한다 | 기존 코드 git diff → Logger 호출 코드 변경 없음 + 로그 파일에 해당 context 출력 확인 |

### Goal 3: API 보호

| # | 조건 | 검증 방법 |
|---|------|----------|
| F11 | `POST /agent/run`을 1분 내 11회 호출하면 11번째에서 `429 Too Many Requests`를 반환한다 | E2E 테스트: 동일 IP로 11회 연속 호출 → 마지막 429 |
| F12 | 다른 엔드포인트(`GET /agent/runs` 등)는 1분 내 61회 호출 시 429를 반환한다 | E2E 테스트: 61회 연속 호출 → 마지막 429 |
| F13 | Cron(SchedulerService) 내부 호출은 rate limit 영향을 받지 않는다 | 코드 리뷰: ThrottlerGuard는 HTTP 요청에만 적용. SchedulerService는 직접 service 메서드 호출 |

### Goal 4: 실행 안정성

| # | 조건 | 검증 방법 |
|---|------|----------|
| F14 | Anthropic SDK 클라이언트에 `timeout: 60_000` (60초) 옵션이 설정되어 있다 | 코드 리뷰: `anthropic-planner.ts`에서 `new Anthropic({ timeout: 60_000 })` 확인 |
| F15 | Claude API가 60초 내 응답하지 않으면 `APIConnectionTimeoutError`가 발생하고 `RunResult { status: 'error' }`로 처리된다 | 단위 테스트 또는 코드 리뷰: timeout 시 에러 핸들링 경로 확인 |

### Goal 5: 회귀 방지

| # | 조건 | 검증 방법 |
|---|------|----------|
| F16 | `apps/agent-server/test/agent.e2e-spec.ts`에 design.md 테스트 전략의 9개 시나리오 각각에 대응하는 테스트가 존재한다 (정상 실행, API key 누락, 동시 실행, user 필터, 단건 조회, 서버 상태, rate limit, persistence, runtime 예외) | 파일 내 `it()`/`describe()` 블록이 design.md 시나리오 #1~#9에 1:1 대응하는지 확인 |
| F17 | 모든 E2E 테스트가 통과한다 | `cd apps/agent-server && npx jest --config jest-e2e.config.ts` → exit code 0 |
| F18 | AgentRuntime이 NestJS DI로 주입되어 테스트에서 mock 교체가 가능하다 | 코드 리뷰: `agent.module.ts`에 provider 등록 + `agent.service.ts`에 `@Inject` + E2E 테스트에서 `overrideProvider` 사용 |

### Goal 6: 개발자 온보딩

| # | 조건 | 검증 방법 |
|---|------|----------|
| F19 | `apps/agent-server/.env.example`에 `AGENT_PRIVATE_KEY`, `ANTHROPIC_API_KEY`, `API_KEY`, `RPC_URL` 변수가 설명과 함께 존재한다 | 파일 내용 확인 |
| F20 | 루트 `.env.example`에 Agent Server 섹션이 추가되어 위 4개 변수가 기재된다 | 파일 내용 확인 |
| F21 | `apps/agent-server/README.md`에 Quick Start 섹션이 존재하고, 해당 절차만 따라 서버가 기동된다 | 파일 내용 확인(Quick Start 존재) + 실제 검증: `.env.example` 복사 → 필수 변수 설정 → `pnpm install` → `pnpm start` → `GET /agent/status` 200 응답 |

### Goal 7: 컨트랙트 주소 SoT 확립

| # | 조건 | 검증 방법 |
|---|------|----------|
| F22 | `packages/core/src/config/addresses.ts`의 AgentVault 주소가 온체인 검증을 통과한 canonical 주소이다 | `scripts/verify-agent-vault.ts` 실행 → `eth_getCode` 존재 + `getDelegatedUsers()` 정상 응답 |
| F23 | `packages/liquity/deployments/addresses-102031.json`의 AgentVault 주소가 코드 SoT(`addresses.ts`)와 일치한다 | 두 파일의 AgentVault 주소 비교 → 동일 |
| F24 | `packages/agent-runtime/src/config.ts`의 AgentVault 주소가 코드 SoT와 일치한다 | 두 파일의 AgentVault 주소 비교 → 동일 |
| F25 | `docs/ssot/SSOT_ERC8004.md`의 AgentVault 주소가 코드 SoT와 일치한다 | 두 파일의 AgentVault 주소 비교 → 동일 |
| F26 | `docs/guide/deploy-history.md`에 AgentVault 배포 provenance가 완전히 기록되어 있다: (1) contract address가 코드 SoT와 일치, (2) tx hash 존재, (3) block number 존재, (4) 확인 시점 존재, (5) ABI 버전 존재. tx hash 미확보 시 재배포를 수행하여 새 tx hash가 기록되어 있다 | 파일 내용 확인 → 5개 필드 모두 존재 + contract address와 `addresses.ts` 일치 |

---

## 비기능 완료 조건

| # | 조건 | 검증 방법 |
|---|------|----------|
| N1 | TypeScript strict 모드 에러 0 (`apps/agent-server`, `packages/agent-runtime`) | `npx tsc --noEmit -p apps/agent-server/tsconfig.json` + `npx tsc --noEmit -p packages/agent-runtime/tsconfig.json` |
| N2 | 기존 빌드 성공 (agent-server) | `cd apps/agent-server && pnpm build` → exit code 0 |
| N3 | `data/`, `logs/` 디렉토리가 `.gitignore`에 포함되어 소스코드에 커밋되지 않는다 | `git status` → data/, logs/ 파일 없음 |
| N4 | 기존 HTTP API 계약 변경 없음 (POST /agent/run, GET /agent/runs 등 요청/응답 스키마 동일) | E2E 테스트에서 기존 스키마로 요청/응답 검증 |
| N5 | `runtime.run()` 시그니처 변경이 runId 파라미터 추가에 한정된다 (파이프라인 로직 미변경) | 코드 리뷰: `run(runId: string, ...)` 시그니처 확인 + `npx tsc --noEmit -p packages/agent-runtime/tsconfig.json` 빌드 통과 + E2E 테스트 통과 |

---

## 엣지케이스

| # | 시나리오 | 기대 동작 | 검증 방법 |
|---|---------|----------|----------|
| E1 | Phase 1 (pre-insert) DB 실패 | runtime 실행하지 않고 500 반환. on-chain side-effect 없음 | E2E 테스트: DB mock으로 insert 실패 유발 → 500 + runtime mock 미호출 확인 |
| E2 | Phase 2 (terminal update) DB 실패 | fallback update(status='error') 시도. 성공 시 error 상태 응답, 실패 시 500 + started 레코드 잔존 | E2E 테스트: update mock 실패 → fallback 동작 확인 |
| E3 | 서버 비정상 종료 후 재시작 시 started 레코드 잔존 | crash recovery: 서버 시작 시 started → error 일괄 전환 | E2E 테스트: started 레코드 수동 insert → 서버 재시작 → status='error' 확인 |
| E4 | GET /agent/runs에서 status='started' 레코드 조회 | 서비스 레이어에서 'error'로 매핑하여 반환 | E2E 테스트: started 레코드 insert → GET /agent/runs → status='error'로 반환 |
| E5 | RunResult에 bigint 값 포함 시 DB 저장 | custom replacer로 string 변환하여 저장. TypeError 미발생 | E2E 테스트: bigint 포함 RunResult mock → insert 성공 확인 |
| E6 | 동일 유저가 동시에 POST /agent/run 호출 | activeRuns lock으로 409 Conflict 반환 | E2E 테스트: 동일 user로 2회 연속 호출 → 2번째 409 |
| E7 | API Key 없이 POST /agent/run 호출 | 401 Unauthorized 반환 | E2E 테스트: x-api-key 헤더 없이 호출 → 401 |
| E8 | 온체인 검증 시 양쪽 주소 모두 eth_getCode 무응답 또는 tx hash 미확보 | 재배포 경로(대안 C) 전환. 재배포 tx hash를 deploy-history.md에 기록. F26에서 최종 확인 | 수동 검증: 스크립트 실행 결과 + deploy-history.md 기록 확인 |

---

## PRD 목표 → DoD 매핑

| PRD 목표 | DoD 항목 | 커버 |
|----------|---------|------|
| 1. 실행 이력 영속화 | F1~F6, E1~E5 | 확인 |
| 2. 구조화된 로깅 | F7~F10 | 확인 |
| 3. API 보호 | F11~F13 | 확인 |
| 4. 실행 안정성 | F14~F15 | 확인 |
| 5. 회귀 방지 | F16~F18 | 확인 |
| 6. 개발자 온보딩 | F19~F21 | 확인 |
| 7. 컨트랙트 주소 SoT 확립 | F22~F26, E8 | 확인 |

## 설계 결정 → DoD 반영

| 설계 결정 | DoD 반영 | 커버 |
|----------|---------|------|
| T1: SQLite + better-sqlite3 (WAL) | F1, F4, N3 | 확인 |
| T2: winston + nest-winston | F7~F10 | 확인 |
| T3: @nestjs/throttler | F11~F13 | 확인 |
| T4: Anthropic SDK timeout 60초 | F14~F15 | 확인 |
| T5: Jest + @nestjs/testing | F16~F18 | 확인 |
| T6: 양쪽 .env.example | F19~F20 | 확인 |
| T7: 온체인 검증 후 SoT 통일 | F22~F26 | 확인 |
| 2-phase write (pre-insert → update) | F2~F3, E1~E4 | 확인 |
| runtime.run() runId 외부 주입 | F2, N5 | 확인 |
| crash recovery (started → error) | E3~E4 | 확인 |
| DI 리팩토링 (AgentRuntime mock) | F18 | 확인 |
