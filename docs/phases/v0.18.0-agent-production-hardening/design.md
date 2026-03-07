# 설계 - v0.18.0

## 변경 규모

**규모**: 운영 리스크
**근거**:
- DB 스키마 변경: SQLite 신규 테이블 (`agent_runs`) 도입
- 프로덕션 배포 영향: 온체인 주소 SoT canonicalization + 컨트랙트 검증/재배포 가능성
- 인증/호출 제어 변경: API Rate limiting 도입
- 운영 로그 신규 도입: winston 파일 로깅
- 2개+ 컴포넌트 수정 (agent-server 4개 모듈 + agent-runtime 1파일)

---

## 문제 요약

Agent 시스템의 핵심 로직은 완성되었으나 운영 인프라(DB, 로깅, rate limit, timeout, 테스트, 환경변수, 주소 SoT) 7가지가 부족하여 production급 서버를 열 수 없음.

> 상세: [README.md](README.md) 참조

---

## 접근법

7개 문제를 **인프라 래핑** 패턴으로 해결. Agent Runtime 핵심 파이프라인(Observe→Plan→Execute)은 변경하지 않고, 외부에서 영속화·로깅·보호·검증 계층을 감싼다.

1. **DB 래핑 (2-phase write)**: `agent.service.ts`에서 runtime.run() 전에 `status='started'` 레코드 pre-insert → runtime.run(runId) → terminal status로 update. DB 장애 시 실행 자체를 거부 (fail-closed)
2. **로깅 래핑**: `app.useLogger()`로 NestJS Logger 전역 교체. 기존 `Logger` 호출 코드 변경 없음
3. **Rate limit 래핑**: `ThrottlerGuard`를 Global Guard로 등록. 기존 Guard 체인에 추가
4. **Timeout 래핑**: `anthropic-planner.ts`의 Anthropic 클라이언트 생성 시 `timeout` 옵션 1줄 추가
5. **테스트 래핑**: NestJS Testing Module로 전체 HTTP 파이프라인 검증. AgentRuntime은 DI mock
6. **환경변수**: `.env.example` 파일 추가/업데이트 (코드 변경 없음)
7. **SoT 통일**: 온체인 검증 후 주소 파일 동기화 (로직 변경 없음)

## 데이터 흐름

기존 흐름에 **2-phase DB write**를 추가. 핵심은 **pre-insert로 감사 추적 보장** + **fail-closed**.

```
POST /agent/run 수신
  │
  ├─ 1. ApiKeyGuard + ThrottlerGuard 통과
  │
  ├─ 2. activeRuns lock 확인 (기존 중복 실행 방지)
  │     └─ 이미 실행 중 → 409 Conflict
  │
  ├─ 3. activeRuns lock 획득
  │
  ├─ 4. runId = crypto.randomUUID()
  │
  ├─ 5. RunStoreService.insert({ runId, status: 'started', ... })  ← Phase 1: pre-insert
  │     └─ 실패 → 500 반환 (runtime 실행하지 않음, fail-closed)
  │
  ├─ 6. runtime.run(runId) 호출 → RunResult 수신
  │     └─ Claude timeout / 에러 → RunResult { status: 'error' }
  │
  ├─ 7. RunStoreService.update(runId, runResult)  ← Phase 2: terminal update
  │     ├─ 성공 → 8으로
  │     └─ 실패 → fallback update(status='error') 시도
  │           ├─ fallback 성공 → 8으로 (error 상태로 응답)
  │           └─ fallback 실패 → winston error + 500 반환 (started 레코드 잔존, crash recovery 대상)
  │
  ├─ 8. 200 + RunResult 반환
  │
  └─ 9. finally: activeRuns lock 해제
```

