# Step 09: agent-server NestJS 서버

## 메타데이터
- **난이도**: 🔴 어려움
- **롤백 가능**: ✅ (디렉토리 삭제)
- **선행 조건**: Step 07 (Runtime 오케스트레이터)
- **DoD 매핑**: F15~F23, N2

---

## 1. 구현 내용 (design.md 기반)

- `packages/agent-server/` 패키지 생성 (NestJS 앱)
  - `src/main.ts` — NestJS bootstrap (port 3001)
  - `src/app.module.ts` — root module
  - `src/agent/agent.module.ts` — AgentModule
  - `src/agent/agent.controller.ts` — REST API endpoints:
    - `POST /agent/run` — 에이전트 1회 실행 → `{ runId, status, plan, txHashes }`
    - `GET /agent/runs` — `?user=0x...&limit=20` 실행 이력
    - `GET /agent/runs/:id` — 특정 실행 상세
    - `GET /agent/status` — 서버 상태 (uptime, lastRun)
    - `GET /agent/manifests` — manifest 목록
  - `src/agent/agent.service.ts` — agent-runtime inject + 실행 관리
    - in-memory 실행 이력 저장
    - 동일 user+manifest 동시 실행 방지 (409)
  - `src/agent/dto/` — request/response DTO
  - `src/scheduler/scheduler.module.ts` + `scheduler.service.ts` — @Cron 자동 실행
  - `src/common/guards/api-key.guard.ts` — X-API-Key 인증
  - `src/common/filters/` — exception filter

## 2. 완료 조건

- [ ] `packages/agent-server/tsconfig.json`에 `"strict": true` 설정 (N2)
- [ ] `npm run start` (또는 `npx ts-node src/main.ts`)로 서버 시작 성공 (F15)
- [ ] `POST /agent/run` — `{ user, manifestId }` → `{ runId, status, plan, txHashes }` (F16)
- [ ] `GET /agent/runs?user=0x...&limit=20` → `RunResult[]` (F17)
- [ ] `GET /agent/runs/:id` → 단일 `RunResult` (F18)
- [ ] `GET /agent/status` → `{ uptime, lastRun }` (F19)
- [ ] `GET /agent/manifests` → `AgentManifest[]` (F20)
- [ ] `X-API-Key` 없는 요청 → 401 (F21)
- [ ] `@Cron` 스케줄러 동작 (서버 로그에 cron 실행 기록) (F22)
- [ ] 동일 user+manifest 동시 실행 → 409 (F23)
- [ ] `cd packages/agent-server && npx tsc --noEmit` 통과

## 3. 롤백 방법
- `rm -rf packages/agent-server` + workspace 등록 제거

---

## Scope

### 신규 생성 파일
```
packages/agent-server/
├── package.json                   # 신규
├── tsconfig.json                  # 신규 — strict: true
├── nest-cli.json                  # 신규
└── src/
    ├── main.ts                    # NestJS bootstrap
    ├── app.module.ts              # root module
    ├── agent/
    │   ├── agent.module.ts
    │   ├── agent.controller.ts    # 5개 엔드포인트
    │   ├── agent.service.ts       # runtime inject + 실행 관리
    │   └── dto/
    │       ├── run-agent.dto.ts
    │       └── agent-status.dto.ts
    ├── scheduler/
    │   ├── scheduler.module.ts
    │   └── scheduler.service.ts
    └── common/
        ├── guards/api-key.guard.ts
        └── filters/http-exception.filter.ts
```

### 수정 대상 파일
```
pnpm-workspace.yaml   # 수정 — packages/agent-server 등록
```

### 의존성 분석
| 모듈 | 영향 유형 | 설명 |
|------|----------|------|
| @snowball/agent-runtime | 직접 import | AgentRuntime, RunResult |
| @nestjs/core, @nestjs/common | 프레임워크 | NestJS |
| @nestjs/schedule | 라이브러리 | cron |

### 참고할 기존 패턴
- NestJS 공식 starter 구조

## FP/FN 검증

### 검증 체크리스트
- [x] F15~F23 — 서버 bootstrap, 5개 API, guard, cron, 409
- [x] N2 — strict: true + tsc
- [x] workspace 등록

### 검증 통과: ✅

---

> 다음: [Step 10: FE ABI 보충](step-10-fe-abi.md)
