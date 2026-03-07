# Step 03: ABI 업데이트 (3곳)

## 메타데이터
- **난이도**: 🟡 보통
- **롤백 가능**: ✅
- **선행 조건**: Step 01

---

## 1. 구현 내용 (design.md 기반)
- packages/core/src/abis/agent.ts: AgentVaultABI 전면 교체 (새 struct/함수/이벤트)
- packages/agent-runtime/src/abis.ts: AgentVaultABI 전면 교체
- packages/shared/src/abis/erc8004.ts: AgentVaultABI 전면 교체 (ABI drift 방지)

## 2. 완료 조건
- [ ] F15: core/abis/agent.ts ABI가 Solidity 시그니처와 일치
- [ ] F16: agent-runtime/abis.ts ABI가 Solidity 시그니처와 일치
- [ ] F17: shared/abis/erc8004.ts ABI가 Solidity 시그니처와 일치

## 3. 롤백 방법
- git restore로 파일 복원

---

## Scope

### 수정 대상 파일
```
packages/core/src/abis/agent.ts           # 전면 교체
packages/agent-runtime/src/abis.ts        # 전면 교체
packages/shared/src/abis/erc8004.ts       # AgentVaultABI 교체
```

### Side Effect 위험
- ABI 변경 후 해당 ABI를 import하는 모든 파일에서 타입 에러 발생 → Step 04~06에서 해결

## FP/FN 검증

### False Positive (과잉)
| Scope 항목 | 포함 근거 | 판정 |
|-----------|----------|------|
| packages/core/src/abis/agent.ts | F15 — 프론트엔드용 ABI | ✅ OK |
| packages/agent-runtime/src/abis.ts | F16 — runtime용 ABI | ✅ OK |
| packages/shared/src/abis/erc8004.ts | F17 — shared ABI drift 방지 | ✅ OK |

### False Negative (누락)
| 후보 파일 | 제외 근거 | 판정 |
|----------|----------|------|
| (AgentVaultABI를 import하는 파일들) | ABI 소비자는 Step 04/06에서 처리 — 이 step은 ABI 정의만 교체 | ✅ 제외 OK |

### 검증 통과: ✅

---

→ 다음: [Step 04: agent-runtime 수정](step-04-runtime.md)
