# 설계 - v0.8.0

## 변경 규모
**규모**: 일반 기능
**근거**: 4개 이상 파일 변경 (page.tsx 전면 리라이팅 + PriceRangeSelector 확장 + 신규 훅 1개 + 신규 컴포넌트 1개). 외부 API/DB 없음.

---

## 문제 요약
현재 `/pool/[pair]` 페이지는 tick raw number 4개 프리셋으로만 가격 범위를 설정하며, 유동성 분포 시각화가 없어 KittenSwap/Uniswap 수준의 LP 포지션 생성 UX와 큰 격차가 있다.

> 상세: [README.md](README.md) 참조

## 참조 구현
HypurrQuant_FE의 Mint 시스템 아키텍처를 핵심 참조로 사용한다:
- `mint-system-architecture-blueprint.md` — 전체 시스템 구조도, PoolDTO 시각화, PriceRangeSelector 설계, tokenAllocation 수학
- `flow-mint-pooldto-visualization-execution.md` — 데이터 흐름, range 조정→amount 재계산 연결, 소유권 맵

**포팅 범위** (이번 Phase에서 가져오는 것):
- `PriceRangeSelector` 컴포넌트 구조 (히스토그램 + 드래그 핸들 + 프리셋 + PriceInput)
- `calculators.ts` 수학 함수 (tickToPrice, priceToTick, alignTickToSpacing, sqrtPriceX96ToPrice)
- `TickDisplayData` 타입
- Mock tick data 생성 (실제 온체인 fetching 대신 bell curve + noise)

**포팅하지 않는 것** (비목표):
- useMintWizardState (복잡한 위저드 상태 — 단순 useState로 대체)
- useSmartDeposit (비율 자동 계산 — 향후 Phase)
- useZapMint, useQuoteSelection (Zap — 향후 Phase)
- ExecutionOrchestration 4-stage pipeline (단순 sequential approve→mint으로 대체)
- PoolDTO 전체 구조 (간소화된 on-chain 읽기로 대체)

## 대안 검토

| 방식 | 장점 | 단점 | 선택 |
|------|------|------|------|
| A: page.tsx 인라인 리팩토링 | 파일 수 최소 | 400줄+ 비대화, 상태 난잡 | ❌ |
| B: 컴포넌트 분리 + useCreatePosition 훅 | 관심사 분리, 각 파일 200줄 이하, DDD 준수 | 파일 2-3개 추가 | ✅ |
| C: 범용 PositionBuilder 추상화 | /pool/add와 코드 공유 | YAGNI, 두 페이지 UX가 다름 | ❌ |

**선택 이유**: B는 프로젝트 기존 패턴(v0.6.0 useProtocolStats+usePoolList, v0.7.0 PriceChart+mockPriceData)과 일치. HypurrQuant_FE에서도 "위저드 상태 훅 1개 + 패널 컴포넌트 분리" 패턴을 사용 (useMintWizardState → MintConfigPanel/MintPoolPanel 분리).

## 기술 결정

### 1. 레이아웃

```
<div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6">
  <SelectRangePanel />   {/* 왼쪽: 프리셋 + 가격 입력 + 히스토그램 */}
  <DepositPanel />        {/* 오른쪽: 토큰 입력 + 비율 바 + APR + 버튼 */}
</div>
```

lg 미만: 1컬럼 세로 스택 (SelectRange → Deposit)

### 2. useCreatePosition 훅

**위치**: `domains/trade/hooks/useCreatePosition.ts`
**참조 패턴**: HypurrQuant_FE의 `useMintWizardState` 간소화 버전

```typescript
interface UseCreatePositionReturn {
  // Pool state (on-chain)
  currentTick: number;
  currentPrice: number;
  tickSpacing: number;
  isPoolLoading: boolean;

  // Tick data (mock)
  ticks: TickDisplayData[];

  // Range state
  tickLower: number;
  tickUpper: number;
  setTickRange: (lower: number, upper: number) => void;

  // Deposit state
  amount0: string;
  amount1: string;
  setAmount0: (v: string) => void;
  setAmount1: (v: string) => void;
  handleHalf0: () => void;
  handleMax0: () => void;
  handleHalf1: () => void;
  handleMax1: () => void;

  // Derived
  amount0Usd: number;
  amount1Usd: number;
  totalDepositUsd: number;
  tokenRatio: [number, number]; // [token0%, token1%]
  estimatedApr: string;

  // Balances
  balance0: bigint | undefined;
  balance1: bigint | undefined;

  // Transaction
  txState: 'idle' | 'approving0' | 'approving1' | 'minting' | 'success' | 'error';
  handleAddLiquidity: () => Promise<void>;
  needsApproval0: boolean;
  needsApproval1: boolean;
}
```

