# 설계 - v0.22.0 Yield Vault FE 개선

## 변경 규모
**규모**: 일반 기능
**근거**: 3개 컴포넌트 수정(VaultCard, VaultActionDialog, page.tsx) + 신규 훅 추가(useYieldVaultAPY) + 설정 확장(addresses.ts morphoMarketId) + 유틸 함수 승격(morphoMath → shared)

---

## 문제 요약
Yield Vault 페이지에 APY/USD 정보 없음, 입력 검증 부재, 로딩 UI 미흡, withdrawAll 미사용.

> 상세: [README.md](README.md) 참조

## 접근법

5가지 문제를 독립적으로 해결하되, 기존 `useYieldVaults` 훅은 수정하지 않는다.

- **APY**: 새 `useYieldVaultAPY` 훅으로 Morpho 온체인 데이터를 독립 조회 → `shared/lib/morphoMath.ts` 순수 함수로 계산
- **USD**: `TOKEN_INFO.mockPriceUsd`로 소비자(page.tsx)에서 직접 환산 (viem `formatUnits` 사용)
- **입력 검증**: VaultActionDialog 내부에서 `useMemo + try-catch + errors[]` 패턴
- **로딩**: StatCard의 기존 `loading` prop + VaultCard에 `loading` prop 추가
- **withdrawAll**: `isWithdrawAll` boolean 플래그로 Max 클릭 감지 → `withdrawAll()` 호출

## 대안 검토

### APY 소싱

| 방식 | 장점 | 단점 | 선택 |
|------|------|------|------|
| A: useMorphoMarkets 훅 직접 사용 | 코드 재사용 극대화 | wCTC 마켓 미포함, DDD 계층 위반(도메인 훅 의존) | ❌ |
| B: morphoMath 순수 함수를 shared/lib로 승격 + 새 훅 | DDD 준수, wCTC 마켓 자유 추가 | 기존 morpho 도메인 import 경로 수정 필요 | ✅ |
| C: useYieldVaults 확장하여 APY도 반환 | 단일 훅으로 모든 데이터 제공 | 훅 비대화, 관심사 혼재 | ❌ |

**선택 이유**: B — DDD 규칙(domains/는 core + shared만 import)을 준수. `morphoMath.ts`는 외부 의존성 없는 순수 수학 함수이므로 `shared/lib/`가 적절한 위치. 기존 Morpho 도메인의 import 경로(`../lib/morphoMath` → `@/shared/lib/morphoMath`)도 함께 수정.

### USD 환산

| 방식 | 장점 | 단점 | 선택 |
|------|------|------|------|
| A: formatTokenAmount 결과를 Number()로 변환 | 기존 유틸 활용 | formatTokenAmount이 콤마 포함 → Number()가 NaN | ❌ |
| B: viem의 formatUnits로 직접 변환 | 콤마 없는 순수 숫자 문자열, 안전 | formatTokenAmount과 별도 경로 | ✅ |

**선택 이유**: B — `formatUnits(tvl, 18)`은 `"1234.567..."` 형태의 순수 숫자 문자열을 반환하므로 `Number()`로 안전하게 변환 가능. `formatTokenAmount`은 표시용(콤마 포함)이므로 산술에 사용하면 안 됨.

### withdrawAll 구현

| 방식 | 장점 | 단점 | 선택 |
|------|------|------|------|
| A: amount === userShares이면 withdrawAll() 호출 | 금액 표시 가능 | formatTokenAmount→parseEther 왕복 시 정밀도 손실로 `===` 실패 가능 | ❌ |
| B: isWithdrawAll 플래그로 관리 | 정밀도 이슈 완전 회피, Max 클릭 여부 명확 | 추가 상태 변수 1개 | ✅ |

**선택 이유**: B — BigInt 정밀도 손실을 근본적으로 회피. 사용자가 Max 클릭 후 수동 수정하면 플래그 자동 해제.

### 입력 검증 위치

| 방식 | 장점 | 단점 | 선택 |
|------|------|------|------|
| A: VaultActionDialog 내부 인라인 | 단일 파일, 변경 최소 | UI에 로직 혼재 | ❌ |
| B: 별도 useVaultValidation 훅 | 테스트 가능, 재사용 | 검증 3개뿐이라 과설계 | ❌ |
| C: 컴포넌트 내 useMemo + errors[] 패턴 | useEditTrove 패턴 차용, 적절한 복잡도 | — | ✅ |

**선택 이유**: C — 검증 규칙이 단순(safe parsing, 잔고 초과, share 초과)하므로 별도 훅은 과설계. useEditTrove의 `errors[]` + `canSubmit` 패턴만 차용.

### 로딩 UI

