# 설계 - v0.9.0

## 변경 규모
**규모**: 일반 기능 (대규모)
**근거**: 20+ 파일 변경/생성, 2개 신규 라우트 트리, 2개 신규 도메인 디렉토리, 10+ 신규 WRITE 트랜잭션, 네비게이션 구조 변경

---

## 문제 요약
DeFi 사이드바가 행위 기준(Lend/Borrow/Earn)으로 분리되어 있어 Liquity V2와 Morpho Blue 두 프로토콜의 빌리기+빌려주기 기능이 혼재. 핵심 WRITE 기능(Trove CRUD, supply/borrow) 대부분 미구현. 인라인 컨트랙트 호출로 DDD 위반.

> 상세: [README.md](README.md) 참조

## 접근법
1. **프로토콜 기준 라우트 재편**: `/liquity/borrow`, `/liquity/earn`, `/morpho/supply`, `/morpho/borrow`
2. **프로토콜별 도메인 훅**: `domains/defi/liquity/`, `domains/defi/morpho/` 생성
3. **모범 패턴 적용**: Yield Vaults의 배치 READ + approve/action WRITE 패턴 재사용
4. **프론트엔드 fixture**: 데모용 mock 데이터로 빈 상태 UX 보완

## 대안 검토

### 라우트 구조

| 방식 | 장점 | 단점 | 선택 |
|------|------|------|------|
| A: 페이지 내 Tabs (`/liquity` 단일) | 라우팅 단순, 상태 공유 쉬움 | 딥링크 불가, 새로고침 시 탭 초기화, 페이지 비대 | ❌ |
| B: 중첩 서브라우트 (`/liquity/borrow`) | 딥링크 가능, 파일 분리, 브라우저 히스토리 | 파일 수 증가, 공유 상태 관리 필요 | ✅ |
| C: 쿼리 파라미터 (`/liquity?tab=borrow`) | 딥링크 가능, 단일 파일 | Next.js 비표준, 사이드바 active 상태 어색 | ❌ |

**선택 이유**: B를 선택.
- 딥링크 필수 (유저가 "Liquity Earn으로 가서 예치해" 같은 공유 가능)
- 코드베이스 선례 (`/options` + `/options/history`, `/pool/[pair]`)
- 각 서브페이지 규모가 커서 파일 분리 자연스러움
- layout.tsx로 브랜치 셀렉터 공유 가능

### 도메인 구조

| 방식 | 장점 | 단점 | 선택 |
|------|------|------|------|
| 행위 기준 (`defi/borrow/`, `defi/lend/`) | 기존 구조 유지 | 프로토콜 분산, 혼란 지속 | ❌ |
| 프로토콜 기준 (`defi/liquity/`, `defi/morpho/`) | 프로토콜별 응집도 높음 | 기존 lend 디렉토리 마이그레이션 필요 | ✅ |

**선택 이유**: 프로토콜 기준. Liquity와 Morpho는 메커니즘이 완전히 다르므로 프로토콜 단위로 묶는 것이 DDD 원칙에 부합.

## 기술 결정

### 1. 라우트 구조

```
app/(defi)/
  liquity/
    layout.tsx          # 브랜치 셀렉터 + [Borrow|Earn] 탭 네비
    page.tsx            # redirect('/liquity/borrow')
    borrow/page.tsx     # 트로브 목록 + Open/Adjust/Close 다이얼로그
    earn/page.tsx       # SP 예치/출금/보상수령
  morpho/
    layout.tsx          # [Supply|Borrow] 탭 네비
    page.tsx            # redirect('/morpho/supply')
    supply/page.tsx     # 마켓별 공급/출금 다이얼로그
    borrow/page.tsx     # 마켓별 담보공급/차입/상환 다이얼로그
  yield/                # 변경 없음
```

- `/liquity` 접속 시 `/liquity/borrow`로 redirect
- `/morpho` 접속 시 `/morpho/supply`로 redirect
- 기존 `/borrow`, `/earn`, `/lend` 완전 삭제 (redirect 없음)