내부 조합: `usePool` + `usePoolTicks` + `useTokenBalance` × 2 + `useTokenApproval` × 2 + `useAddLiquidity`

### 3. DepositPanel 컴포넌트

**위치**: `domains/trade/components/DepositPanel.tsx`
**참조 패턴**: HypurrQuant_FE의 `SmartDepositInput` 간소화 + `MintConfigPanel` 하단

구성:
1. Token0 입력: 아이콘 + 심볼 + Input + `~$X.XX` + Half|Max 버튼
2. Token1 입력: 동일
3. Total Deposit + 토큰 비율 바 (진행 바 + 퍼센트)
4. Estimated APR (usePoolList.feesAPR 표시, 매칭 실패 시 "—")
5. 액션 버튼 (상태 머신)

### 4. PriceRangeSelector 확장

기존 컴포넌트에 추가:
- **Custom 프리셋**: 사용자가 드래그/입력으로 범위 수정 시 자동 선택
- **줌 컨트롤**: `[🔍-] [🔍+] [↻]` 버튼 → 뷰포트 마진 조절
- **프리셋 카드 레이아웃**: 텍스트만 → 텍스트 + 미니 바 아이콘 (div 기반 하드코딩 5개 바)

### 5. USD 환산

TOKEN_INFO에 `mockPriceUsd` 추가:
```typescript
export const TOKEN_INFO: Record<string, { symbol: string; name: string; decimals: number; mockPriceUsd: number }> = {
  [TOKENS.wCTC]: { symbol: "wCTC", ..., mockPriceUsd: 2.50 },
  [TOKENS.lstCTC]: { symbol: "lstCTC", ..., mockPriceUsd: 2.60 },
  [TOKENS.sbUSD]: { symbol: "sbUSD", ..., mockPriceUsd: 1.00 },
  [TOKENS.USDC]: { symbol: "USDC", ..., mockPriceUsd: 1.00 },
};
```

### 6. 토큰 비율 계산

HypurrQuant_FE의 `calcCoefficients`를 간소화:
- `amount0Usd / totalDepositUsd × 100`으로 단순 계산
- Smart Deposit의 tick coefficient 기반 비율은 비목표

### 7. 액션 버튼 상태 머신

```
!isConnected     → "Connect Wallet" (disabled)
!amount0&&!amount1 → "Enter Amount" (disabled)
needsApproval0   → "Approve {token0}" (active)
needsApproval1   → "Approve {token1}" (active)
ready            → "Add Liquidity" (active)
pending          → "Adding..." + spinner
```

---

## 범위 / 비범위

**범위 (In Scope)**:
- 2컬럼 레이아웃 (Select Range | Deposit)
- 프리셋 5개 (Narrow/Common/Wide/Full/Custom)
- 유동성 히스토그램 (mock tick data + 실제 pool state)
- 드래그 핸들 + MIN/MAX 가격 입력 + ±step
- 토큰 입력 + Half/Max 버튼
- USD 환산 (mock 가격)
- 토큰 비율 바
- Estimated APR (usePoolList.feesAPR 표시, 매칭 실패 시 "—")
- 줌 컨트롤 (+/- 버튼)
- 반응형 (lg 이상 2컬럼, 미만 1컬럼)

**비범위 (Out of Scope)**:
- 온체인 tick fetching (mock으로 대체)
- Smart Deposit (비율 자동 계산)
- Zap Mint
- Farming 통합
- Execution Pipeline
- 가격 방향 반전 토글
- 실제 APR 온체인 계산 (usePoolList.feesAPR 표시만 범위 내)

## 아키텍처 개요

```
app/(trade)/pool/[pair]/page.tsx          ← 2컬럼 셸
  ├── domains/trade/hooks/useCreatePosition.ts   ← 전체 상태 오케스트레이션
  │     ├── domains/trade/hooks/usePool.ts        ← 온체인 slot0/liquidity/tickSpacing
  │     ├── domains/trade/hooks/usePoolTicks.ts   ← mock tick data 생성
  │     ├── domains/trade/hooks/useAddLiquidity.ts ← approve + mint TX
  │     ├── shared/hooks/useTokenBalance.ts × 2
  │     └── shared/hooks/useTokenApproval.ts × 2
  ├── domains/trade/components/PriceRangeSelector.tsx  ← 왼쪽 패널 핵심
  │     ├── LiquidityHistogram (내부)
  │     ├── PriceInput × 2 (내부)
  │     └── DragHandle × 2 (내부)
  └── domains/trade/components/DepositPanel.tsx   ← 오른쪽 패널
        ├── TokenDepositInput × 2
        ├── TokenRatioBar
        └── ActionButton

core/dex/calculators.ts     ← tickToPrice, priceToTick, alignTickToSpacing (React-free)
core/dex/types.ts           ← TickDisplayData, PoolState (React-free)
core/config/addresses.ts    ← TOKEN_INFO + mockPriceUsd
```