| 방식 | 장점 | 단점 | 선택 |
|------|------|------|------|
| A: 전체 페이지 스켈레톤 (MorphoOverview 패턴) | 깔끔한 초기 로딩 | VaultCard 개별 스켈레톤보다 과도 | ❌ |
| B: StatCard loading prop + VaultCard loading prop | 기존 패턴 활용, 세분화된 로딩 | — | ✅ |

**선택 이유**: B — StatCard는 이미 `loading` prop을 지원. VaultCard에 `loading` prop만 추가하면 일관된 로딩 UX.

## 기술 결정

### TD-1: morphoMath.ts shared/lib 승격

DDD 규칙 준수를 위해 `domains/defi/morpho/lib/morphoMath.ts`를 `shared/lib/morphoMath.ts`로 이동한다.

**이동 대상 함수**: `borrowRateToAPR`, `utilization`, `supplyAPY` (+ 기존 함수 전부 포함)
**기존 import 수정**: Morpho 도메인의 `useMorphoMarkets.ts`, `useMorphoPosition.ts` 등에서 import 경로를 `@/shared/lib/morphoMath`로 변경.

이 함수들은 외부 의존성 없는 순수 수학 함수이므로 `shared/lib/`가 DDD 규칙상 올바른 위치.

### TD-2: YIELD 설정에 strategyType + morphoMarketId 추가

`addresses.ts`의 YIELD vault 설정에 2개 필드를 추가한다:

```typescript
// StabilityPool vault
{
  address: "0x..." as Address,
  strategy: "0x..." as Address,
  want: TOKENS.sbUSD,
  wantSymbol: "sbUSD",
  name: "Stability Pool",
  description: "...",
  strategyType: "stabilityPool" as const,
}

// Morpho vault
{
  // ...기존 필드...
  strategyType: "morpho" as const,
  morphoMarketId: "0x5aa4ed..." as `0x${string}`,
}
```

마켓 매핑:
| Vault | strategyType | morphoMarketId |
|-------|-------------|---------------|
| Stability Pool | `stabilityPool` | 없음 |
| Morpho sbUSD | `morpho` | `0x5aa4edaf3dcbf0e54abbf2bb639acbdc95305f61bd4a4f4801d42040998c5752` (LEND.markets[0]) |
| Morpho wCTC | `morpho` | `0xdb8d70912f854011992e1314b9c0837bf14e7314dccb160584e3b7d24d20f6bd` (별도 market) |
| Morpho USDC | `morpho` | `0x3a94c96ec40aa5fe54bcd20ecbcd733497e4f4f2c8d31ae4862951b20f992a0c` (LEND.markets[2]) |

wCTC loan market의 MarketParams (useYieldVaultAPY에서 IRM 호출용):
```typescript
{
  loanToken: TOKENS.wCTC,
  collateralToken: TOKENS.sbUSD,
  oracle: "0x13c355b49b53c3bdfcba742fd015fe30a39896ca" as Address,
  irm: LEND.adaptiveCurveIRM,
  lltv: 770000000000000000n,
}
```

### TD-3: APY 상태 계약 (ApyState discriminated union)

단순 `number | null | undefined` 대신 명시적 상태 구분:

```typescript
type ApyState =
  | { kind: "loading" }
  | { kind: "variable" }        // StabilityPool — 계산 불가
  | { kind: "ready"; value: number }  // Morpho — 계산 완료 (%)
  | { kind: "error" }           // 온체인 호출 실패

// useYieldVaultAPY 반환 타입:
Record<Address, ApyState>
```

UI 렌더링 매핑:
| ApyState | 화면 표시 |
|----------|---------|
| `loading` | Skeleton 애니메이션 |
| `variable` | "Variable" 텍스트 |
| `ready` | `"${value.toFixed(2)}%"` |
| `error` | `"—"` (em dash) |

### TD-4: useYieldVaultAPY 훅 구조

```
useYieldVaultAPY()
  → YIELD.vaults에서 strategyType === "morpho"인 볼트만 필터
  → Phase 1: useReadContracts → SnowballLend.market(marketId) × N
  → Phase 2: useReadContracts → AdaptiveCurveIRM.borrowRateView(marketParams, marketState) × N
  → 각 볼트별 APY 계산:
    borrowRateToAPR(rate) → utilization(borrow, supply) → supplyAPY(apr, util)
    → netAPY = grossAPY × 0.955
  → stabilityPool 볼트: { kind: "variable" }
  → 반환: Record<Address, ApyState>  (key = vault.address)
```

초기 상태: 훅 마운트 시 모든 볼트에 대해 즉시 엔트리를 생성한다. StabilityPool은 `{ kind: "variable" }`, Morpho 볼트는 `{ kind: "loading" }`으로 선할당하여 `undefined` 발생을 방지.