**설계 결정 — 2-phase write (pre-insert → update)**:
- Phase 1 (pre-insert): runtime 실행 전에 `status='started'` 레코드 생성. 이 시점부터 모든 실행이 DB에 기록됨
- Phase 2 (terminal update): runtime 완료 후 최종 상태로 update. 실패해도 started 레코드가 남아 감사 추적 가능
- **runtime 계약 변경**: `runtime.run()` 시그니처에 `runId` 파라미터 추가. runtime 내부 runId 생성 로직 제거. 파이프라인(Observe→Plan→Execute) 로직은 변경하지 않으며, runId 수신 방식만 변경 (외부 주입)
- **on-chain side-effect 이후 update 실패 시**: started 레코드가 DB에 남아 있으므로 "실행이 시작되었으나 결과 미기록" 상태가 감사 가능. winston error 로그에 RunResult 전문이 남아 운영자가 수동으로 terminal status 복구 가능
- **Phase 2 실패 시 fallback**: catch 블록에서 `status='error'` + `errors=['DB update failed']`로 fallback update 1회 시도. 이것마저 실패하면 started 레코드가 남되, 서버 재시작 시 crash recovery로 정리됨
- **crash recovery (서버 시작 시)**: `DatabaseService.onModuleInit()`에서 `UPDATE agent_runs SET status='error', errors='["server crash during execution"]' WHERE status='started'` 실행. 비정상 종료로 남은 started 레코드를 일괄 정리
- **중복 실행 방지**: in-memory activeRuns lock (기존) + crash recovery가 서버 시작 시 started를 정리하므로, 재시작 후 동일 user의 새 run이 막히지 않음. 서버 실행 중 Phase 2 실패 시에는 fallback update가 started→error로 전환하여 정리

**started 상태의 API 노출 정책**:
- `started`는 DB 내부 임시 상태. 정상 흐름에서는 runtime.run() 완료 후 즉시 terminal status로 update되므로 API에 노출되지 않음
- 극단적 상황(Phase 2 + fallback 모두 실패)에서만 started가 잠시 존재하나, 서버 재시작 시 crash recovery로 error 전환
- `GET /agent/runs` 조회 시 서비스 레이어에서 `status='started'`인 레코드는 `'error'`로 매핑하여 반환 → **RunResult.status 타입 변경 불필요, API contract 변경 없음**

---

## 대안 검토

### 문제 1: 실행 이력 영속화

| 방식 | 장점 | 단점 | 선택 |
|------|------|------|------|
| A: SQLite + better-sqlite3 | apps/server에 동일 패턴 존재, Docker 불필요, SQL 쿼리 자연스러움 | 네이티브 바인딩 빌드 필요 (이미 검증됨) | ✅ |
| B: JSON 파일 저장 | 의존성 0 | 동시 쓰기 corruption, 파일 커지면 비효율, 쿼리 불가 | ❌ |
| C: LevelDB/LMDB | KV 접근 빠름 | 기존 패턴 없음, 범용 쿼리 불편 | ❌ |

**선택 이유**: `apps/server/src/database/database.service.ts`에 이미 better-sqlite3 + WAL 모드 + NestJS 생명주기 패턴이 존재. 그대로 복제하여 일관성 유지. `pnpm.onlyBuiltDependencies`에 등록 완료.

### 문제 2: 구조화된 로깅

| 방식 | 장점 | 단점 | 선택 |
|------|------|------|------|
| A: winston + nest-winston | NestJS 공식 통합, 기존 Logger 코드 변경 불필요, daily rotation | 의존성 3개 | ✅ |
| B: pino + nestjs-pino | 고성능 | 호환 검증 필요, pino-pretty 별도 설치 | ❌ |
| C: NestJS 내장 + 커스텀 transport | 의존성 0 | rotation 직접 구현, 상용 미달 | ❌ |

**선택 이유**: `scheduler.service.ts`, `http-exception.filter.ts`가 이미 NestJS `Logger`를 사용. `app.useLogger()`로 전역 교체하면 기존 코드 변경 없이 파일 로깅 전환.

### 문제 3: API Rate Limiting

