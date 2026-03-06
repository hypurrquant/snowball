# Step 01: ABI + 주소 + 타입 기반 인프라

## 메타데이터
- **난이도**: 🟢 쉬움
- **롤백 가능**: ✅ (파일 삭제/복원)
- **선행 조건**: 없음

---

## 1. 구현 내용 (design.md 기반)
- `core/abis/agent.ts` 생성 — 컨트랙트 소스 기반 JSON ABI (4개: IdentityRegistryABI, ReputationRegistryABI, ValidationRegistryABI, AgentVaultABI)
- `core/abis/index.ts`에 agent.ts re-export 추가
- `addresses.ts`의 `ERC8004` 객체에 `agentVault` 필드 추가
- `domains/agent/types/index.ts` 생성 — AgentInfo, Review, ReputationData, Validation, Permission 타입 정의

## 2. 완료 조건
- [ ] `apps/web/src/core/abis/agent.ts` 파일 존재
- [ ] 4개 ABI가 JSON object 포맷으로 export됨
- [ ] ABI 함수 시그니처가 컨트랙트 소스와 1:1 일치 (DoD F2)
- [ ] `core/abis/index.ts`에서 `export * from "./agent"` 추가됨
- [ ] `addresses.ts`의 `ERC8004`에 `agentVault` 필드 존재 (DoD F3)
- [ ] `domains/agent/types/index.ts`에 5개 타입 정의됨
- [ ] `pnpm --filter @snowball/web exec tsc --noEmit` 에러 없음

## 3. 롤백 방법
- `git checkout -- apps/web/src/core/abis/agent.ts apps/web/src/core/abis/index.ts apps/web/src/core/config/addresses.ts`
- `rm -rf apps/web/src/domains/agent/`

---

## Scope

### 신규 생성 파일
```
apps/web/src/
├── core/abis/agent.ts              # 신규 — 4개 ABI 정의
└── domains/agent/types/index.ts    # 신규 — 타입 정의
```

### 수정 대상 파일
```
apps/web/src/
├── core/abis/index.ts              # 수정 — agent re-export 추가
└── core/config/addresses.ts        # 수정 — ERC8004.agentVault 추가
```

### 참고할 기존 패턴
- `core/abis/dex.ts`: JSON ABI 포맷 참조
- `core/abis/yield.ts`: 다중 ABI export 패턴

## FP/FN 검증

### False Positive (과잉)
| Scope 항목 | 구현 내용 근거 | 판정 |
|-----------|---------------|------|
| agent.ts | ABI 4개 정의 | ✅ OK |
| index.ts | re-export | ✅ OK |
| addresses.ts | agentVault 추가 | ✅ OK |
| types/index.ts | 타입 정의 | ✅ OK |

### False Negative (누락)
| 구현 내용 | Scope 포함 | 판정 |
|----------|-----------|------|
| 4개 ABI 작성 | ✅ agent.ts | OK |
| re-export | ✅ index.ts | OK |
| agentVault 주소 | ✅ addresses.ts | OK |
| 5개 타입 | ✅ types/index.ts | OK |

### 검증 통과: ✅

---

→ 다음: [Step 02: READ 훅](step-02-read-hooks.md)