수수료 차감 공식: `netAPY = grossSupplyAPY × (1 - 45/1000)` = `grossSupplyAPY × 0.955`
- 45/1000은 컨트랙트 상수: `CALL_FEE(5) + STRAT_FEE(5) + TREASURY_FEE(35)` / `FEE_DIVISOR(1000)`

IRM fallback (유동성 0 등으로 borrowRateView 실패): `borrowAPR = utilization × 0.08` (useMorphoMarkets 패턴 동일)

### TD-5: USD 환산 로직

page.tsx에서 viem `formatUnits`로 직접 계산:
```typescript
import { formatUnits } from "viem";

const vaultTvlUsd = vault.tvl
  ? Number(formatUnits(vault.tvl, 18)) * TOKEN_INFO[vault.want].mockPriceUsd
  : 0;
```

`formatUnits`는 콤마 없는 순수 숫자 문자열(`"1234.567..."`)을 반환하므로 `Number()` 변환 안전.

### TD-6: VaultCard props 확장

`VaultData` 인터페이스는 변경하지 않는다. VaultCard에 새 props를 추가:
```typescript
interface VaultCardProps {
  vault: VaultData;
  apyState?: ApyState;    // 신규 (optional — 미전달 시 Skeleton)
  tvlUsd?: number;        // 신규
  loading?: boolean;      // 신규
}
```

---

## 범위 / 비범위

**범위 (In Scope)**:
- `morphoMath.ts`를 `shared/lib/`로 이동 + 기존 import 수정
- addresses.ts YIELD 설정에 `strategyType`, `morphoMarketId` 추가
- `useYieldVaultAPY` 신규 훅
- VaultCard: APY 뱃지, USD 환산, Skeleton 로딩
- VaultActionDialog: safe parsing, errors[], canSubmit, isWithdrawAll
- page.tsx: StatCard loading prop, USD 합산 총 예치금, "Avg Price/Share" → 유의미한 지표로 교체

**비범위 (Out of Scope)**:
- useYieldVaults 훅 수정
- VaultData 인터페이스 변경
- 온체인 Oracle 가격 조회

## 아키텍처 개요

```
shared/lib/morphoMath.ts (순수 함수 — 승격 완료)
         │
         ▼
addresses.ts (YIELD 설정 + morphoMarketId + strategyType)
         │
         ▼
┌─────────────────────────────────────────────────────────┐
│                   page.tsx (소비자)                       │
│  ┌───────────────────┐  ┌────────────────────────────┐  │
│  │  useYieldVaults   │  │  useYieldVaultAPY          │  │
│  │  (기존 — 수정 없음) │  │  (신규)                     │  │
│  │  raw on-chain     │  │  Morpho market → IRM → APY │  │
│  │  tvl, shares,     │  │  morphoMath 순수 함수       │  │
│  │  pricePerShare    │  │  ApyState discriminated    │  │
│  └───────────────────┘  └────────────────────────────┘  │
│           │                        │                     │
│           └──────────┬─────────────┘                     │
│                      ▼                                   │
│          VaultCard (APY + USD + loading)                 │
│          VaultActionDialog (validation + withdrawAll)    │
└─────────────────────────────────────────────────────────┘
```

## 데이터 흐름

### APY 계산 (Morpho 볼트)
```
1. addresses.ts → morphoMarketId
2. useReadContracts → SnowballLend.market(marketId)
   → [totalSupplyAssets, totalSupplyShares, totalBorrowAssets, totalBorrowShares, lastUpdate, fee]
3. useReadContracts → AdaptiveCurveIRM.borrowRateView(marketParams, marketState)
   → ratePerSecond (bigint)
4. borrowRateToAPR(ratePerSecond) → borrowAPR (%)
5. utilization(totalBorrowAssets, totalSupplyAssets) → util (%)
6. supplyAPY(borrowAPR, util) → grossAPY (%)
7. grossAPY × 0.955 → netAPY (%)
8. → ApyState { kind: "ready", value: netAPY }
```

### USD 환산 흐름
```
vault.tvl (bigint, 18 decimals)
  → formatUnits(tvl, 18) → "1234.567..." (콤마 없는 순수 숫자 문자열)
  → Number("1234.567...") → 1234.567
  → × TOKEN_INFO[vault.want].mockPriceUsd → tvlUsd (number)
```