| 방식 | 장점 | 단점 | 선택 |
|------|------|------|------|
| A: @nestjs/throttler | NestJS 공식, Guard 체인 통합, 엔드포인트별 차등 | 메모리 기반 (단일 서버 OK) | ✅ |
| B: express-rate-limit | Express 표준 | NestJS 패턴 불일치 | ❌ |
| C: 커스텀 Guard + Map 카운터 | 의존성 0 | sliding window 직접 구현, 바퀴 재발명 | ❌ |

**선택 이유**: NestJS 공식 패키지로 Guard 체인에 자연스럽게 통합. `POST /agent/run`에 엄격한 제한(10/분), 나머지는 기본(60/분).

### 문제 4: Agent 실행 Timeout

| 방식 | 장점 | 단점 | 선택 |
|------|------|------|------|
| A: Anthropic SDK `timeout` 옵션 | SDK 내장, 1줄 변경, 가장 빈번한 지연 원인 정밀 차단 | Claude 호출만 보호 | ✅ |
| B: AbortController + setTimeout | SDK 버전 무관 | 보일러플레이트 | ❌ |
| C: runtime.run() Promise.race | 전체 파이프라인 보호 | side-effect 일관성 문제 (트랜잭션 중 timeout → 중복 run / lock 영구 점유) | ❌ |

**선택 이유**: Layer 1(Claude SDK timeout)만 적용. Layer 2(Promise.race)는 **이번 Phase에서 제외**.

**Layer 2 제외 근거**:
- `runtime.run()` 내부에서 `runId`가 생성되므로, 서비스 레이어에서 timeout 시점에 유효한 RunResult를 구성할 수 없음
- timeout 후에도 백그라운드에서 온체인 tx가 진행되면 side-effect 일관성 문제 (lock 해제 → 중복 run / lock 유지 → 영구 점유)
- Claude API 지연이 timeout의 지배적 원인이므로, SDK timeout 60초로 대부분의 실운영 지연을 해소 가능
- RPC/트랜잭션 지연 보호는 향후 AbortController 통합 시 함께 설계 (별도 Phase)

**timeout 시 응답 계약**: SDK가 `APIConnectionTimeoutError`를 throw → `runtime.run()` catch 블록 → `RunResult { status: 'error', errors: ['Claude API timeout'] }` 반환. 기존 에러 처리 흐름과 동일하며, API 응답 계약 변경 없음.

### 문제 5: E2E 테스트

| 방식 | 장점 | 단점 | 선택 |
|------|------|------|------|
| A: Jest + mock 기반 통합 | CI 안정, 빠름 | 실제 API/온체인 미검증 | 부분 결합 |
| B: NestJS Testing + supertest | 공식 패턴, HTTP E2E | 여전히 mock 필요 | ✅ |
| C: 실제 Claude + 테스트넷 | 최고 신뢰도 | 비용, 느림, 불안정 | ❌ |

**선택 이유**: NestJS Testing Module로 HTTP 레벨 E2E, AgentRuntime은 mock, SQLite는 임시 파일 DB로 테스트 격리.

**AgentRuntime mock을 위한 DI 리팩토링**: 현재 `agent.service.ts`에서 `new AgentRuntime()`을 직접 생성하므로 mock 교체가 불가능. NestJS DI를 활용하여 `AgentRuntime`을 provider로 등록하고, 테스트에서 `overrideProvider()`로 mock 교체. 구체적으로:
- `agent.module.ts`에 `{ provide: 'AGENT_RUNTIME', useFactory: () => new AgentRuntime() }` 추가
- `agent.service.ts`에서 `@Inject('AGENT_RUNTIME') private runtime: AgentRuntime` 으로 전환
- 테스트에서 `overrideProvider('AGENT_RUNTIME').useValue(mockRuntime)` 사용

### 문제 6: 환경변수 템플릿

