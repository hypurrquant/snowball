# Step 07: AgentRuntime 오케스트레이터 + Manifest + Prompt

## 메타데이터
- **난이도**: 🟡 보통
- **롤백 가능**: ✅ (파일 삭제)
- **선행 조건**: Step 02~06 (Registry, Observer, Capabilities, Planner, Executor)
- **DoD 매핑**: F13, F14, E3, E10

---

## 1. 구현 내용 (design.md 기반)

- `src/runtime.ts` — `AgentRuntime` 클래스
  - `run(manifest, user)` 메서드: Observer → Planner → Executor 오케스트레이션
  - manifest 로드 + registry 초기화
  - empty plan (steps: []) → no_action 로그 + 정상 종료
  - `RunResult` 반환 (plan, txHashes, logs, reasoning)
- `registry.ts`에 `buildDemoRegistry()` 팩토리 추가
  - Step 04에서 구현한 4개 capability를 등록하는 편의 함수
  - registry 자체는 Step 02에서 생성, 여기서는 capability를 조합하여 등록
- `manifests/demo-agent.json` — 데모 에이전트 manifest
  - allowedCapabilities: 4개 전체
  - maxSteps: 1, abortOnFailedPrecondition: true
  - llm.model: "claude-sonnet-4-20250514"
  - llm.systemPromptFile: "../prompts/demo-agent-system.md"
- `prompts/demo-agent-system.md` — LLM system prompt
  - DeFi 포지션 관리 에이전트 역할 정의
  - snapshot 데이터 해석 가이드
  - 보수적 의사결정 원칙

## 2. 완료 조건

- [ ] `runtime.ts`에 `AgentRuntime` 클래스가 export되고 `run(manifest, user)` 메서드 존재
- [ ] Observer → Planner → Executor 순서로 호출
- [ ] empty plan → no_action 로그 + 정상 종료 (E3 부분적)
- [ ] `manifests/demo-agent.json`이 유효한 JSON이고 `allowedCapabilities`, `maxSteps: 1`, `riskPolicy` 포함 (F13)
- [ ] `prompts/demo-agent-system.md`가 존재하고 에이전트 역할 정의 (F14)
- [ ] `tsc --noEmit` 통과

## 3. 롤백 방법
- `src/runtime.ts`, `manifests/`, `prompts/` 삭제

---

## Scope

### 신규 생성 파일
```
packages/agent-runtime/
├── src/runtime.ts                    # 신규 — AgentRuntime 오케스트레이터
├── manifests/demo-agent.json         # 신규 — 데모 에이전트 manifest
└── prompts/demo-agent-system.md      # 신규 — LLM system prompt
```

### 수정 대상 파일
```
packages/agent-runtime/src/
└── registry.ts                       # 수정 — buildDemoRegistry() 팩토리 추가
```

### 의존성 분석
| 모듈 | 영향 유형 | 설명 |
|------|----------|------|
| registry.ts | 수정 | buildDemoRegistry() 추가 |
| observers/build-snapshot.ts | 직접 import | buildSnapshot() |
| planner/anthropic-planner.ts | 직접 import | plan() |
| executor/execute-plan.ts | 직접 import | executePlan() |
| config.ts | 직접 import | 환경변수, 주소 |

## FP/FN 검증

### 검증 체크리스트
- [x] runtime.ts — Observer→Planner→Executor 오케스트레이션
- [x] demo-agent.json — F13 manifest
- [x] demo-agent-system.md — F14 system prompt
- [x] empty plan 처리 — E3 (no_action)
- [x] maxSteps — E10 (첫 N개만)

### 검증 통과: ✅

---

> 다음: [Step 08: CLI 엔트리](step-08-cli-entry.md)
