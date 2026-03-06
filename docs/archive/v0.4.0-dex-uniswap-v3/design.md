# 설계 - v0.4.0

## 변경 규모
**규모**: 일반 기능
**근거**: 6개+ 파일 수정, ABI 인터페이스 전면 변경, 10개+ 문서 업데이트

---

## 문제 요약
FE DEX 코드와 문서가 Algebra V4 기준이나 프로젝트는 Uniswap V3로 전환 결정. ABI/hooks/config/문서를 Uniswap V3로 마이그레이션해야 함.

> 상세: [README.md](README.md) 참조

## 접근법
- **직접 교체 (하위호환성 무시)**: Algebra ABI/이름을 전부 Uniswap V3로 교체. export 이름도 변경 (`SnowballFactoryABI` → `UniswapV3FactoryABI` 등). 하위호환 shim 없음.
- 기존 DEX 주소는 그대로 유지 (배포 후 교체)
- 문서는 Algebra 참조를 Uniswap V3로 치환 (archive/ 제외)

## 대안 검토

| 방식 | 장점 | 단점 | 선택 |
|------|------|------|------|
| A: Wrapper 패턴 (Algebra ABI 유지 + Uniswap adapter) | 점진적 마이그레이션 가능 | 복잡도 증가, 두 ABI 공존 혼란 | ❌ |
| B: 직접 교체 (하위호환 무시) | 단순, 깔끔, 한 번에 완료 | 중간 상태 없음 (all-or-nothing) | ✅ |
| C: 새 dex-v3.ts + 점진 마이그레이션 | 안전한 전환 | 파일 중복, 정리 작업 추가 필요 | ❌ |

**선택 이유**: 사용자가 "하위호환성 유지하지 말고 다 개발해라"로 결정. DEX가 아직 테스트넷이라 중간 상태 리스크 없음.

## 기술 결정

### 1. ABI 소스 기준
- `@uniswap/v3-core@1.0.1` (UniswapV3Factory, UniswapV3Pool)
- `@uniswap/v3-periphery@1.4.4` (SwapRouter, QuoterV2, NonfungiblePositionManager)
- GitHub canonical source 기준, npm 패키지 설치하지 않음 (ABI만 수동 작성)

### 2. ABI export 이름 변경

| Before (Algebra) | After (Uniswap V3) |
|-------------------|---------------------|
| `SnowballFactoryABI` | `UniswapV3FactoryABI` |
| `SnowballPoolABI` | `UniswapV3PoolABI` |
| `SnowballRouterABI` | `SwapRouterABI` |
| `QuoterV2ABI` | `QuoterV2ABI` (변경 없음) |
| `DynamicFeePluginABI` | **삭제** |
| `NonfungiblePositionManagerABI` | `NonfungiblePositionManagerABI` (변경 없음) |
| `MockERC20ABI` | `MockERC20ABI` (변경 없음) |

### 3. 함수 시그니처 변경 상세

#### UniswapV3Factory
```
getPool(address tokenA, address tokenB, uint24 fee) → address pool [view]
createPool(address tokenA, address tokenB, uint24 fee) → address pool [nonpayable]
```

#### UniswapV3Pool (slot0 대체 globalState)
```
slot0() → (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint8 feeProtocol, bool unlocked) [view]
liquidity() → uint128 [view]
token0() → address [view]
token1() → address [view]
fee() → uint24 [view]
tickSpacing() → int24 [view]
```

#### SwapRouter (deployer 파라미터 제거)
```
exactInputSingle(ExactInputSingleParams) → uint256 amountOut [payable]
  - params: tokenIn, tokenOut, fee, recipient, deadline, amountIn, amountOutMinimum, sqrtPriceLimitX96
exactInput(ExactInputParams) → uint256 amountOut [payable]
  - params: path, recipient, deadline, amountIn, amountOutMinimum
multicall(bytes[]) → bytes[] [payable]
```

#### QuoterV2 (deployer 파라미터 제거)
```
quoteExactInputSingle(QuoteExactInputSingleParams) → (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate) [nonpayable]
  - params: tokenIn, tokenOut, amountIn, fee, sqrtPriceLimitX96
```

#### NonfungiblePositionManager (deployer → fee)
```
positions(uint256 tokenId) → (uint96 nonce, address operator, address token0, address token1, uint24 fee, int24 tickLower, int24 tickUpper, uint128 liquidity, uint256 feeGrowthInside0LastX128, uint256 feeGrowthInside1LastX128, uint128 tokensOwed0, uint128 tokensOwed1) [view]
mint(MintParams) → (uint256 tokenId, uint128 liquidity, uint256 amount0, uint256 amount1) [payable]
  - params: token0, token1, fee, tickLower, tickUpper, amount0Desired, amount1Desired, amount0Min, amount1Min, recipient, deadline
```