| 방식 | 장점 | 단점 | 선택 |
|------|------|------|------|
| A: 루트 + 앱 양쪽 .env.example | 기존 usc-worker 패턴 일관 | 중복 소지 | ✅ |
| B: 루트만 | 단일 소스 | 앱별 필요 변수 불명확 | ❌ |
| C: 앱만 | 앱 수준 명확 | 루트에서 미발견 | ❌ |

### 문제 7: AgentVault 주소 SoT

| 방식 | 장점 | 단점 | 선택 |
|------|------|------|------|
| A: 코드 기준으로 배포기록 업데이트 | 변경 최소 | 온체인 미검증 시 위험 | ❌ |
| B: 온체인 검증 후 SoT 통일 | 가장 안전 | 검증 스크립트 필요 | ✅ |
| C: 재배포 + 전 파일 동기화 | 깨끗한 시작 | 기존 상태 소멸, 불필요한 비용 | ❌ |

**선택 이유**: `0x7d3f...`가 `deploy-history.md`에 최신 배포로 기록되어 있으나, 검증 없이 확정은 위험. 온체인 `getDelegatedUsers()`, `getPermNonce()` 호출로 동작 확인 후 canonical 확정.

**SoT 체계 확립**:
- **코드 SoT (canonical)**: `packages/core/src/config/addresses.ts` — 모든 코드가 이 파일을 참조
- **배포 기록 SoT**: `docs/guide/deploy-history.md` — 배포 provenance (tx hash, block number, 배포 시점, ABI 버전) 기록
- **동기화 대상**: `packages/liquity/deployments/addresses-102031.json`, `packages/agent-runtime/src/config.ts` — 코드 SoT와 일치하도록 업데이트
- **SSOT 문서**: `docs/ssot/SSOT_ERC8004.md` — 코드 SoT와 일치하도록 업데이트
- **검증 산출물**: `scripts/verify-agent-vault.ts` 실행 결과를 `deploy-history.md`에 기록 (호출 결과, 확인 시점)

**Provenance 확보 절차**:
1. `eth_getCode(0x7d3f...)` → 바이트코드 존재 확인
2. `getDelegatedUsers()`, `getPermNonce()` 호출 → 정상 응답 여부
3. 배포 tx hash 확보 방법:
   - (a) Creditcoin Testnet 블록 탐색기에서 contract creation tx 검색
   - (b) 탐색기 미지원 시, `git log --all -- packages/liquity/deployments/` 및 deploy 스크립트 실행 이력에서 tx hash 추출
   - (c) 어디에도 없으면 → **재배포 경로(대안 C)로 전환**. provenance 없이 완료 처리하지 않음
4. 확보된 정보를 `deploy-history.md`에 기록: contract address, tx hash, block number, 확인 시점, ABI 버전

**분기 정책**: PRD 목표 7은 "배포 provenance(tx hash, 배포 시점) 기록"을 포함. 따라서 tx hash를 확보하지 못하면 Goal 7 미달성. 이 경우 재배포하여 새 tx hash를 확보한 뒤 전 파일을 동기화한다.

---

## 기술 결정

| # | 결정 | 근거 |
|---|------|------|
| T1 | SQLite + better-sqlite3 (WAL 모드) | apps/server 기존 패턴 복제, Docker 불필요 |
| T2 | winston + nest-winston + daily-rotate-file | NestJS 공식 통합, Logger 코드 변경 최소 |
| T3 | @nestjs/throttler (Global + per-endpoint) | NestJS 공식, Guard 체인 통합 |
| T4 | Anthropic SDK `timeout` 60초 (단일 레이어) | SDK 내장, side-effect 안전, 지배적 지연 원인 해소 |
| T5 | Jest + @nestjs/testing + supertest | NestJS 공식 E2E 테스트 패턴 |
| T6 | 양쪽 .env.example (루트 + 앱) | 기존 usc-worker 패턴 일관 |
| T7 | 온체인 검증 후 SoT 통일 | 안전한 canonical 확립 |