### 입력 검증 흐름
```
amount (string)
  → useMemo: try { parseEther(amount) } catch { 0n }  → parsedAmount (bigint)
  → useMemo: errors[] 도출
    - deposit: parsedAmount > wantBalance → "Insufficient balance"
    - withdraw: parsedAmount > userShares → "Exceeds shares"
    - parsedAmount === 0n && amount !== "" → "Invalid amount"
  → canSubmit = parsedAmount > 0n && errors.length === 0
  → Button disabled={!canSubmit}, inline error 표시
```

## 테스트 전략

자동 테스트 코드는 추가하지 않되, 다음 수동 검증 시나리오를 개발 완료 시 확인한다:

### 훅 레벨
- [ ] useYieldVaultAPY: Morpho 3개 볼트에서 APY 숫자가 0 이상 반환되는지 (콘솔 로그)
- [ ] useYieldVaultAPY: StabilityPool 볼트가 `{ kind: "variable" }`를 반환하는지
- [ ] USD 환산: TVL 1000 토큰 이상일 때 NaN이 아닌 정상 숫자가 나오는지

### UI 레벨
- [ ] VaultCard: 각 볼트에 APY가 표시되는지 (Morpho: "X.XX%", SP: "Variable")
- [ ] VaultCard: TVL 옆에 USD 환산이 병행 표시되는지
- [ ] VaultCard: isLoading=true일 때 Skeleton이 보이는지
- [ ] StatCard: 페이지 로딩 시 Skeleton → 데이터 전환이 되는지
- [ ] page.tsx: Total Deposits가 USD 합산으로 표시되는지

### 트랜잭션 레벨
- [ ] Deposit: 잔고 초과 입력 시 "Insufficient balance" 에러 + 버튼 비활성화
- [ ] Deposit: 비숫자 입력("abc") 시 "Invalid amount" 에러
- [ ] Withdraw: share 초과 입력 시 "Exceeds shares" 에러
- [ ] Withdraw: Max 클릭 → withdrawAll() 호출 확인 (TX 성공)
- [ ] Withdraw: Max 클릭 후 금액 수동 수정 → 일반 withdraw() 호출 확인

## 실패/에러 처리

- **APY 온체인 호출 실패**: `ApyState { kind: "error" }` → UI에 `"—"` 표시. 15초 주기 refetch로 자동 복구 시도.
- **wCTC market 데이터 없음** (유동성 0): `utilization = 0`, `supplyAPY = 0` → `{ kind: "ready", value: 0 }` → `"0.00%"` 표시. IRM fallback: `borrowAPR = util × 0.08` (useMorphoMarkets 패턴 동일).
- **parseEther 크래시**: `try-catch`로 래핑, 실패 시 `0n` 반환 + `"Invalid amount"` 에러 메시지.

## 변경 대상 파일 목록

| 파일 | 변경 유형 | 설명 |
|------|----------|------|
| `apps/web/src/domains/defi/morpho/lib/morphoMath.ts` | 이동 | → `apps/web/src/shared/lib/morphoMath.ts` |
| `apps/web/src/domains/defi/morpho/hooks/useMorphoMarkets.ts` | 수정 | import 경로 변경 |
| `apps/web/src/domains/defi/morpho/hooks/useMorphoPosition.ts` | 수정 | import 경로 변경 |
| `packages/core/src/config/addresses.ts` | 수정 | YIELD 설정에 strategyType, morphoMarketId 추가 |
| `apps/web/src/domains/defi/yield/hooks/useYieldVaultAPY.ts` | 신규 | Morpho 온체인 APY 계산 훅 |
| `apps/web/src/domains/defi/yield/components/VaultCard.tsx` | 수정 | APY 뱃지, USD 환산, loading skeleton |
| `apps/web/src/domains/defi/yield/components/VaultActionDialog.tsx` | 수정 | 입력 검증 + withdrawAll |
| `apps/web/src/app/(defi)/yield/page.tsx` | 수정 | StatCard loading, USD 합산, APY 전달 |

## 리스크/오픈 이슈

1. **wCTC market ID 정확성**: `keccak256(abi.encode(loanToken, collateralToken, oracle, irm, lltv))`로 계산한 `0xdb8d70912f854011992e1314b9c0837bf14e7314dccb160584e3b7d24d20f6bd` 값이 온체인과 일치해야 함. 배포 스크립트(deploy-yield.ts)에서 사용한 동일한 파라미터로 계산했으므로 정확할 것으로 판단되나, 개발 시 온체인 검증 필요.
2. **APY 로딩 타이밍**: useYieldVaults(빠름)와 useYieldVaultAPY(2-phase, 느림)의 로딩 시점이 다를 수 있음. ApyState의 `loading` kind로 별도 skeleton 처리.
3. **morphoMath.ts 이동 시 기존 import 누락**: Morpho 도메인 내 모든 import를 수정해야 함. `grep`으로 전수 확인 필요.
