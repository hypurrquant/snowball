# 설계 - v0.13.0

## 변경 규모
**규모**: 일반 기능
**근거**: 2개+ 컴포넌트 수정(DepositPanel, useCreatePosition), 새 파일 추가(tokenAllocation.ts), 내부 API 변경(useCreatePosition 반환값 변경)

---

## 문제 요약
Pool New Position에서 Token0/Token1 입력이 독립적이라 Uniswap V3 concentrated liquidity의 tick 비율이 반영되지 않음.

> 상세: [README.md](README.md) 참조

## 접근법

참조 구현(HypurrQuant_FE)의 3계층 구조를 Snowball DDD 아키텍처에 맞게 이식:

1. **Pure Math** (`packages/core/src/dex/tokenAllocation.ts`): tick coefficient 계산, paired amount 계산, max amounts 계산
2. **Hook** (`apps/web/src/domains/trade/hooks/useSmartDeposit.ts`): 양방향 입력 관리, balance capping, range 변경 시 재계산
3. **Component 수정** (`DepositPanel.tsx`): disabled 상태, Max Mint 버튼 연동

## 대안 검토

| 방식 | 장점 | 단점 | 선택 |
|------|------|------|------|
| A: useCreatePosition에 직접 계산 로직 추가 | 변경 최소, 파일 추가 없음 | 훅이 비대해짐, pure math 테스트 불가 | ❌ |
| B: tokenAllocation.ts(core) + useSmartDeposit(hook) 분리 | 테스트 용이, 관심사 분리, 참조 구현 구조 동일 | 파일 2개 추가 | ✅ |
| C: on-chain quoter로 paired amount 조회 | 가장 정확 | 매 입력마다 RPC 호출, 느림, gas 낭비 | ❌ |

**선택 이유**: B는 참조 구현과 동일 구조로 검증됨. pure math가 core 레이어에 분리되어 단위 테스트 가능. useSmartDeposit이 useCreatePosition의 deposit 관련 상태를 위임받아 관심사 분리됨.

## 기술 결정

1. **tick coefficient**: `Number` 타입으로 계산 (참조 구현 동일). bigint 정밀도 대비 ±0.01% 오차는 LP에서 무시 가능
2. **lastEditedToken 상태**: `'token0' | 'token1' | null`로 관리. range 변경 시 이 값을 anchor로 재계산
3. **out-of-range 진입 시**: disabled 토큰 값 `0` 클리어 + `lastEditedToken` 초기화 (`null`)
4. **range 복귀(in-range 재진입) 시**: 양쪽 모두 `0` 상태 유지 (사용자가 새로 입력)
5. **기존 Max 버튼**: Max는 `calcMaxAmountsFromBalances`로 교체 (양쪽 잔고 고려한 최대 유동성). Half는 기존 의미 유지 (단일 토큰 잔고의 50% → paired 자동계산)
6. **import 경로**: `apps/web/src/core/dex/tokenAllocation.ts`에 re-export shim 추가 (`export * from "@snowball/core/src/dex/tokenAllocation"`). 기존 `calculators.ts` 패턴과 동일
7. **decimals-aware 변환**: `parseEther` 대신 `parseTokenAmount(value, decimals)` 사용. 모든 토큰이 18 decimals라는 가정 금지

---

## 범위 / 비범위
- **범위**: tokenAllocation.ts, useSmartDeposit.ts, DepositPanel.tsx 수정, useCreatePosition.ts에서 deposit 로직 위임
- **비범위**: PriceRangeSelector(변경 없음), useAddLiquidity(변경 없음), 라우트 구조(변경 없음)

## 아키텍처 개요

```
packages/core/src/dex/
  ├── calculators.ts        (기존 - tickToSqrtPrice 등)
  └── tokenAllocation.ts    (신규 - calcCoefficients, calcOtherTokenAmount, calcMaxAmountsFromBalances)

apps/web/src/core/dex/
  ├── calculators.ts        (기존 shim - export * from "@snowball/core/...")
  └── tokenAllocation.ts    (신규 shim - export * from "@snowball/core/...")

apps/web/src/domains/trade/
  ├── hooks/
  │   ├── useCreatePosition.ts  (수정 - deposit 상태를 useSmartDeposit에 위임)
  │   └── useSmartDeposit.ts    (신규 - 양방향 입력, Max, range 재계산)
  └── components/
      └── DepositPanel.tsx      (수정 - disabled 상태, Max Mint 연동)
```

> **Import 규칙**: hook/component에서는 `@/core/dex/tokenAllocation` shim을 import. 직접 `@snowball/core/...` import 금지.

## 인터페이스 마이그레이션

### useCreatePosition → useSmartDeposit 위임

