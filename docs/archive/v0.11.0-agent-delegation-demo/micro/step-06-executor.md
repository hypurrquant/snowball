# Step 06: Executor — precondition 검증 + tx 실행

## 메타데이터
- **난이도**: 🟠 중간
- **롤백 가능**: ✅ (파일 삭제)
- **선행 조건**: Step 01 (타입), Step 04 (Capabilities)
- **DoD 매핑**: F12, E2, E4, E5, E9

---

## 1. 구현 내용 (design.md 기반)

- `src/executor/execute-plan.ts` — plan 실행 로직
  - 각 PlanStep에 대해:
    1. `capability.preconditions(ctx, input)` → CheckResult[] 검증
    2. `abortOnFailedPrecondition: true` → 하나라도 실패 시 run 전체 중단 + 경고
    3. `capability.buildCalls(ctx, input)` → PreparedCall[]
    4. 순차 tx 전송 (`walletClient.writeContract`)
    5. 중간 tx revert 시 이후 call 중단 + revert reason 출력
    6. step 완료 후 snapshot refresh (다음 step 대비)
  - 최종 `RunResult` 반환: plan, txHashes, logs, errors

## 2. 완료 조건

- [ ] `execute-plan.ts`가 `executePlan(plan, ctx, registry, manifest)` 함수를 export
- [ ] precondition 실패 + `abortOnFailedPrecondition: true` → run 전체 중단 (E2, E4, E5)
- [ ] `buildCalls()` → PreparedCall[]을 순차 전송
- [ ] 중간 tx revert 시 이후 call 중단 + revert reason 출력 (E9)
- [ ] step 완료 후 snapshot refresh 동작
- [ ] `RunResult` 타입에 txHashes, logs, errors 포함
- [ ] `tsc --noEmit` 통과

## 3. 롤백 방법
- `src/executor/` 디렉토리 삭제

---

## Scope

### 신규 생성 파일
```
packages/agent-runtime/src/executor/
└── execute-plan.ts         # 신규 — plan 실행 로직
```

### 의존성 분석
| 모듈 | 영향 유형 | 설명 |
|------|----------|------|
| types.ts | 직접 import | PreparedCall, ExecutionContext, RunResult |
| registry.ts | 직접 import | capability 조회 (preconditions, buildCalls) |
| observers/build-snapshot.ts | 직접 import | step 완료 후 snapshot refresh |
| viem | 외부 의존 | walletClient.writeContract |

### 참고할 기존 패턴
- `packages/integration/scripts/deploy-viem.ts` — viem writeContract 패턴

## FP/FN 검증

### 검증 체크리스트
- [x] execute-plan.ts — F12 (tx 실행), E2/E4/E5 (precondition abort), E9 (mid-revert)
- [x] snapshot refresh — step 간 상태 갱신

### 검증 통과: ✅

---

> 다음: [Step 07: AgentRuntime + Manifest + Prompt](step-07-runtime-orchestrator.md)
