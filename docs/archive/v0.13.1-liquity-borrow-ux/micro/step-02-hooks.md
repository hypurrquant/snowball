# Step 02: usePositionPreview + useMarketRateStats 훅

## 구현

### usePositionPreview
- `domains/defi/liquity/hooks/usePositionPreview.ts`
- 입력: coll, debt, rate, price, mcr, ccr (모두 bigint)
- 출력: cr, liquidationPrice, upfrontFee, annualCost, maxBorrow, crColor, isAboveMCR

### useMarketRateStats
- `domains/defi/liquity/hooks/useMarketRateStats.ts`
- useAllTroves 활용 → 중앙값, 평균, min, max 계산
- Trove 0개면 null 반환

## Scope
- `domains/defi/liquity/hooks/` (신규 파일 2개)
- `domains/defi/liquity/lib/liquityMath.ts` (computeCR, liquidationPrice 이미 존재)
- `domains/defi/liquity/types.ts` (타입 추가)

## 완료 조건
- [ ] usePositionPreview가 정확한 CR, Liquidation Price 계산
- [ ] useMarketRateStats가 온체인 Trove 데이터 기반 통계 반환