| 현재 (useCreatePosition) | 이동 후 (useSmartDeposit) | 변경 |
|--------------------------|--------------------------|------|
| `amount0: string` | `input0: string` | rename, useSmartDeposit 내부 관리 |
| `amount1: string` | `input1: string` | rename, useSmartDeposit 내부 관리 |
| `setAmount0(v)` | `handleToken0Change(v)` | 단순 set → paired 자동계산 포함 |
| `setAmount1(v)` | `handleToken1Change(v)` | 단순 set → paired 자동계산 포함 |
| `handleHalf0()` | `handleHalf0()` | 기존: balance/2 → 변경: balance/2 + paired 자동계산 |
| `handleMax0()` | `handleMax()` | 개별 max → paired max (calcMaxAmountsFromBalances) |
| `handleHalf1()` | `handleHalf1()` | 기존: balance/2 → 변경: balance/2 + paired 자동계산 |
| `handleMax1()` | *(handleMax로 통합)* | 양쪽 동시 계산이므로 단일 Max |
| *(없음)* | `disabled0: boolean` (파생) | 신규: `coeff.case === 'above'`에서 파생 (별도 state 아님) |
| *(없음)* | `disabled1: boolean` (파생) | 신규: `coeff.case === 'below'`에서 파생 (별도 state 아님) |

### DepositPanel props 변경

| 현재 prop | 변경 후 |
|-----------|---------|
| `setAmount0` | `handleToken0Change` (paired 자동계산) |
| `setAmount1` | `handleToken1Change` (paired 자동계산) |
| `handleHalf0/handleMax0` | `handleHalf0` / `handleMax` |
| `handleHalf1/handleMax1` | `handleHalf1` / `handleMax` |
| *(없음)* | `disabled0: boolean` (out-of-range) |
| *(없음)* | `disabled1: boolean` (out-of-range) |

## 데이터 흐름

```
User enters token0 amount
  → useSmartDeposit.handleToken0Change(value)
    → parseFloat(value) → num0 (Number, human-readable)
    → calcOtherTokenAmount(num0, true, coeff) → derived1 (Number)
    → cap if derived1 > formatUnits(balance1): reduce both proportionally
    → setInput0/setInput1 (display strings)
    → parseTokenAmount(input, decimals) → raw bigint for on-chain use
    → notify useCreatePosition

User clicks Max
  → useSmartDeposit.handleMax()
    → numBal0 = formatUnits(balance0, decimals0), numBal1 = formatUnits(balance1, decimals1) → Number
    → calcMaxAmountsFromBalances(numBal0, numBal1, coeff)
    → L = min(numBal0/c0, numBal1/c1)
    → amount0 = L * c0, amount1 = L * c1 (Number)
    → setInput0/setInput1 (display strings) + parseTokenAmount → bigint

Price range changes (tickLower/tickUpper)
  → coeff = calcCoefficients(currentTick, newTickLower, newTickUpper)
  → if out-of-range: clear disabled token to 0, lastEditedToken = null
  → if in-range + lastEditedToken exists: recalculate from anchor token
  → if in-range + no anchor: keep both at 0
```

### 상태 모델

```typescript
interface SmartDepositState {
  input0: string;              // display value (human decimal)
  input1: string;
  amount0: bigint;             // raw wei
  amount1: bigint;
  lastEditedToken: 'token0' | 'token1' | null;
  coeff: TickCoefficients;     // { c0, c1, case }
}
```

## 테스트 전략

- **Unit (tokenAllocation.ts)**: calcCoefficients의 3가지 case, calcOtherTokenAmount 양방향, calcMaxAmountsFromBalances edge cases
- **Integration**: useSmartDeposit 훅이 range 변경, balance 변경에 올바르게 반응하는지
- **Manual E2E**: 브라우저에서 금액 입력 → 자동계산 확인, Max 버튼, out-of-range 비활성화

## 리스크/오픈 이슈
1. **인터페이스 호환성**: 기존 `useCreatePosition`의 `handleHalf0/handleMax0/handleHalf1/handleMax1`이 DepositPanel에서 직접 사용됨 → useSmartDeposit 위임 시 인터페이스 마이그레이션 표에 따라 전환
2. **currentTick 미로딩**: pool 데이터 로딩 전 `currentTick`이 undefined일 때 coefficient 계산 불가 → `coeff`를 null로 초기화, 입력 비활성화 상태 유지
3. **Number 정밀도 한계**: tick coefficient를 `Number`로 계산 시 큰 tick 값(±800,000 부근)에서 `1.0001^(tick/2)` overflow 가능 → 현재 테스트넷 tick 범위는 ±100,000 이내로 안전하나, 방어 코드(isFinite 체크) 추가
4. **balance refresh 타이밍**: 잔고 변경(tx 완료 후)과 재계산 간 race condition → useSmartDeposit이 balance를 의존성으로 받아 useEffect에서 재계산하므로 React query invalidation 시점에 자동 반영
