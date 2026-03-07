# Step 03: SQLite 영속화 + 2-Phase Write + DI 리팩토링

## 메타데이터
- **난이도**: 🔴 어려움
- **롤백 가능**: 가능 (git revert + data/ 삭제)
- **선행 조건**: Step 02 (환경변수 정비)

---

## 1. 구현 내용 (design.md 기반)

### DB 인프라
- `database.module.ts` + `database.service.ts` (Global SQLite, WAL 모드)
- `apps/server/src/database/database.service.ts` 패턴 복제
- crash recovery: `onModuleInit()`에서 `UPDATE agent_runs SET status='error' WHERE status='started'`

### Run Store
- `run-store.service.ts`: insert(started), update(terminal), findByUser, findById
- bigint custom replacer 적용
- GET /agent/runs에서 status='started' → 'error' 매핑

### 2-Phase Write
- `agent.service.ts` 수정: runId 외부 생성(crypto.randomUUID) → pre-insert(started) → runtime.run(runId) → terminal update
- Phase 2 실패 시 fallback update(status='error') 시도

### DI 리팩토링
- `agent.module.ts`에 AgentRuntime provider 등록
- `agent.service.ts`에서 @Inject('AGENT_RUNTIME') 전환

### Runtime 계약 변경
- `packages/agent-runtime/src/runtime.ts`: run() 시그니처에 runId 파라미터 추가, 내부 UUID 생성 제거

### 기타
- `app.module.ts`에 DatabaseModule import
- `.gitignore`에 `data/` 추가

## 2. 완료 조건
- [ ] (F1) 서버 시작 시 `data/agent.db` 생성 + `agent_runs` 테이블 존재
- [ ] (F2) POST /agent/run 호출 시 runtime 실행 전 started 레코드가 DB에 삽입됨
- [ ] (F3) runtime 완료 후 terminal status로 업데이트됨
- [ ] (F4) 서버 재시작 후 GET /agent/runs로 이전 이력 조회 가능
- [ ] (F5) GET /agent/runs?user=0x... 필터링 동작
- [ ] (F6) GET /agent/runs/:id 단건 조회 (200/404)
- [ ] (F18) AgentRuntime이 DI provider로 등록되어 있음
- [ ] (N4) 기존 HTTP API 계약 변경 없음 (POST /agent/run, GET /agent/runs 요청/응답 스키마 동일)
- [ ] (N5) runtime.run(runId) 시그니처 변경 + tsc 빌드 통과
- [ ] (N3) data/ 디렉토리가 .gitignore에 포함
- [ ] (E3) 서버 시작 시 started → error crash recovery 실행
- [ ] (E4) GET /agent/runs에서 status='started' 레코드가 'error'로 매핑되어 반환됨
- [ ] (E5) bigint 포함 RunResult가 custom replacer로 DB에 정상 저장됨 (TypeError 미발생)
- [ ] (E1) Phase 1 (pre-insert) DB 실패 시 500 반환 + runtime 미호출 (코드 리뷰: pre-insert catch → 500, runtime.run() 이전에 return)
- [ ] (E2) Phase 2 update 실패 시 fallback update(status='error') 동작
- [ ] (N1) `npx tsc --noEmit` 에러 0
- [ ] (N2) `pnpm build` 성공

## 3. 롤백 방법
- `git revert` + `rm -rf apps/agent-server/data/`
- 영향 범위: agent-server 모듈 구조, agent-runtime run() 시그니처

---

## Scope

### 수정 대상 파일
```
apps/agent-server/
├── src/
│   ├── agent/
│   │   ├── agent.service.ts               # 수정 - 2-phase write + DI inject
│   │   └── agent.module.ts                # 수정 - DI provider + RunStoreService
│   └── app.module.ts                      # 수정 - DatabaseModule import
├── package.json                           # 수정 - better-sqlite3, @types/better-sqlite3
├── .gitignore                             # 수정 - data/ 추가

packages/agent-runtime/
└── src/
    └── runtime.ts                         # 수정 - run(runId) 시그니처
```

### 신규 생성 파일
```
apps/agent-server/src/
├── database/
│   ├── database.module.ts                 # 신규 - Global SQLite 모듈
│   └── database.service.ts                # 신규 - better-sqlite3 + WAL
└── agent/
    └── run-store.service.ts               # 신규 - insert/update/query
```

### 의존성 분석
| 모듈 | 영향 유형 | 설명 |
|------|----------|------|
| agent.service | 직접 수정 | 2-phase write + DI |
| agent.module | 직접 수정 | provider 등록 |
| runtime.ts | 직접 수정 | run() 시그니처 |
| database.* | 신규 | SQLite 인프라 |
| run-store.* | 신규 | DB CRUD |

### Side Effect 위험
- runtime.run() 시그니처 변경으로 기존 호출 코드 컴파일 에러 가능 → agent.service.ts에서 새 시그니처 사용
- better-sqlite3 네이티브 빌드 실패 가능 → Apple Silicon에서 이미 검증됨 (apps/server)

### 참고할 기존 패턴
- `apps/server/src/database/database.service.ts`: better-sqlite3 + WAL + NestJS lifecycle
- `apps/agent-server/src/agent/agent.service.ts`: 현재 runtime.run() 호출 패턴

## FP/FN 검증

### False Positive (과잉)
| Scope 항목 | 구현 내용 근거 | 판정 |
|-----------|---------------|------|
| database.module/service | F1 SQLite | OK |
| run-store.service | F2-F6 CRUD | OK |
| agent.service | 2-phase write | OK |
| agent.module | DI provider | OK |
| runtime.ts | runId 외부 주입 | OK |
| app.module | DB import | OK |
| .gitignore | N3 | OK |

### False Negative (누락)
없음 (package.json은 Scope에 반영 완료)

### 검증 통과: 확인

---

> 다음: [Step 04: Winston 로깅](step-04-winston.md)