---

## 범위 / 비범위

**범위 (In Scope)**:
- `apps/agent-server/` 내부 모듈 추가/수정 (DB, 로깅, throttler)
- `packages/agent-runtime/src/runtime.ts` — `run()` 시그니처에 `runId` 파라미터 추가 (내부 생성 → 외부 주입)
- `packages/agent-runtime/src/planner/anthropic-planner.ts` timeout 1줄 추가
- `packages/core/src/config/addresses.ts` 주소 동기화
- `packages/liquity/deployments/addresses-102031.json` 주소 동기화
- 루트 + 앱 `.env.example` 업데이트
- E2E 테스트 파일 신규 생성

**비범위 (Out of Scope)**:
- Agent Runtime 핵심 파이프라인 로직 변경 (Observe→Plan→Execute). 단, `run()` 시그니처에 `runId` 파라미터 추가는 범위 내
- 프론트엔드 UI 컴포넌트/페이지 변경
- PostgreSQL 마이그레이션, Prometheus/Grafana, BullMQ, KMS

---

## 아키텍처 개요

```
apps/agent-server/ (변경)
├── src/
│   ├── database/                          ← 신규
│   │   ├── database.module.ts             (Global SQLite 모듈)
│   │   └── database.service.ts            (better-sqlite3 + WAL)
│   ├── agent/
│   │   ├── agent.service.ts               ← 수정 (SQLite + timeout)
│   │   ├── agent.controller.ts            ← 수정 (@Throttle)
│   │   ├── agent.module.ts                ← 수정 (RunStoreService DI)
│   │   └── run-store.service.ts           ← 신규 (insert/query 전담)
│   ├── common/
│   │   └── logger/
│   │       └── winston.config.ts          ← 신규
│   ├── main.ts                            ← 수정 (winston 초기화)
│   └── app.module.ts                      ← 수정 (DB + Throttler + Winston)
├── test/
│   └── agent.e2e-spec.ts                  ← 신규
├── data/                                  ← 신규 (SQLite DB 파일)
├── logs/                                  ← 신규 (로그 파일)
└── .env.example                           ← 신규

packages/agent-runtime/ (최소 변경)
└── src/
    ├── runtime.ts                         ← 수정 (run() 시그니처: runId 외부 주입)
    └── planner/
        └── anthropic-planner.ts           ← 수정 (timeout 1줄)
```

---

## 데이터 모델

### agent_runs 테이블

```sql
CREATE TABLE IF NOT EXISTS agent_runs (
  run_id TEXT PRIMARY KEY,
  user_address TEXT NOT NULL,
  manifest_id TEXT NOT NULL,
  status TEXT NOT NULL,          -- 'started'|'success'|'no_action'|'error'|'aborted'
  plan_json TEXT,                -- JSON (bigint → string 변환)
  tx_hashes TEXT NOT NULL,       -- JSON array
  logs TEXT NOT NULL,            -- JSON array
  errors TEXT NOT NULL,          -- JSON array
  reasoning TEXT,
  created_at INTEGER NOT NULL    -- epoch ms
);

CREATE INDEX IF NOT EXISTS idx_runs_user ON agent_runs(user_address);
CREATE INDEX IF NOT EXISTS idx_runs_created ON agent_runs(created_at DESC);
```

**bigint 직렬화**: `plan_json` 저장 시 `JSON.stringify(plan, (k, v) => typeof v === 'bigint' ? v.toString() : v)` 사용. 조회 시 opaque JSON으로 취급.

---

## 테스트 전략

**레벨**: E2E (HTTP 레벨)
**프레임워크**: Jest + @nestjs/testing + supertest
**격리**: SQLite 임시 파일 DB (persistence 검증용), AgentRuntime mock (DI provider override)

**테스트 시나리오**:

| # | 시나리오 | 기대 결과 |
|---|---------|----------|
| 1 | POST /agent/run 정상 실행 | 200 + RunResult |
| 2 | POST /agent/run API key 누락 | 401 |
| 3 | POST /agent/run 동일 user 동시 실행 | 409 |
| 4 | GET /agent/runs user 필터 | 해당 유저 이력만 반환 |
| 5 | GET /agent/runs/:id 단건 조회 | 200 또는 404 |
| 6 | GET /agent/status 서버 상태 | uptime + totalRuns |
| 7 | POST /agent/run 11회 연속 호출 | 10회 후 429 |
| 8 | 서버 재시작 후 GET /agent/runs | 이전 이력 유지 (임시 파일 DB 사용하여 persistence 검증) |
| 9 | runtime.run() 예외 발생 시 DB 상태 | started 레코드 존재 + status='error'로 update됨 |

---

## 구현 순서 (의존성 기반)

```
Step 1: 문제 7 (SoT 드리프트) — 다른 작업 전에 주소 확정
  ↓
Step 2: 문제 6 (환경변수 템플릿) — 개발 시작 전 env 정비
  ↓
Step 3: 문제 1 (SQLite 영속화) — 서비스 기반 변경, 후속 작업의 기초
  ↓
Step 4: 문제 2 (winston 로깅) — Step 3과 독립적이나 디버깅에 유용
  ↓
Step 5: 문제 4 (Timeout) — agent-runtime + agent-server 수정
  ↓
Step 6: 문제 3 (Rate limiting) — 단독 모듈 추가
  ↓
Step 7: 문제 5 (E2E 테스트) — 모든 인프라 완성 후 통합 검증
```

Step 3/4는 독립적이므로 병렬 가능. Step 5/6도 마찬가지.

---

## 의존성 추가

`apps/agent-server/package.json`:

```json
{
  "dependencies": {
    "better-sqlite3": "^11.8.1",
    "@nestjs/throttler": "^6.0.0",
    "winston": "^3.17.0",
    "nest-winston": "^1.10.2",
    "winston-daily-rotate-file": "^5.0.0"
  },
  "devDependencies": {
    "@types/better-sqlite3": "^7.6.12",
    "@nestjs/testing": "^11.0.0",
    "jest": "^29.7.0",
    "@types/jest": "^29.5.0",
    "ts-jest": "^29.2.0",
    "supertest": "^7.0.0",
    "@types/supertest": "^6.0.0"
  }
}
```

---

## 실패/에러 처리

- **Phase 1 (pre-insert) 실패**: runtime 실행 자체를 거부. `500 Internal Server Error` 반환. on-chain side-effect 없음 (**fail-closed**)
- **Phase 2 (terminal update) 실패**: fallback update 시도 (`status='error'`). 성공하면 정상 흐름 복귀. fallback도 실패하면 started 레코드가 남고 `500 Internal Server Error` 반환. winston error 로그에 RunResult 전문 기록. 서버 재시작 시 crash recovery로 started→error 전환
- **Claude API timeout (60초)**: Anthropic SDK가 `APIConnectionTimeoutError`를 throw → `runtime.run()` catch 블록에서 `RunResult { status: 'error' }` 반환 → DB에 error 상태로 update → 정상 응답
- **온체인 검증 실패**: 양쪽 주소 모두 무응답 시, 재배포 경로(대안 C)로 전환. 이 결정은 Step 실행 시 판단

## 롤아웃/롤백 계획

- **롤아웃**: 7개 Step 순차 진행. 각 Step 완료 시 커밋. 빌드 검증 후 다음 진행
- **롤백**: 각 Step이 독립적이므로 git revert로 개별 롤백 가능
- **SoT 드리프트 롤백**: 주소 변경 전 현재 값을 `deploy-history.md`에 기록해두어, 문제 시 원복 가능
- **Feature flag**: 불필요. 모든 변경이 인프라 래핑이며 기존 API 계약 변경 없음