### 4. config/addresses.ts 변경
- 주석: `"Algebra V4 Integral"` → `"Uniswap V3"`
- `snowballPoolDeployer` 제거
- `dynamicFeePlugin` 제거
- `snowballFactory` → `factory` 으로 변경 (Algebra 특정 네이밍 제거)
- `snowballRouter` → `swapRouter` 으로 변경 (Uniswap V3 네이밍 채택)
- 기존 주소값은 그대로 유지 (배포 후 교체)

**변경 전:**
```typescript
export const DEX = {
  snowballFactory: "0xd478..." as Address,
  snowballPoolDeployer: "0x1ff0..." as Address,  // 삭제
  snowballRouter: "0xd604..." as Address,
  dynamicFeePlugin: "0x5b09..." as Address,      // 삭제
  nonfungiblePositionManager: "0x54b8..." as Address,
  quoterV2: "0xeb2b..." as Address,
};
```

**변경 후:**
```typescript
export const DEX = {
  factory: "0xd478..." as Address,
  swapRouter: "0xd604..." as Address,
  nonfungiblePositionManager: "0x54b8..." as Address,
  quoterV2: "0xeb2b..." as Address,
};
```

### 5. hooks/trade/ 변경

| Hook | 변경 내용 |
|------|----------|
| `usePool.ts` | `poolByPair` → `getPool` + fee 파라미터 추가, `globalState` → `slot0`, `DynamicFeePlugin` 제거, `DEX.snowballFactory` → `DEX.factory` |
| `useSwap.ts` | `deployer` 제거, `limitSqrtPrice` → `sqrtPriceLimitX96`, `fee` 파라미터 추가, `DEX.snowballRouter` → `DEX.swapRouter`, `DEX.snowballPoolDeployer` 제거 |
| `useAddLiquidity.ts` | mint params에서 `deployer` → `fee` 교체, `DEX.snowballPoolDeployer` 제거 |

### 6. 문서 업데이트 전략
- **치환**: "Algebra V4" → "Uniswap V3", "Algebra DEX" → "Uniswap V3 DEX" 등 텍스트 치환
- **섹션 리라이트**: OPERATIONS.md의 DEX 섹션, SECURITY_AUDIT.md의 "Faithful Fork" 섹션
- **삭제**: SSOT_ALGEBRA 관련 INDEX.md 행, CHANGELOG.md 참조
- **archive/ 제외**: frozen snapshot이므로 변경하지 않음
- **v0.3.0 phase 문서**: Algebra 참조를 "(deprecated → v0.4.0에서 Uniswap V3로 전환)" 주석 추가

---

## 범위 / 비범위
- **범위**: dex.ts, index.ts, addresses.ts, useSwap.ts, usePool.ts, useAddLiquidity.ts, 문서 ~10파일
- **비범위**: 컨트랙트 배포, DEX 주소 변경, UI 로직 변경, archive/ 내부, packages/ Solidity

## 가정/제약
- Uniswap V3 canonical ABI는 공개되어 있으며 안정적 (v1.0.1/v1.4.4)
- 기존 DEX 주소를 유지하므로 실제 온체인 호출은 실패할 수 있음 (테스트넷이므로 허용)
- fee tier는 하드코딩하지 않고 hook 파라미터로 전달

## 아키텍처 개요
```
dex.ts (ABI 정의)
  ↓ import
index.ts (re-export)
  ↓ import
useSwap.ts / usePool.ts / useAddLiquidity.ts (hooks)
  ↑ config
addresses.ts (DEX 주소/설정)
```

변경 흐름: dex.ts 리라이트 → index.ts export 수정 → addresses.ts 정리 → hooks 수정 → 빌드 검증 → 문서 업데이트

## API/인터페이스 계약

hooks/trade/ 3개 훅의 파라미터와 반환값이 변경됨. 이는 hooks를 사용하는 UI 컴포넌트에 영향.

### usePool(tokenA, tokenB) → usePool(tokenA, tokenB, fee)