### 2. 도메인 구조

```
domains/defi/
  liquity/
    hooks/
      useLiquityBranch.ts      # 브랜치 통계 READ (TVL, debt, price, TCR)
      useTroves.ts             # 유저 트로브 목록+상세 READ
      useTroveActions.ts       # openTrove, adjustTrove, adjustRate, closeTrove WRITE
      useStabilityPool.ts      # SP READ+WRITE (deposit, withdraw, claim, stats)
    lib/
      liquityMath.ts           # CR 계산, 청산가격, hint 유틸
    data/
      fixtures.ts              # 데모 트로브 데이터
    types.ts                   # TroveData, BranchStats, SPPosition
  morpho/
    hooks/
      useMorphoMarkets.ts      # 마켓 목록 READ (useLendMarkets 대체)
      useMorphoPosition.ts     # 유저 포지션 READ (마켓별)
      useMorphoActions.ts      # supply/withdraw/borrow/repay/supplyCollateral/withdrawCollateral WRITE
    lib/
      morphoMath.ts            # lendMath.ts 마이그레이션
      marketParams.ts          # marketParams 튜플 생성 헬퍼
    data/
      fixtures.ts              # 데모 포지션 데이터
    types.ts                   # MorphoMarket, MorphoPosition
  lend/                        # 삭제 (morpho/로 마이그레이션)
  yield/                       # 변경 없음
```

### 3. 네비게이션

사이드바 DeFi 그룹을 프로토콜 기준으로 변경:

```typescript
// nav.tsx DeFi 그룹
{
  title: "DeFi",
  items: [
    { href: "/liquity", label: "Liquity", icon: HandCoins },
    { href: "/morpho",  label: "Morpho",  icon: Landmark },
    { href: "/yield",   label: "Yield",   icon: Vault },
  ],
}
```

- 사이드바는 flat 링크 유지 (서브탭은 페이지 내 layout 탭으로)
- `pathname.startsWith('/liquity')`로 active 상태 감지 (기존 로직 그대로 동작)

### 4. Liquity openTrove 힌트 계산

| 접근법 | 선택 |
|--------|------|
| (a) 온체인 HintHelpers + SortedTroves | ✅ (주 방식) |
| (b) 백엔드 API | ❌ (백엔드 변경 비목표) |
| (c) Zero hints (0, 0) | ✅ (폴백) |

- `HintHelpersABI`와 `SortedTrovesABI`를 `core/abis/liquity.ts`에 추가
- 테스트넷 트로브 수가 적으므로 (0, 0) 힌트도 동작 → graceful fallback
- `LIQUITY.shared.hintHelpers` 주소 이미 설정됨

### 5. Morpho marketParams 생성

Morpho WRITE 함수는 `{loanToken, collateralToken, oracle, irm, lltv}` 튜플 필요.

```typescript
// domains/defi/morpho/lib/marketParams.ts
function getMarketParams(market: MarketConfig) {
  const oracleMap = {
    [TOKENS.wCTC]: LEND.oracles.wCTC,
    [TOKENS.lstCTC]: LEND.oracles.lstCTC,
    [TOKENS.sbUSD]: LEND.oracles.sbUSD,
  };
  return {
    loanToken: market.loanToken,
    collateralToken: market.collateralToken,
    oracle: oracleMap[market.collateralToken],
    irm: LEND.adaptiveCurveIRM,
    lltv: market.lltv,
  };
}
```

설정에서 파생 (온체인 `idToMarketParams` 호출 불필요 — 설정이 배포와 일치).

### 6. Mock Fixture 구조