**DDD 레이어 검증**:
- `core/` → React-free 수학/타입/설정 ✅
- `domains/trade/hooks/` → 도메인 비즈니스 로직 ✅
- `domains/trade/components/` → 도메인 UI ✅
- `shared/hooks/` → 범용 훅 (토큰 잔고, 승인) ✅
- `app/` → 페이지 셸만 ✅

## 파일 변경 목록

| 파일 | 액션 | 설명 |
|------|------|------|
| `core/config/addresses.ts` | 수정 | TOKEN_INFO에 `mockPriceUsd` 필드 추가 |
| `core/dex/calculators.ts` | 유지 | 이미 생성됨, 변경 없음 |
| `core/dex/types.ts` | 유지 | 이미 생성됨, 변경 없음 |
| `domains/trade/hooks/usePool.ts` | 유지 | tickSpacing 이미 추가됨, 변경 없음 |
| `domains/trade/hooks/usePoolTicks.ts` | 유지 | mock tick 생성, 변경 없음 |
| `domains/trade/hooks/useCreatePosition.ts` | **신규** | 핵심 상태 관리 훅 |
| `domains/trade/components/PriceRangeSelector.tsx` | 수정 | Custom 프리셋 + 줌 컨트롤 + 미니 히스토그램 아이콘 |
| `domains/trade/components/DepositPanel.tsx` | **신규** | 오른쪽 Deposit 패널 (TokenDepositInput, TokenRatioBar, ActionButton 내부 컴포넌트 포함) |
| `app/(trade)/pool/[pair]/page.tsx` | 수정 | 2컬럼 레이아웃 셸로 리라이팅 |

## 가정/제약
N/A: PRD 제약사항에 이미 기술 (Creditcoin 테스트넷, mock tick data, ice-blue 팔레트)

## 데이터 흐름
N/A: 외부 API/비동기 연동 없음. 온체인 읽기는 wagmi useReadContracts로 단방향.

## API/인터페이스 계약
N/A: 외부/내부 API 변경 없음. 온체인 컨트랙트 ABI 변경 없음.

## 데이터 모델/스키마
N/A: DB/스토리지 없음.

## 실패/에러 처리
N/A: 트랜잭션 실패는 기존 useAddLiquidity의 try/catch 패턴 유지. 추가 에러 처리 불필요.

## 성능/스케일
N/A: mock 데이터 80개 tick bar, 연산 부하 무시 가능.

## Tick 범위 검증 레이어 책임

| 검증 | 담당 레이어 | 근거 |
|------|------------|------|
| tickSpacing 정렬 (alignTickToSpacing) | `PriceRangeSelector` | 드래그/입력/프리셋 모두 이 컴포넌트에서 발생 |
| tickLower < tickUpper 강제 | `PriceRangeSelector` | 드래그 clamp 로직이 이미 구현됨 |
| MIN/MAX tick 경계 (-887272 ~ 887272) | `PriceRangeSelector` | Full Range 프리셋에서 이미 사용 |
| useCreatePosition은 검증하지 않음 | — | PriceRangeSelector가 유일한 tick 변경 진입점이므로 이중 검증 불필요 |

## 테스트 전략

UI 중심 변경이므로 시각적 확인 기반:
1. **수동 확인**: `http://localhost:3000/pool/{token0}-{token1}` 접속 → 2컬럼 렌더링 확인
2. **타입 체크**: `tsc --noEmit` 통과 (기존 PriceChart.tsx 에러 제외)
3. **기능 체크리스트**:
   - 프리셋 5개 클릭 → 히스토그램 범위 변경
   - 드래그 핸들 이동 → MIN/MAX 가격 업데이트
   - Half/Max 버튼 → 잔고 반영
   - 금액 입력 → USD 환산 + 비율 바 업데이트
   - approve → mint 트랜잭션 플로우

## 리스크/오픈 이슈

1. **useConnection**: 프로젝트가 wagmi의 `useConnection`을 사용 중 (표준 `useAccount`가 아님). 커스텀 래퍼일 수 있으므로 기존 패턴 그대로 사용.
2. **mock USD 가격**: TOKEN_INFO에 하드코딩. 향후 실제 가격 피드 도입 시 이 필드를 제거하고 온체인/API 가격으로 교체해야 함.
3. **`/pool/add` 페이지**: 별도로 존재하는 add liquidity 페이지. 이번 Phase에서는 건드리지 않고 공존. 향후 통합 또는 제거 검토.
4. **parseEther vs parseTokenAmount**: 현재 page.tsx가 `parseEther`를 사용하는데, USDC(6 decimals)에서 오류 발생 가능. `parseTokenAmount`(이미 utils에 존재)으로 교체 필요.