| 항목 | Before (Algebra) | After (Uniswap V3) |
|------|-----------------|---------------------|
| 파라미터 | `tokenA, tokenB` | `tokenA, tokenB, fee` (fee: `uint24`, e.g., 3000) |
| 반환값 `globalState` | `{ price, tick, lastFee, pluginConfig, communityFee, unlocked }` | **삭제** → `slot0: { sqrtPriceX96, tick, observationIndex, observationCardinality, observationCardinalityNext, feeProtocol, unlocked }` |
| 반환값 `dynamicFee` | `uint16` (DynamicFeePlugin 조회) | **삭제** — pool의 `fee()` 함수로 대체하여 `fee` 필드로 반환 |
| 내부 호출 | `SnowballFactoryABI.poolByPair(A, B)` | `UniswapV3FactoryABI.getPool(A, B, fee)` |

### useSwap(tokenIn, tokenOut, amountIn) → useSwap(tokenIn, tokenOut, amountIn, fee)

| 항목 | Before (Algebra) | After (Uniswap V3) |
|------|-----------------|---------------------|
| 파라미터 | `tokenIn, tokenOut, amountIn` | `tokenIn, tokenOut, amountIn, fee` |
| 반환값 `fee` | `quoteData?.[5]` (QuoterV2 6번째 반환값) | **삭제** — Uniswap V3 QuoterV2는 4개 값만 반환 |
| Quote 파라미터 | `{ tokenIn, tokenOut, deployer, amountIn, limitSqrtPrice }` | `{ tokenIn, tokenOut, amountIn, fee, sqrtPriceLimitX96 }` |
| Swap 파라미터 | `{ ..., deployer, limitSqrtPrice }` | `{ ..., fee, sqrtPriceLimitX96 }` |
| Allowance 대상 | `DEX.snowballRouter` | `DEX.swapRouter` |

### useAddLiquidity().mint(params)

| 항목 | Before (Algebra) | After (Uniswap V3) |
|------|-----------------|---------------------|
| mint 파라미터 | `{ token0, token1, deployer, tickLower, ... }` | `{ token0, token1, fee, tickLower, ... }` |
| `deployer` | `DEX.snowballPoolDeployer` | **삭제** → `fee: uint24` 로 교체 |
| 호출자 (UI) | `mint({ token0, token1, ... })` | `mint({ token0, token1, fee, ... })` — fee 필수 |

### 호출하는 UI 컴포넌트 영향

| 컴포넌트 | 현재 호출 | 변경 후 |
|----------|----------|---------|
| Swap 페이지 | `useSwap(tokenIn, tokenOut, amount)` | `useSwap(tokenIn, tokenOut, amount, fee)` — fee 선택 UI 필요 |
| Pool 페이지 | `usePool(tokenA, tokenB)` | `usePool(tokenA, tokenB, fee)` — fee tier 선택 필요 |
| Add Liquidity | `mint({ ..., deployer 없음 })` | `mint({ ..., fee })` — fee 파라미터 추가 |

> **Note**: fee tier UI 추가는 v0.4.0 비범위. hooks 시그니처만 변경하고, 호출 측에서는 기본값 `3000` (0.3%) 하드코딩으로 대응.

## 데이터 흐름

N/A: ABI 교체이며 데이터 흐름 자체는 동일 (Factory→Pool→Quote→Swap). 비동기/이벤트/외부 연동 변경 없음.

## 데이터 모델/스키마

N/A: DB/스토리지 변경 없음. 프론트엔드 ABI와 hook 인터페이스만 변경.

## 실패/에러 처리

N/A: 운영 리스크 없음 (테스트넷). 현재 Algebra 주소에 Uniswap V3 ABI로 호출 시 revert 예상되나, 이는 의도된 동작 (새 컨트랙트 배포 전까지). 별도 fallback/에러 핸들링 추가 불필요.

## 성능/스케일

N/A: ABI 교체로 성능 영향 없음.

## 테스트 전략
- `tsc --noEmit`: 타입 에러 0
- `next build`: 빌드 성공
- 수동 검증: export 이름 변경 후 모든 import 참조가 정상인지 grep 확인

## 리스크/오픈 이슈
- Uniswap V3 QuoterV2의 return 값이 4개인데, 현재 useSwap.ts에서 `quoteData?.[5]`로 fee를 읽고 있음. Uniswap V3에서는 fee가 return에 없으므로 이 부분 수정 필요.
- `usePool.ts`에서 DynamicFeePlugin 제거 후 `dynamicFee` 반환값을 어떻게 대체할지 — pool의 `fee()` 함수로 대체.
- fee tier 기본값 `3000` (0.3%) 하드코딩: v0.4.0에서는 기본값만 사용. 500/10000 등 다른 fee tier 지원은 후속 버전에서 fee tier 선택 UI와 함께 추가.
- 기존 Algebra 주소에 Uniswap V3 ABI로 호출 시 revert 발생: 테스트넷이므로 허용. 새 컨트랙트 배포 후 주소 교체 필요.