- 위치: `domains/defi/{protocol}/data/fixtures.ts`
- 패턴: 타입된 상수 export
- **활성화**: 기존 `NEXT_PUBLIC_TEST_MODE` 환경변수 재사용 (명시적 opt-in)
- 사용법: `IS_TEST_MODE === true`일 때만 fixture 데이터를 온체인 데이터에 병합하여 표시
- `IS_TEST_MODE === false`이면 순수 온체인 데이터만 표시 (빈 상태면 빈 상태 그대로)
- 이유: 실제 온체인 상태와 가짜 데이터를 암묵적으로 섞으면 QA/사용자 인지에 혼란. 기존 `providers.tsx:18`의 `IS_TEST_MODE` 패턴과 일관성 유지

### 7. 브랜치 셀렉터 상태 공유

Liquity layout에서 wCTC/lstCTC 브랜치 선택 상태를 Borrow/Earn 서브페이지와 공유.

| 접근법 | 선택 |
|--------|------|
| URL 검색 파라미터 (`?branch=wCTC`) | ✅ |
| React Context (layout provider) | ❌ |
| Zustand store | ❌ |

URL 파라미터가 가장 단순. 새로고침 시에도 유지, 공유 가능.

### 8. 에러 처리 전략

WRITE 트랜잭션 에러:
- `try-catch`로 트랜잭션 실패 캐치
- 에러 메시지를 toast로 사용자에게 표시 (기존 VaultActionDialog의 `console.error` 패턴 개선)
- Revert 사유가 있으면 파싱하여 표시
- 기존 `console.error` 패턴은 유지하되 UI 피드백 추가

---

## 범위 / 비범위

**범위 (In Scope)**:
- 라우트 재구성: `/liquity/{borrow,earn}`, `/morpho/{supply,borrow}`
- 기존 라우트 삭제: `/borrow`, `/earn`, `/lend`
- 사이드바 네비게이션 업데이트
- Liquity 도메인: 4개 훅 + lib + types + fixtures
- Morpho 도메인: 3개 훅 + lib + types + fixtures
- ABI 추가: HintHelpersABI, SortedTrovesABI
- DDD 정리: 인라인 → 훅 추출

**비범위 (Out of Scope)**: README.md 비목표 항목 동일

## 아키텍처 개요

### 훅 의존성 그래프

```
/liquity/borrow
  ├── useLiquityBranch(branchKey)      ← domains/defi/liquity/hooks/
  ├── useTroves(branchKey)             ← domains/defi/liquity/hooks/
  ├── useTroveActions(branchKey)       ← domains/defi/liquity/hooks/
  │     └── useTokenApproval()         ← shared/hooks/
  └── useTokenBalance()                ← shared/hooks/

/liquity/earn
  ├── useStabilityPool(branchKey)      ← domains/defi/liquity/hooks/
  └── useTokenBalance()                ← shared/hooks/

/morpho/supply
  ├── useMorphoMarkets()               ← domains/defi/morpho/hooks/
  ├── useMorphoPosition(marketId)      ← domains/defi/morpho/hooks/
  ├── useMorphoActions(market)         ← domains/defi/morpho/hooks/
  │     └── useTokenApproval()         ← shared/hooks/
  └── useTokenBalance()                ← shared/hooks/

/morpho/borrow
  ├── useMorphoMarkets()               ← domains/defi/morpho/hooks/
  ├── useMorphoPosition(marketId)      ← domains/defi/morpho/hooks/
  ├── useMorphoActions(market)         ← domains/defi/morpho/hooks/
  │     └── useTokenApproval()         ← shared/hooks/
  └── useTokenBalance()                ← shared/hooks/
```

## 데이터 흐름

### Liquity openTrove 플로우

```
유저 입력: 담보량 + 차입량 + 금리
  → [선택] HintHelpers.getApproxHint(branchIdx, interestRate, 10, seed)
  → [선택] SortedTroves.findInsertPosition(interestRate, hint, hint)
  → ERC20.approve(borrowerOperations, collAmount)
  → BorrowerOperations.openTrove(owner, 0, collAmount, boldAmount, upperHint, lowerHint, annualRate, maxUpfrontFee, 0x0, 0x0, 0x0)
  → troveId 반환
```

### Morpho Supply 플로우

