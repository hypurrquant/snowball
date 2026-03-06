# Step 03: hooks/trade/ 3개 훅 마이그레이션

## 메타데이터
- **난이도**: 🟠 중간
- **롤백 가능**: ✅ (git revert)
- **선행 조건**: Step 01 (ABI 변경), Step 02 (config 변경)

---

## 1. 구현 내용 (design.md 기반)

### usePool.ts
- import: `SnowballFactoryABI, SnowballPoolABI, DynamicFeePluginABI` → `UniswapV3FactoryABI, UniswapV3PoolABI`
- `DEX.snowballFactory` → `DEX.factory`
- `DEX.dynamicFeePlugin` 참조 제거
- 함수 시그니처: `usePool(tokenA, tokenB)` → `usePool(tokenA, tokenB, fee: number = 3000)`
- Factory 호출: `poolByPair(token0, token1)` → `getPool(token0, token1, fee)`
- Pool 데이터: `globalState` → `slot0`
- DynamicFeePlugin batch call 제거 → Pool의 `fee()` 함수로 대체
- 반환값: `globalState` → `slot0`, `dynamicFee` → `fee`

### useSwap.ts
- import: `SnowballRouterABI` → `SwapRouterABI`
- `DEX.snowballRouter` → `DEX.swapRouter`
- `DEX.snowballPoolDeployer` 제거
- 함수 시그니처: `useSwap(tokenIn, tokenOut, amountIn)` → `useSwap(tokenIn, tokenOut, amountIn, fee: number = 3000)`
- Quote params: `{ deployer, limitSqrtPrice }` → `{ fee, sqrtPriceLimitX96 }`
- Swap params: `{ deployer, limitSqrtPrice }` → `{ fee, sqrtPriceLimitX96 }`
- fee 반환값: `quoteData?.[5]` 제거 (Uniswap V3 QuoterV2는 4개만 반환)
- Allowance 대상: `DEX.snowballRouter` → `DEX.swapRouter`

### useAddLiquidity.ts
- `DEX.snowballPoolDeployer` 제거
- 함수 시그니처에 `fee: number = 3000` 파라미터 추가
- mint params: `deployer: DEX.snowballPoolDeployer` → `fee`

## 2. 완료 조건
- [ ] usePool.ts: `getPool` 호출, `poolByPair` 없음 (F14)
- [ ] usePool.ts: `slot0` 호출, `globalState` 없음 (F15)
- [ ] usePool.ts: `DynamicFeePlugin`/`dynamicFeePlugin` 참조 없음 (F16)
- [ ] useSwap.ts: `deployer`/`limitSqrtPrice` 참조 없음 (F17)
- [ ] useSwap.ts: `sqrtPriceLimitX96`+`fee` 사용 (F18)
- [ ] useSwap.ts: `quoteData?.[5]` 참조 없음 (F19)
- [ ] useSwap.ts: `SwapRouterABI` import, `SnowballRouterABI` 없음 (F20)
- [ ] useAddLiquidity.ts: `deployer` 참조 없음 (F21)
- [ ] `fee: number = 3000` 기본값 설정 (E1, E2)
- [ ] `poolExists` 체크 유지 (E5)
- [ ] `tsc --noEmit` 통과 (N1)
- [ ] `next build` 통과 (N2)
- [ ] Algebra 관련 import 0건 (N3)
- [ ] Algebra 관련 DEX 참조 0건 (N4)

## 3. 롤백 방법
- `git checkout -- apps/web/src/hooks/trade/usePool.ts apps/web/src/hooks/trade/useSwap.ts apps/web/src/hooks/trade/useAddLiquidity.ts`
- 영향 범위: 3개 파일

---

## Scope

### 수정 대상 파일
```
apps/web/src/hooks/trade/
├── usePool.ts         # Factory/Pool 호출 변경 + DynamicFeePlugin 제거
├── useSwap.ts         # Router/Quoter 호출 변경 + deployer 제거
└── useAddLiquidity.ts # NFT PM mint params 변경

apps/web/src/app/(trade)/
├── swap/page.tsx      # useSwap 반환값 변경 대응 + fee 표시 제거
├── pool/page.tsx      # dynamicFee→fee, fee/10000 표시, "Dynamic Fee"→"Fee Tier"
└── pool/add/page.tsx  # pool.dynamicFee→pool.fee, fee/10000 표시
```

### 신규 생성 파일
없음

### 의존성 분석
| 모듈 | 영향 유형 | 설명 |
|------|----------|------|
| dex.ts (Step 01) | 선행 | 새 ABI export 이름 사용 |
| addresses.ts (Step 02) | 선행 | 새 필드명 (`DEX.factory`, `DEX.swapRouter`) 사용 |
| UI 컴포넌트 | 간접 영향 | hooks 반환값 변경 (`globalState`→`slot0`, `dynamicFee`→`fee`). 호출 측에서 fee 기본값 사용 시 변경 불필요 |

### Side Effect 위험
- hooks 반환값 이름 변경 (`globalState`→`slot0`) — 호출하는 UI 컴포넌트에서 프로퍼티 이름 에러 가능
- 단, tsc --noEmit에서 잡힘

### 참고할 기존 패턴
- 현재 usePool.ts의 `useReadContracts` batch 패턴 유지
- 현재 useSwap.ts의 `useReadContract` + `useWriteContract` 패턴 유지

## FP/FN 검증

### False Positive (과잉)
| Scope 항목 | 구현 내용 근거 | 판정 |
|-----------|---------------|------|
| usePool.ts | Factory/Pool 호출 + DynamicFeePlugin 제거 | ✅ OK |
| useSwap.ts | Router/Quoter deployer/limitSqrtPrice 제거 | ✅ OK |
| useAddLiquidity.ts | mint deployer→fee 교체 | ✅ OK |

### False Negative (누락)
| 구현 내용 | Scope 포함 | 판정 |
|----------|-----------|------|
| usePool 시그니처 변경 | ✅ | OK |
| useSwap 시그니처 변경 | ✅ | OK |
| useAddLiquidity mint params | ✅ | OK |
| fee 기본값 설정 | ✅ | OK |

### 검증 통과: ✅

---

→ 다음: [Step 04: 문서 업데이트](step-04-docs-update.md)
