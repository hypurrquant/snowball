# Step 01: liquity.ts ABI 교정 + borrow/page.tsx 동기화

## 메타데이터
- **난이도**: 🟠 중간
- **롤백 가능**: ✅ (`git checkout -- apps/web/src/abis/liquity.ts apps/web/src/app/\(defi\)/borrow/page.tsx`)
- **선행 조건**: 없음

---

## 1. 구현 내용 (design.md 기반)

### liquity.ts 수정

| 조치 | 대상 | 변경 내용 |
|------|------|----------|
| 수정 | `TroveManagerABI` | `getEntireSystemColl` → `getEntireBranchColl` |
| 수정 | `TroveManagerABI` | `getEntireSystemDebt` → `getEntireBranchDebt` |
| 삭제 | `TroveManagerABI` | `getTroveEntireColl`, `getTroveEntireDebt`, `getTCR` |
| 수정 | `TroveManagerABI` | `getTroveStatus` 반환 타입 `uint256` → `uint8` |
| 추가 | `TroveManagerABI` | `getLatestTroveData(uint256) → LatestTroveData` struct (tuple components) |
| 추가 | `TroveManagerABI` | `getCurrentICR(uint256,uint256)`, `getTroveIdsCount()`, `getTroveFromTroveIdsArray(uint256)` |
| 삭제 | `BorrowerOperationsABI` | `MIN_ANNUAL_INTEREST_RATE`, `MAX_ANNUAL_INTEREST_RATE` |
| 수정 | `MockPriceFeedABI` | `getPrice` → `lastGoodPrice` (view, returns uint256) |
| 삭제 | `TroveNFTABI` | `tokenOfOwnerByIndex` |
| 추가 | `StabilityPoolABI` | `getDepositorYieldGain(address)`, `getDepositorYieldGainWithPending(address)` |

### borrow/page.tsx 동기화

| 변경 | 내용 |
|------|------|
| 함수명 | `getEntireSystemColl` → `getEntireBranchColl` |
| 함수명 | `getEntireSystemDebt` → `getEntireBranchDebt` |
| 함수명 | `getPrice` → `lastGoodPrice` |
| Dead import | `ActivePoolABI` import 제거 |

### LatestTroveData struct 정의

`packages/liquity/contracts/src/Types.sol`에서 struct 참조:

```solidity
struct LatestTroveData {
    uint256 entireDebt;
    uint256 entireColl;
    uint256 redistBoldDebtGain;
    uint256 redistCollGain;
    uint256 accruedInterest;
    uint256 recordedDebt;
    uint256 annualInterestRate;
    uint256 weightedRecordedDebt;
    uint256 accruedBatchManagementFee;
    uint256 lastInterestRateAdjTime;
}
```

## 2. 완료 조건

- [ ] `liquity.ts`의 `TroveManagerABI`에 `getEntireBranchColl(view, returns uint256)` 존재
- [ ] `liquity.ts`의 `TroveManagerABI`에 `getEntireBranchDebt(view, returns uint256)` 존재
- [ ] `liquity.ts`의 `TroveManagerABI`에 `getEntireSystemColl`, `getEntireSystemDebt` 없음
- [ ] `liquity.ts`의 `TroveManagerABI`에 `getTroveEntireColl`, `getTroveEntireDebt`, `getTCR` 없음
- [ ] `liquity.ts`의 `TroveManagerABI`에 `getTroveStatus` 반환 타입이 `uint8`
- [ ] `liquity.ts`의 `TroveManagerABI`에 `getLatestTroveData(uint256)` 존재, tuple components 10개
- [ ] `liquity.ts`의 `TroveManagerABI`에 `getCurrentICR`, `getTroveIdsCount`, `getTroveFromTroveIdsArray` 존재
- [ ] `liquity.ts`의 `BorrowerOperationsABI`에 `MIN_ANNUAL_INTEREST_RATE`, `MAX_ANNUAL_INTEREST_RATE` 없음
- [ ] `liquity.ts`의 `MockPriceFeedABI`에 `lastGoodPrice(view, returns uint256)` 존재
- [ ] `liquity.ts`의 `MockPriceFeedABI`에 `getPrice` 없음
- [ ] `liquity.ts`의 `TroveNFTABI`에 `tokenOfOwnerByIndex` 없음
- [ ] `liquity.ts`의 `StabilityPoolABI`에 `getDepositorYieldGain`, `getDepositorYieldGainWithPending` 존재
- [ ] `borrow/page.tsx`에서 `getEntireBranchColl` 호출
- [ ] `borrow/page.tsx`에서 `getEntireBranchDebt` 호출
- [ ] `borrow/page.tsx`에서 `lastGoodPrice` 호출
- [ ] `borrow/page.tsx`에 `ActivePoolABI` import 없음

## 3. 롤백 방법
- `git checkout -- apps/web/src/abis/liquity.ts apps/web/src/app/\(defi\)/borrow/page.tsx`
- 영향 범위: Borrow 페이지만

---

## Scope

### 수정 대상 파일
```
apps/web/src/
├── abis/liquity.ts         # 수정 - ABI 교정 (6개 수정 + 5개 추가 + 5개 삭제)
└── app/(defi)/borrow/page.tsx  # 수정 - 함수명 3개 변경 + dead import 1개 제거
```

### 참조 파일 (읽기 전용)
```
packages/liquity/contracts/src/
├── TroveManager.sol        # getEntireBranchColl/Debt, getLatestTroveData 등 시그니처 확인
├── BorrowerOperations.sol  # MIN/MAX_ANNUAL_INTEREST_RATE 삭제 확인
├── MockPriceFeed.sol       # lastGoodPrice 시그니처 확인
├── TroveNFT.sol            # tokenOfOwnerByIndex 부재 확인
├── StabilityPool.sol       # getDepositorYieldGain 시그니처 확인
└── Types.sol               # LatestTroveData struct 필드 순서
```

### Side Effect 위험
- `getLatestTroveData` struct 필드 순서가 Solidity 정의와 다르면 디코딩 실패 → Types.sol 직접 참조

## FP/FN 검증

### False Positive (과잉)
| Scope 항목 | 구현 내용 근거 | 판정 |
|-----------|---------------|------|
| liquity.ts | design.md liquity.ts 섹션 | ✅ OK |
| borrow/page.tsx | design.md 호출부 동기화 | ✅ OK |

### False Negative (누락)
| 구현 내용 | Scope 포함 | 판정 |
|----------|-----------|------|
| TroveManager 함수 수정 | ✅ liquity.ts | OK |
| borrow 함수명 동기화 | ✅ borrow/page.tsx | OK |
| ActivePoolABI dead import | ✅ borrow/page.tsx | OK |

### 검증 통과: ✅

---

→ 다음: [Step 02: lend.ts ABI 교정](step-02-lend-abi.md)