```
유저 선택: 마켓 + 공급량
  → getMarketParams(market) from config
  → ERC20.approve(snowballLend, amount)
  → SnowballLend.supply(marketParams, amount, 0, userAddress, "0x")
  → (assetsSupplied, sharesSupplied) 반환
```

### Morpho Borrow 플로우

```
유저 선택: 마켓 + 담보량 + 차입량
  → getMarketParams(market) from config
  → ERC20.approve(snowballLend, collAmount)  [담보 토큰]
  → SnowballLend.supplyCollateral(marketParams, collAmount, userAddress, "0x")
  → SnowballLend.borrow(marketParams, borrowAmount, 0, userAddress, userAddress)
```

## API/인터페이스 계약

### Liquity 훅 인터페이스

```typescript
// useLiquityBranch
interface BranchStats {
  totalColl: bigint;
  totalDebt: bigint;
  price: bigint;
  tcr: number;          // %
  mcr: bigint;
  ccr: bigint;
}
function useLiquityBranch(branch: 'wCTC' | 'lstCTC'): {
  stats: BranchStats;
  isLoading: boolean;
}

// useTroves
interface TroveData {
  id: bigint;
  coll: bigint;
  debt: bigint;
  interestRate: bigint;  // annualized, 18 decimals
  icr: number;           // %
  status: number;        // 0=nonExistent, 1=active, 2=closedByOwner...
}
function useTroves(branch: 'wCTC' | 'lstCTC'): {
  troves: TroveData[];
  troveCount: bigint;
  isLoading: boolean;
}

// useTroveActions
function useTroveActions(branch: 'wCTC' | 'lstCTC'): {
  openTrove: (params: { coll: bigint; debt: bigint; rate: bigint; maxFee: bigint }) => Promise<Hash>;
  adjustTrove: (params: { troveId: bigint; collChange: bigint; isCollIncrease: boolean; debtChange: bigint; isDebtIncrease: boolean }) => Promise<Hash>;
  adjustInterestRate: (params: { troveId: bigint; newRate: bigint; maxFee: bigint }) => Promise<Hash>;
  closeTrove: (troveId: bigint) => Promise<Hash>;
  isPending: boolean;
}

// useStabilityPool
interface SPPosition {
  totalDeposits: bigint;
  userDeposit: bigint;
  collGain: bigint;
  yieldGain: bigint;
}
function useStabilityPool(branch: 'wCTC' | 'lstCTC'): {
  position: SPPosition;
  isLoading: boolean;
  deposit: (amount: bigint) => Promise<Hash>;
  withdraw: (amount: bigint) => Promise<Hash>;
  claimAll: () => Promise<Hash>;
  isPending: boolean;
}
```

### Morpho 훅 인터페이스

```typescript
// useMorphoMarkets
interface MorphoMarket {
  id: `0x${string}`;
  name: string;
  loanSymbol: string;
  collSymbol: string;
  loanToken: Address;
  collateralToken: Address;
  totalSupply: bigint;
  totalBorrow: bigint;
  utilization: number;
  borrowAPR: number;
  supplyAPY: number;
  oraclePrice: bigint;
  lltv: bigint;
}
function useMorphoMarkets(): {
  markets: MorphoMarket[];
  isLoading: boolean;
}

// useMorphoPosition
interface MorphoPosition {
  supplyShares: bigint;
  borrowShares: bigint;
  collateral: bigint;
  supplyAssets: bigint;   // 환산
  borrowAssets: bigint;   // 환산
  healthFactor: number;
  liquidationPrice: bigint;
}
function useMorphoPosition(marketId: `0x${string}`): {
  position: MorphoPosition | null;
  isLoading: boolean;
}

// useMorphoActions
function useMorphoActions(market: MorphoMarket): {
  supply: (amount: bigint) => Promise<Hash>;
  withdraw: (amount: bigint) => Promise<Hash>;
  supplyCollateral: (amount: bigint) => Promise<Hash>;
  borrow: (amount: bigint) => Promise<Hash>;
  repay: (amount: bigint) => Promise<Hash>;
  withdrawCollateral: (amount: bigint) => Promise<Hash>;
  isPending: boolean;
}
```

