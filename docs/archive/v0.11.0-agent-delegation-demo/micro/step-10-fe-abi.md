# Step 10: FE ABI 보충

## 메타데이터
- **난이도**: 🟢 쉬움
- **롤백 가능**: ✅ (git checkout)
- **선행 조건**: 없음 (독립)
- **DoD 매핑**: F24, F25

---

## 1. 구현 내용 (design.md 기반)

- `apps/web/src/core/abis/liquity.ts`에 추가:
  - `setAddManager(uint256 _troveId, address _manager)`
  - `setRemoveManagerWithReceiver(uint256 _troveId, address _manager, address _receiver)`
  - `setInterestIndividualDelegate(uint256 _troveId, address _delegate, uint128 _minInterestRate, uint128 _maxInterestRate, uint256 _newAnnualInterestRate, uint256 _upperHint, uint256 _lowerHint, uint256 _maxUpfrontFee, uint256 _minInterestRateChangePeriod)`
  - `getInterestIndividualDelegateOf(uint256 _troveId)` (view)
  - `addManagerOf(uint256 _troveId)` (view)
- `apps/web/src/core/abis/lend.ts`에 추가:
  - `setAuthorization(address authorized, bool newIsAuthorized)`
  - `isAuthorized(address authorizer, address authorized)` (view)

## 2. 완료 조건

- [ ] `liquity.ts`에 5개 ABI 항목 추가 — 컨트랙트 소스(`AddRemoveManagers.sol`, `BorrowerOperations.sol`)와 1:1 대조 확인
- [ ] `lend.ts`에 2개 ABI 항목 추가 — 컨트랙트 소스(`IMorpho.sol`)와 1:1 대조 확인
- [ ] `cd apps/web && npx tsc --noEmit` 통과 (기존 코드 미파괴)

## 3. 롤백 방법
- `git checkout apps/web/src/core/abis/liquity.ts apps/web/src/core/abis/lend.ts`

---

## Scope

### 수정 대상 파일
```
apps/web/src/core/abis/
├── liquity.ts    # 수정 — 5개 ABI 추가
└── lend.ts       # 수정 — 2개 ABI 추가
```

### 참고할 기존 패턴
- `apps/web/src/core/abis/liquity.ts` — 기존 BorrowerOps ABI 형식
- `packages/liquity/contracts/src/Dependencies/AddRemoveManagers.sol` — setAddManager 소스
- `packages/morpho/src/morpho-blue/interfaces/IMorpho.sol` — setAuthorization 소스

### Side Effect 위험
- ABI 추가만이므로 기존 코드에 영향 없음

## FP/FN 검증

### 검증 체크리스트
- [x] liquity.ts — F24 (5개 ABI)
- [x] lend.ts — F25 (2개 ABI)
- [x] 컨트랙트 소스 대조 필수

### 검증 통과: ✅

---

> 다음: [Step 11: FE 훅 — Delegation](step-11-fe-hooks-delegation.md)
