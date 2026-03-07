# Step 01: Core 인프라 (defaultAgentId + ABI)

## 메타데이터
- **난이도**: 🟢 쉬움
- **롤백 가능**: ✅ (상수/ABI 추가만)
- **선행 조건**: 없음

---

## 1. 구현 내용 (design.md 기반)
- `packages/core/src/config/addresses.ts`의 `ERC8004`에 `defaultAgentId: 1n` 추가
- `packages/core/src/abis/liquity.ts`의 `InterestDelegateABI`에 `removeInterestIndividualDelegate` 추가
- `apps/web/src/core/abis/` re-export 업데이트 (필요 시)

## 2. 완료 조건
- [ ] `ERC8004.defaultAgentId`가 `1n` (BigInt)으로 설정됨
- [ ] `InterestDelegateABI`에 `removeInterestIndividualDelegate(uint256 _troveId)` entry 존재
- [ ] `npx tsc --noEmit` (apps/web) 통과

## 3. 롤백 방법
- 추가한 상수/ABI entry 삭제

---

## Scope

### 수정 대상 파일
```
packages/core/src/config/addresses.ts     # ERC8004에 defaultAgentId 추가
packages/core/src/abis/liquity.ts         # InterestDelegateABI에 함수 추가
```

### 신규 생성 파일
없음

### Side Effect 위험
- 없음. 기존 코드에 영향 없는 순수 추가

### 참고할 기존 패턴
- `packages/core/src/abis/liquity.ts`: 기존 InterestDelegateABI 배열 형태 참조
- `packages/shared/src/abis/liquity.ts:38`: `removeInterestIndividualDelegate` string ABI 존재 확인

## FP/FN 검증

### False Positive (과잉)
| Scope 항목 | 구현 내용 근거 | 판정 |
|-----------|---------------|------|
| addresses.ts | defaultAgentId 추가 | ✅ OK |
| liquity.ts (abis) | ABI 추가 | ✅ OK |

### False Negative (누락)
| 구현 내용 | Scope 포함 | 판정 |
|----------|-----------|------|
| defaultAgentId 상수 | ✅ | OK |
| removeInterestIndividualDelegate ABI | ✅ | OK |

### 검증 통과: ✅

---

→ 다음: [Step 02: Hooks 확장](step-02-hooks.md)
