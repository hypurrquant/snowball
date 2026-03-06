# Step 05: Planner — Claude API tool use

## 메타데이터
- **난이도**: 🔴 어려움
- **롤백 가능**: ✅ (파일 삭제)
- **선행 조건**: Step 02 (Registry, ToolMapping)
- **DoD 매핑**: F9, F10, E6

---

## 1. 구현 내용 (design.md 기반)

- `src/planner/anthropic-planner.ts` — Claude API 호출 → StrategyPlan 반환
  - `registry.listExecutable(manifest, snapshot)`로 현재 permission 기반 capability 필터링
  - `buildAnthropicTools(executableCaps)`로 Claude tools[] 생성
  - `@anthropic-ai/sdk`로 Claude API messages.create 호출 (system prompt + tools + snapshot 상태)
  - Claude 응답에서 `tool_use` content block 추출 → `StrategyPlan { steps[] }` 반환
  - tool 미선택 시 `steps: []` (no action)
  - `maxSteps` 적용: manifest.scope.maxSteps 개수만큼만 step 채택 (초과분 무시)
  - **unknown tool 처리**: `toolToCapability.get()` undefined 시 해당 step 무시 + 경고 로그
- `planner.test.ts` — unknown tool name 분기 단위 테스트
  - mock Claude 응답에 존재하지 않는 tool name 포함 → step이 무시되고 경고 로그 출력 검증

## 2. 완료 조건

- [ ] `anthropic-planner.ts`가 `plan(snapshot, manifest, registry)` 함수를 export
- [ ] `listExecutable()`로 필터링된 capability만 Claude에 노출 (F9)
- [ ] Claude 응답의 `tool_use` block → `StrategyPlan` 변환 동작 (F10)
- [ ] tool 미선택 시 `steps: []` 반환
- [ ] `maxSteps` 초과 시 첫 N개만 채택
- [ ] unknown tool name → step 무시 + 경고 로그 (E6)
- [ ] `planner.test.ts` 존재 + unknown tool 분기 테스트 통과
- [ ] `@anthropic-ai/sdk` 의존이 `planner/` 디렉토리에만 존재 (N6)
- [ ] `tsc --noEmit` 통과

## 3. 롤백 방법
- `src/planner/anthropic-planner.ts`, `src/planner/planner.test.ts` 삭제

---

## Scope

### 신규 생성 파일
```
packages/agent-runtime/src/planner/
├── anthropic-planner.ts    # 신규 — Claude API 호출 → StrategyPlan
└── planner.test.ts         # 신규 — unknown tool 분기 단위 테스트
```

### 의존성 분석
| 모듈 | 영향 유형 | 설명 |
|------|----------|------|
| anthropic-tools.ts | 직접 import | buildAnthropicTools, ToolMapping |
| registry.ts | 직접 import | listExecutable() |
| @anthropic-ai/sdk | 외부 의존 | Claude API client |
| types.ts | 직접 import | StrategyPlan, PlanStep |

### 참고할 기존 패턴
- `@anthropic-ai/sdk` messages.create 공식 문서

### Side Effect 위험
- ANTHROPIC_API_KEY 미설정 시 런타임 에러 → config.ts에서 early validation
- Claude API 응답 구조 변경 시 파싱 실패 → tool_use block 추출 로직 방어적으로 구현

## FP/FN 검증

### 검증 체크리스트
- [x] anthropic-planner.ts — F9 (listExecutable 필터), F10 (StrategyPlan), E1 (에러 처리)
- [x] planner.test.ts — E6 (unknown tool 단위 테스트)
- [x] N6 확인 — @anthropic-ai/sdk import가 planner/ 내에만

### 검증 통과: ✅

---

> 다음: [Step 06: Executor — precondition + tx 실행](step-06-executor.md)
