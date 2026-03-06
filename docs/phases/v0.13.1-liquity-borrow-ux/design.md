# v0.13.1 Design - Liquity Borrow UX

## 개요
1기 레거시 Borrow.tsx의 UX를 현재 DDD 구조로 복원하고, 하드코딩 값을 온체인 실데이터로 교체.

## 현재 상태
- Open Trove: 텍스트 Input 3개 (collateral, debt, rate) — 미리보기 없음
- Rate: 숫자 직접 입력만 가능
- Position Summary: 없음 (CR, Liquidation Price, Upfront Fee 등)
- Redemption 리스크: 시각화 없음
- HALF/MAX/SAFE: 없음

## 설계

### 1. Slider 컴포넌트 추가
- `apps/web/src/shared/components/ui/slider.tsx`
- Radix UI Slider 기반 (프로젝트에서 이미 radix-ui 사용 중)
- shadcn/ui 스타일 유지

### 2. Open Trove 다이얼로그 리디자인

#### 2-1. Collateral Input 영역
- 기존 Input 유지
- **HALF / MAX 버튼** 추가 (useTokenBalance에서 잔액 읽음)
- 하단: `= $XX.XX USD` 실시간 환산 (price from useLiquityBranch)

#### 2-2. Borrow Amount Input 영역
- 기존 Input 유지
- **SAFE 버튼**: `(collAmount * price) / (2 * 1e18)` → 200% CR 목표
- 하단: `Max borrow: XX sbUSD` 표시 (MCR 기준)

#### 2-3. Interest Rate 슬라이더
- Radix Slider: min=0.5%, max=25%, step=0.1%
- **컬러 그라데이션 배경**: 빨강(좌, 고위험) → 노랑 → 초록(우, 저위험)
- **시장 평균 마커**: useAllTroves 데이터에서 중앙값 계산 → 수직선 표시
- **라벨**: 좌 "Higher redemption risk" ↔ 우 "Lower redemption risk"
- **연간 이자 비용**: `debt * rate` 실시간 계산 표시

#### 2-4. Position Summary 카드
- **Health Factor**: `computeCR(coll, debt, price)` → 색상 코딩 (초록 ≥200, 노랑 ≥150, 빨강 <150)
- **Liquidation Price**: `liquidationPrice(coll, debt, mcr)` from liquityMath.ts
- **7-day Upfront Fee**: `debt * (rate / 100) * (7 / 365)`
- **Annual Interest Cost**: `debt * rate`
- **MCR / CCR**: 온체인 읽기 (useLiquityBranch에서 이미 제공)

### 3. 데이터 소스 매핑

| 값 | 1기 (하드코딩) | 2기 (온체인) |
|---|---|---|
| MCR/CCR | `110/150`, `120/160` | `borrowerOperations.MCR()` / `.CCR()` — useLiquityBranch |
| Price | `usePrice` + fallback | `priceFeed.lastGoodPrice()` — useLiquityBranch |
| Balance | `useUserBalance` | `useTokenBalance` (이미 있음) |
| 시장 평균 이율 | `6.5` 하드코딩 | `useAllTroves` → 중앙값 계산 |
| Gas | `0.0005` 하드코딩 | 하드코딩 유지 (추정치) |

### 4. 새 훅: usePositionPreview

```typescript
// domains/defi/liquity/hooks/usePositionPreview.ts
function usePositionPreview(params: {
  coll: bigint;
  debt: bigint;
  rate: bigint;      // 18 decimals (5% = 5e16)
  price: bigint;     // 18 decimals
  mcr: bigint;       // 18 decimals
}) {
  return {
    cr: number;              // computeCR
    liquidationPrice: bigint; // liquidationPrice
    upfrontFee: bigint;      // debt * rate * 7 / 365
    annualCost: bigint;      // debt * rate
    maxBorrow: bigint;       // coll * price / mcr
    isAboveMCR: boolean;
    isAboveCCR: boolean;
    crColor: string;         // "text-success" | "text-yellow-400" | "text-red-400"
  }
}
```

### 5. 시장 이율 통계: useMarketRateStats

```typescript
// domains/defi/liquity/hooks/useMarketRateStats.ts
function useMarketRateStats(branch: "wCTC" | "lstCTC") {
  // useAllTroves 데이터에서 계산
  return {
    median: number;    // 중앙값 이율 (%)
    mean: number;      // 평균 이율 (%)
    min: number;       // 최저 이율 (%)
    max: number;       // 최고 이율 (%)
    count: number;     // 총 Trove 수
  }
}
```

### 6. 파일 변경 목록

| 파일 | 변경 | 설명 |
|------|------|------|
| `shared/components/ui/slider.tsx` | 신규 | Radix Slider 컴포넌트 |
| `domains/defi/liquity/hooks/usePositionPreview.ts` | 신규 | Position 미리보기 계산 |
| `domains/defi/liquity/hooks/useMarketRateStats.ts` | 신규 | 시장 이율 통계 |
| `app/(defi)/liquity/borrow/page.tsx` | 수정 | Open Trove 다이얼로그 리디자인 |
| `domains/defi/liquity/types.ts` | 수정 | PositionPreview 타입 추가 |

### 7. DebtInFrontHelper ABI
- 컨트랙트 배포됨 (`0x9fd6...`) 하지만 ABI 미정의
- 이번 스코프에서는 **제외** — Solidity 소스 확인 후 별도 추가
- 대신 useAllTroves의 정렬된 Trove 목록으로 "내 이율보다 낮은 Trove 수" 근사 표시