## 테스트 전략

### E2E 테스트 업데이트 (기존 스위트 파손 대응)

기존 Playwright 테스트가 `/lend`, `/borrow`, `/earn` 경로와 Lend/Borrow/Earn 네비게이션을 직접 검증하고 있어, 라우트 삭제 시 즉시 깨짐.

| 테스트 파일 | 처리 |
|------------|------|
| `e2e/pages/borrow.spec.ts` | 삭제 → `e2e/pages/liquity-borrow.spec.ts`로 대체 (경로+UI 변경) |
| `e2e/pages/earn.spec.ts` | 삭제 → `e2e/pages/liquity-earn.spec.ts`로 대체 |
| `e2e/pages/lend.spec.ts` | 삭제 → `e2e/pages/morpho-supply.spec.ts`로 대체 |
| `e2e/flows/navigation.spec.ts` | 수정 — SIDEBAR_LINKS에서 Lend/Borrow/Earn → Liquity/Morpho로 변경 |

### 수동 검증 (테스트넷)

**Liquity**:
- [ ] 브랜치 통계 표시 (wCTC/lstCTC 전환)
- [ ] 트로브 생성 (담보+차입+금리 입력 → 트랜잭션 성공)
- [ ] 트로브 조정 (담보/부채 변경)
- [ ] 금리 변경
- [ ] 트로브 종료
- [ ] SP 예치/출금/보상수령 (기존 기능 유지)
- [ ] 빈 상태에서 fixture 데모 데이터 표시

**Morpho**:
- [ ] 마켓 목록 표시 (기존 기능 유지)
- [ ] 자산 공급 (approve → supply)
- [ ] 자산 출금
- [ ] 담보 공급 + 차입
- [ ] 부채 상환
- [ ] 담보 출금
- [ ] 유저 포지션 표시
- [ ] 빈 상태에서 fixture 데모 데이터 표시

**네비게이션**:
- [ ] 사이드바 Liquity/Morpho/Yield 표시
- [ ] `/liquity` → `/liquity/borrow` redirect
- [ ] `/morpho` → `/morpho/supply` redirect
- [ ] 기존 `/borrow`, `/earn`, `/lend` 경로 404

## 파일 변경 목록

