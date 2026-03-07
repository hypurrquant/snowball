# Step 03: ABI 업데이트

## 메타데이터
- **난이도**: 🟢 쉬움
- **롤백 가능**: ✅
- **선행 조건**: Step 01 완료 (컨트랙트에 새 함수 추가됨)

---

## 1. 구현 내용 (design.md 기반)

### packages/core/src/abis/agent.ts
- `AgentVaultABI`에 `getDelegatedUsers` view 함수 ABI 추가

### packages/core/src/abis/liquity.ts
- `TroveNFTABI` 추가 (ERC721 `ownerOf` view 함수)
- 참고: `TroveManagerABI`에는 이미 `getTroveIdsCount`, `getTroveFromTroveIdsArray` 존재

### packages/agent-runtime/src/abis.ts
- `AgentVaultABI`에 `getDelegatedUsers` ABI 추가
- `TroveManagerABI`에 `getTroveIdsCount` ABI 추가 (이미 존재하면 확인만)
- `TroveNFTABI` export 추가 (`ownerOf`)

## 2. 완료 조건
- [ ] `packages/core/src/abis/agent.ts`의 `AgentVaultABI`에 `getDelegatedUsers` 엔트리가 있다
- [ ] `packages/core/src/abis/liquity.ts`에 `TroveNFTABI`가 export되고 `ownerOf`가 포함된다
- [ ] `packages/agent-runtime/src/abis.ts`의 `AgentVaultABI`에 `getDelegatedUsers`가 있다
- [ ] `packages/agent-runtime/src/abis.ts`에 `TroveNFTABI`가 export되고 `ownerOf`가 포함된다
- [ ] `packages/agent-runtime/src/abis.ts`의 `TroveManagerABI`에 `getTroveIdsCount`가 존재한다
- [ ] `cd packages/core && npx tsc --noEmit` 통과
- [ ] `cd packages/agent-runtime && npx tsc --noEmit` 통과

## 3. 롤백 방법
- git revert로 ABI 엔트리 제거

---

## Scope

### 수정 대상 파일
```
packages/core/src/abis/agent.ts          # 수정 - getDelegatedUsers ABI 추가
packages/core/src/abis/liquity.ts        # 수정 - TroveNFTABI 추가
packages/agent-runtime/src/abis.ts       # 수정 - getDelegatedUsers + TroveNFTABI 추가
```

### 신규 생성 파일
없음

### Side Effect 위험
- ABI 추가는 additive — 기존 코드에 영향 없음

---

## FP/FN 검증

### False Positive (과잉)
| Scope 항목 | 구현 내용 근거 | 판정 |
|-----------|---------------|------|
| core/abis/agent.ts | getDelegatedUsers ABI | ✅ OK |
| core/abis/liquity.ts | TroveNFTABI (ownerOf) | ✅ OK |
| agent-runtime/abis.ts | getDelegatedUsers + TroveNFTABI | ✅ OK |

### False Negative (누락)
| 구현 내용 | Scope 포함 | 판정 |
|----------|-----------|------|
| core getDelegatedUsers ABI | ✅ | OK |
| core TroveNFTABI | ✅ | OK |
| runtime getDelegatedUsers ABI | ✅ | OK |
| runtime TroveNFTABI | ✅ | OK |
| runtime getTroveIdsCount | ✅ 이미 존재 (확인만) | OK |

### 검증 통과: ✅

---

→ 다음: [Step 04: Config 타입 업데이트](step-04-config.md)
