# Step 01: agent-runtime 패키지 스캐폴딩

## 메타데이터
- **난이도**: 🟡 보통
- **롤백 가능**: ✅ (디렉토리 삭제)
- **선행 조건**: 없음
- **DoD 매핑**: F1, F2

---

## 1. 구현 내용 (design.md 기반)

- `packages/agent-runtime/` 패키지 생성 (package.json, tsconfig.json strict:true)
- 핵심 타입 정의 (`src/types.ts`):
  - `Capability<TInput>` — id, description, inputSchema, requiredPermissions, preconditions, buildCalls
  - `PlanStep` — capabilityId, input
  - `StrategyPlan` — goal, steps[]
  - `PreparedCall` — to, abi, functionName, args
  - `ExecutionContext` — config, user, snapshot, walletClient, publicClient
  - `Snapshot` — vault, morpho, liquity 상태
  - `CheckResult` — ok, message
  - `PermissionSpec` — target, selectors
- Config 로더 (`src/config.ts`): 환경변수 + contract addresses
- 모노레포 workspace에 패키지 등록

## 2. 완료 조건

- [ ] `packages/agent-runtime/package.json` 존재, name이 `@snowball/agent-runtime`
- [ ] `packages/agent-runtime/tsconfig.json`에 `"strict": true` 설정
- [ ] `cd packages/agent-runtime && npx tsc --noEmit` 에러 0
- [ ] `src/types.ts`에 `Capability`, `PlanStep`, `StrategyPlan`, `PreparedCall`, `ExecutionContext`, `Snapshot`, `CheckResult`, `PermissionSpec` 타입이 export됨
- [ ] `src/config.ts`에서 `AGENT_PRIVATE_KEY`, `ANTHROPIC_API_KEY` 등 환경변수를 `process.env`로 읽음
- [ ] `agent-runtime`의 `package.json`에 `@nestjs/*` 의존성 없음 (N5)

## 3. 롤백 방법
- `rm -rf packages/agent-runtime` + workspace 등록 제거

---

## Scope

### 신규 생성 파일
```
packages/agent-runtime/
├── package.json            # 신규 — @snowball/agent-runtime
├── tsconfig.json           # 신규 — strict: true
└── src/
    ├── index.ts            # 신규 — barrel export
    ├── types.ts            # 신규 — Capability, StrategyPlan, PreparedCall 등
    └── config.ts           # 신규 — env + addresses 로드
```

### 수정 대상 파일
```
pnpm-workspace.yaml         # 수정 — packages/agent-runtime 등록
```

### 참고할 기존 패턴
- `packages/integration/package.json` — 기존 패키지 구조 참고
- `apps/web/src/core/config/addresses.ts` — 컨트랙트 주소 참조

### Side Effect 위험
- pnpm-workspace.yaml 변경으로 기존 패키지 빌드에 영향 가능 → `pnpm install` 후 기존 빌드 확인

## FP/FN 검증

### False Positive (과잉)
| Scope 항목 | 구현 내용 근거 | 판정 |
|-----------|---------------|------|
| package.json | F1 패키지 존재 | ✅ OK |
| tsconfig.json | N1 strict | ✅ OK |
| types.ts | F2 타입 정의 | ✅ OK |
| config.ts | 환경변수 로드 | ✅ OK |
| pnpm-workspace.yaml | 모노레포 등록 | ✅ OK |

### False Negative (누락)
| 구현 내용 | Scope 포함 | 판정 |
|----------|-----------|------|
| .gitignore에 .env 포함 확인 | 별도 수정 불필요 (이미 있음) | ✅ OK |

### 검증 통과: ✅

---

> 다음: [Step 02: CapabilityRegistry + ToolMapping](step-02-capability-registry.md)