| 파일 | 액션 | 설명 |
|------|------|------|
| `core/abis/liquity.ts` | 수정 | HintHelpersABI, SortedTrovesABI 추가 |
| `domains/defi/liquity/types.ts` | 생성 | TroveData, BranchStats, SPPosition |
| `domains/defi/liquity/hooks/useLiquityBranch.ts` | 생성 | 브랜치 통계 READ |
| `domains/defi/liquity/hooks/useTroves.ts` | 생성 | 트로브 목록+상세 READ |
| `domains/defi/liquity/hooks/useTroveActions.ts` | 생성 | 트로브 CRUD WRITE |
| `domains/defi/liquity/hooks/useStabilityPool.ts` | 생성 | SP READ+WRITE |
| `domains/defi/liquity/lib/liquityMath.ts` | 생성 | CR/청산가격/hint |
| `domains/defi/liquity/data/fixtures.ts` | 생성 | 데모 트로브 데이터 |
| `domains/defi/morpho/types.ts` | 생성 | MorphoMarket, MorphoPosition |
| `domains/defi/morpho/hooks/useMorphoMarkets.ts` | 생성 | 마켓 READ (useLendMarkets 대체) |
| `domains/defi/morpho/hooks/useMorphoPosition.ts` | 생성 | 유저 포지션 READ |
| `domains/defi/morpho/hooks/useMorphoActions.ts` | 생성 | 6개 WRITE 액션 |
| `domains/defi/morpho/lib/morphoMath.ts` | 생성 | lendMath.ts 마이그레이션 |
| `domains/defi/morpho/lib/marketParams.ts` | 생성 | marketParams 튜플 생성 |
| `domains/defi/morpho/data/fixtures.ts` | 생성 | 데모 포지션 데이터 |
| `app/(defi)/liquity/layout.tsx` | 생성 | 브랜치 셀렉터 + 탭 네비 |
| `app/(defi)/liquity/page.tsx` | 생성 | redirect → /liquity/borrow |
| `app/(defi)/liquity/borrow/page.tsx` | 생성 | 트로브 대시보드 + CRUD |
| `app/(defi)/liquity/earn/page.tsx` | 생성 | SP 페이지 |
| `app/(defi)/morpho/layout.tsx` | 생성 | 탭 네비 |
| `app/(defi)/morpho/page.tsx` | 생성 | redirect → /morpho/supply |
| `app/(defi)/morpho/supply/page.tsx` | 생성 | 마켓 + 공급/출금 |
| `app/(defi)/morpho/borrow/page.tsx` | 생성 | 마켓 + 담보/차입/상환 |
| `shared/config/nav.tsx` | 수정 | DeFi 그룹: Liquity, Morpho, Yield |
| `app/layout.tsx` | 수정 | Toaster 컴포넌트 마운트 (sonner) |
| `app/(defi)/borrow/` | 삭제 | → /liquity/borrow |
| `app/(defi)/earn/` | 삭제 | → /liquity/earn |
| `app/(defi)/lend/` | 삭제 | → /morpho/supply |
| `domains/defi/lend/` | 삭제 | → domains/defi/morpho/ |
| `e2e/pages/borrow.spec.ts` | 삭제 | → liquity-borrow.spec.ts |
| `e2e/pages/earn.spec.ts` | 삭제 | → liquity-earn.spec.ts |
| `e2e/pages/lend.spec.ts` | 삭제 | → morpho-supply.spec.ts |
| `e2e/pages/liquity-borrow.spec.ts` | 생성 | Liquity Borrow E2E |
| `e2e/pages/liquity-earn.spec.ts` | 생성 | Liquity Earn E2E |
| `e2e/pages/morpho-supply.spec.ts` | 생성 | Morpho Supply E2E |
| `e2e/flows/navigation.spec.ts` | 수정 | Liquity/Morpho 링크로 업데이트 |

**합계**: 생성 20개, 수정 4개, 삭제 7개 파일/디렉토리

## 가정/제약
- 테스트넷 컨트랙트 ABI가 `core/abis/`와 일치한다고 가정 (배포 이후 변경 없음)
- HintHelpers/SortedTroves 주소가 `LIQUITY.shared`에 이미 설정됨 (`addresses.ts:41,57`)
- Morpho `marketParams`는 설정 파일에서 파생 가능 (온체인 `idToMarketParams` 검증 불필요)
- `NEXT_PUBLIC_TEST_MODE` 환경변수가 기존 `.env`에 설정되어 있음

## 데이터 모델/스키마
N/A: 프론트엔드 전용 Phase. DB/스토리지 변경 없음. 컨트랙트 스키마는 기존 ABI 그대로 사용.

## 리스크/오픈 이슈

1. **useConnection vs useAccount**: 코드베이스가 `useConnection`을 사용 중 (wagmi 표준은 `useAccount`). 기존 패턴 따름.
2. **HintHelpers ABI 미확보**: 배포된 컨트랙트 ABI 확인 필요. 실패 시 (0,0) 힌트로 폴백.
3. **openTrove maxUpfrontFee**: 테스트넷에서는 관대한 값 (`parseEther("1")` = 100%) 사용. 프로덕션에서는 UI 슬라이더 필요.
4. **기존 lend/ 삭제 타이밍**: morpho 훅 검증 후 삭제. 한 스텝에서 처리하여 broken import 방지.
5. **Liquity SP approve**: SP는 sbUSD approve 없이 직접 호출 가능 (Liquity V2 설계). 기존 패턴 유지.