## 관측성

- **로그 파일**: `logs/agent-YYYY-MM-DD.log` (전체), `logs/error-YYYY-MM-DD.log` (에러만)
- **보존 기간**: 14일, maxSize 20MB/파일
- **로그 포맷**: JSON (timestamp, level, context, message)
- **모니터링 대시보드**: N/A — PRD에서 범위 밖으로 명시. 로그 파일 기반 수동 분석

## 보안/권한

- **API Key 인증**: 기존 `ApiKeyGuard` 유지. 변경 없음
- **Rate limiting**: `@nestjs/throttler`로 brute force / 비용 폭탄 방지
- **Private Key**: 환경변수 주입 유지. KMS 연동은 PRD 비목표
- **SQLite DB 파일**: `data/` 디렉토리에 저장. `.gitignore`에 추가하여 소스코드에 포함되지 않음
- **로그 파일 민감 정보**: 로그에 private key나 API key가 포함되지 않도록 주의. winston format에서 `AGENT_PRIVATE_KEY`, `ANTHROPIC_API_KEY` 패턴 필터링은 이번 범위에서 미구현 (수동 주의)

## 성능/스케일

- **SQLite WAL 모드**: read/write 병행 가능. 단일 서버에서 충분한 성능
- **Rate limit**: POST /agent/run 10/분, 기타 60/분. Claude API 비용 보호가 주목적
- **E2E 테스트 실행 시간**: mock 기반이므로 10초 이내 목표
- **스케일 아웃**: N/A — 단일 서버 전제. 분산 환경은 다음 Phase

## API/인터페이스 계약

기존 HTTP API 계약은 **변경하지 않음**:
- `POST /agent/run` — 요청/응답 스키마 동일
- `GET /agent/runs` — 응답 스키마 동일
- `GET /agent/runs/:id` — 응답 스키마 동일
- `GET /agent/status` — 응답 스키마 동일
- `GET /agent/manifests` — 응답 스키마 동일

유일한 변경: Rate limit 초과 시 `429 Too Many Requests` 응답 추가 (기존에 없던 HTTP status code)

---

## 가정/제약

- 단일 서버 환경: rate limit in-memory, SQLite 파일 DB 모두 단일 프로세스 전제
- better-sqlite3 네이티브 빌드: Apple Silicon에서 이미 검증됨 (apps/server에서 사용 중)
- SDK timeout과 RPC 지연: Anthropic SDK timeout은 Claude 호출만 보호. RPC/온체인 tx 지연은 이번 범위에서 미보호. 향후 AbortController 통합으로 전체 파이프라인 보호 예정 (별도 Phase)
- runtime 계약 변경 범위: `run()` 시그니처에 `runId: string` 파라미터 추가 + 내부 UUID 생성 제거만 수행. Observe→Plan→Execute 파이프라인 로직은 변경하지 않음
- Throttler와 Cron 무관: `@nestjs/throttler`는 HTTP 요청에만 적용. SchedulerService의 내부 호출은 rate limit 영향 없음 (의도된 동작)

---

## 리스크/오픈 이슈

| # | 리스크 | 영향 | 완화 방안 |
|---|--------|------|----------|
| R1 | bigint 직렬화 누락 | SQLite 저장 시 TypeError | custom replacer 함수 적용, 테스트에서 bigint 포함 케이스 검증 |
| R2 | SDK timeout이 RPC 지연 미보호 | Claude 호출 외 지연(RPC, tx 대기)은 timeout 미적용 | 지배적 지연 원인(Claude API)을 먼저 해소. RPC 지연 보호는 별도 Phase에서 AbortController 통합 |
| R3 | 온체인 검증 시 양쪽 주소 모두 무응답 | canonical 확정 불가 | 재배포 경로로 전환 (대안 C) |
| R4 | logs/, data/ 디렉토리 git 포함 | 불필요한 파일 커밋 | .gitignore 업데이트 |
