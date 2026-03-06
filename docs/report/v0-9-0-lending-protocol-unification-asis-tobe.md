# v0.9.0 Lending Protocol Unification — ASIS vs TOBE 비교 보고서

> Liquity V2 + Morpho Blue 프로토콜 기준 화면 재편 및 WRITE 전체 구현의 변경 전후 상세 비교
> (Codex + Claude 독립 분석 통합본)

---

## 개요

이 문서는 v0.9.0 `Lending Protocol Unification`의 변경 전후를 코드와 phase 문서 기준으로 비교한다. Codex(OpenAI)와 Claude(Anthropic)가 각각 독립적으로 코드를 읽고 분석한 결과를 통합했다.

### 분석 기준

| 구분 | 기준 |
|------|------|
| ASIS | v0.9.0 직전 상태 (`git show 9cd5247^`) |
| TOBE | v0.9.0 완료 상태 (`git show 9cd5247`) + 현재 아카이브 문서 |
| 핵심 문서 | `docs/archive/v0.9.0-lending-protocol-unification/README.md`, `design.md`, `dod.md`, `PROGRESS.md` |
| 핵심 코드 | `core/abis/liquity.ts`, `domains/defi/liquity`, `domains/defi/morpho`, `app/(defi)/liquity`, `app/(defi)/morpho`, `shared/config/nav.tsx`, `shared/hooks/useTokenBalance.ts`, `app/layout.tsx`, `e2e/pages/*` |

### 변경량 요약

| 항목 | 값 |
|------|----|
| 변경 파일 수 | 38개 (삭제 6 + 수정 11 + 신규 21) |
| 추가 라인 | +2,047 |
| 삭제 라인 | -779 |
| 순증 | +1,268 |
| 신규 라우트 | `liquity/` (4), `morpho/` (4) |
| 신규 도메인 | `domains/defi/liquity` (7 files), `domains/defi/morpho` (7 files) |
| 제거된 진입점 | `app/(defi)/borrow`, `earn`, `lend`, `domains/defi/lend` |

### 한 줄 요약

ASIS는 행위 기준 라우팅과 app 레이어 인라인 컨트랙트 호출, 부분 READ 중심 구조였다. TOBE는 `Liquity`와 `Morpho`를 독립 프로토콜로 승격하고, 13개 WRITE를 도메인 훅으로 수렴시키며, receipt 대기와 후속 refetch까지 포함한 프로토콜 기준 UX로 재편했다.

---

## 1. 라우트 구조

### ASIS

```
/borrow    → apps/web/src/app/(defi)/borrow/page.tsx   (209 lines)
/earn      → apps/web/src/app/(defi)/earn/page.tsx      (280 lines)
/lend      → apps/web/src/app/(defi)/lend/page.tsx      (117 lines)
```

행위 기준으로 화면이 나뉘어 있었다. 같은 Liquity 기능이 `/borrow`와 `/earn`으로 갈라져 있었고, Morpho는 `/lend` 단일 페이지에 마켓 리스트만 노출됐다.

### TOBE

```
/liquity          → redirect → /liquity/borrow
/liquity/borrow   → apps/web/src/app/(defi)/liquity/borrow/page.tsx   (342 lines)
/liquity/earn     → apps/web/src/app/(defi)/liquity/earn/page.tsx     (191 lines)
/liquity/layout   → apps/web/src/app/(defi)/liquity/layout.tsx        (78 lines)

/morpho           → redirect → /morpho/supply
/morpho/supply    → apps/web/src/app/(defi)/morpho/supply/page.tsx    (202 lines)
/morpho/borrow    → apps/web/src/app/(defi)/morpho/borrow/page.tsx    (233 lines)
/morpho/layout    → apps/web/src/app/(defi)/morpho/layout.tsx         (43 lines)
```

프로토콜 루트 아래에 서브탭을 두는 중첩 라우트 구조로 바뀌었다. `page.tsx`는 기본 서브페이지로 redirect 역할만 하고, 실제 UI 상태는 프로토콜 레이아웃이 관리한다.

### 비교

| 항목 | ASIS | TOBE |
|------|------|------|
| 정보 구조 | 행위 기준 (`Borrow/Earn/Lend`) | 프로토콜 기준 (`Liquity/Morpho`) |
| Liquity 진입점 | `/borrow`, `/earn` 분산 | `/liquity/*`로 통합 |
| Morpho 진입점 | `/lend` 단일 진입 | `/morpho/supply`, `/morpho/borrow` 분리 |
| 기본 진입 UX | 각 페이지가 독립 동작 | 프로토콜 루트에서 default subpage로 redirect |
| Layout | 없음 (각 page가 자체 레이아웃) | `liquity/layout.tsx`, `morpho/layout.tsx` |
| 라우트 수 | 3 flat | 7 nested (2 layouts) |

---

## 2. 도메인/훅 구조

### ASIS

| 영역 | 구조 | 파일 | 문제 |
|------|------|------|------|
| Liquity Borrow | `app/(defi)/borrow/page.tsx` 내부에서 `useReadContract`, `useWriteContract` 직접 호출 | 1 | app 레이어가 컨트랙트 세부사항을 알고 있음 |
| Liquity Earn | `app/(defi)/earn/page.tsx` 내부에서 SP read/write 직접 처리 | 1 | 재사용 불가, 에러 처리/receipt 패턴 분산 |
| Morpho Lend | `domains/defi/lend/hooks/useLendMarkets.ts` + `lend/lib/lendMath.ts` | 2 | position/write abstraction 없음 |

ASIS 전체 파일: **2개** (lend 도메인)

### TOBE

#### Liquity 도메인 (7 files)

| 파일 | 역할 |
|------|------|
| `domains/defi/liquity/types.ts` | `TroveData`, `BranchStats`, `SPPosition` 타입 정의 |
| `domains/defi/liquity/lib/liquityMath.ts` | `computeCR`, `liquidationPrice`, `getInsertPosition` (hint fallback) |
| `domains/defi/liquity/data/fixtures.ts` | `DEMO_TROVES` (3건) |
| `domains/defi/liquity/hooks/useLiquityBranch.ts` | branch 시스템 메트릭 batch READ |
| `domains/defi/liquity/hooks/useTroves.ts` | 유저 소유 trove 목록 READ (NFT 기반) |
| `domains/defi/liquity/hooks/useTroveActions.ts` | trove CRUD + 금리 조정 WRITE (4 actions) |
| `domains/defi/liquity/hooks/useStabilityPool.ts` | SP READ/WRITE 통합 (3 actions) |

#### Morpho 도메인 (7 files)

| 파일 | 역할 |
|------|------|
| `domains/defi/morpho/types.ts` | `MorphoMarket`, `MorphoPosition` 타입 정의 |
| `domains/defi/morpho/lib/morphoMath.ts` | APR/APY, HF, liquidation price 계산 |
| `domains/defi/morpho/lib/marketParams.ts` | config → `MarketParams` struct 변환 |
| `domains/defi/morpho/data/fixtures.ts` | `DEMO_POSITIONS` (3건) |
| `domains/defi/morpho/hooks/useMorphoMarkets.ts` | 마켓 리스트/메트릭 READ (from useLendMarkets rename) |
| `domains/defi/morpho/hooks/useMorphoPosition.ts` | 유저 포지션 READ |
| `domains/defi/morpho/hooks/useMorphoActions.ts` | supply/borrow 계열 WRITE (6 actions) |

### 구조적 변화

| 항목 | ASIS | TOBE |
|------|------|------|
| 도메인 파일 수 | 2 | 14 |
| 레이어 경계 | app에서 wagmi/viem 호출 직접 보유 | app은 domain hooks만 소비 |
| Liquity 도메인 | 사실상 없음 | 전용 domain 패키지 신설 |
| Morpho 도메인 | `lend` read-only 도메인 | `morpho` read+write 도메인으로 재구성 |
| 타입 정의 | inline in hook | 독립 `types.ts` 파일 |
| Fixtures | 없음 | `data/fixtures.ts` 분리 |
| 공통 책임 | 페이지마다 개별 구현 | 훅/유틸/fixture로 분리 |

---

## 3. ABI 인프라

파일: `apps/web/src/core/abis/liquity.ts`

| ABI | ASIS | TOBE | 목적 |
|-----|------|------|------|
| `TroveNFTABI.tokenOfOwnerByIndex` | 없음 | 추가 | 유저 소유 trove NFT 열거 |
| `HintHelpersABI` | 없음 | 신규 (`getApproxHint`) | Liquity 정렬 힌트 계산 |
| `SortedTrovesABI` | 없음 | 신규 (`findInsertPosition`) | insert position 계산 |
| `BorrowerOperationsABI` | 기존 유지 | 변경 없음 | openTrove, adjustTrove 등 |
| `StabilityPoolABI` | 기존 유지 | 변경 없음 | provideToSP, withdrawFromSP 등 |

### 의미

- ASIS에서는 Liquity write를 안전하게 제출하기 위한 hint 인프라가 프론트엔드에 없었다.
- TOBE에서는 hint 계산용 ABI가 들어오면서 `openTrove`, `adjustTrove`, `adjustTroveInterestRate`를 도메인 훅에서 처리할 수 있게 됐다.
- `tokenOfOwnerByIndex`가 들어오면서 전체 시스템 trove 열거가 아니라 "현재 유저 소유 trove"만 정확히 읽을 수 있게 됐다.

또한 `addresses.ts`에서 토큰 주소도 업데이트됨:
- `TOKENS.wCTC`: `0x8f7f...` → `0xdb5c...`
- `TOKENS.lstCTC`: `0x7296...` → `0x47ad...`
- `TOKENS.USDC`: `0xbcaa...` → `0x3e31...`

---

## 4. READ 기능 비교

### Liquity READ

| 범주 | ASIS | TOBE |
|------|------|------|
| 시스템 메트릭 | `/borrow`에서 개별 `useReadContract` 4건 | `useLiquityBranch.ts`로 `useReadContracts` 1회 batch |
| 유저 트로브 개수 | `TroveNFT.balanceOf(owner)` 1건만 | 개수 + `tokenOfOwnerByIndex` 기반 상세 카드 |
| 유저 트로브 상세 | 없음 (placeholder 텍스트만) | `useTroves.ts`: coll/debt/ICR/status/interestRate 포함 |
| SP 읽기 | `/earn`에서 개별 `useReadContract` 3건 | `useStabilityPool.ts`로 `useReadContracts` 1회 batch |

### Morpho READ

| 범주 | ASIS | TOBE |
|------|------|------|
| 마켓 리스트 | `useLendMarkets.ts` (read-only) | `useMorphoMarkets.ts`로 계승/정리 |
| 유저 포지션 | 없음 | `useMorphoPosition.ts` 신규 |
| 건강도/청산가 | 유틸 함수만 존재, UI 미연결 | 포지션 화면에서 계산값 표시 |

### 변화 요약

ASIS의 인라인 READ 호출 수: borrow 4건 + earn 3건 + lend 0건(hook 사용) = 7건 개별 `useReadContract`.
TOBE에서는 모두 `useReadContracts` batch로 통합. 도메인 훅 5개 (READ 전용 3 + READ/WRITE 혼합 2).

---

## 5. WRITE 기능 비교

### ASIS 상세

| 페이지 | 상태 | 세부 사항 |
|--------|------|-----------|
| `/borrow` | `useWriteContract` import만 존재, 실제 handler **0건** | UI 셸만 있고 기능 미구현 |
| `/earn` | 인라인 3건: `provideToSP`, `withdrawFromSP`, `claimAllCollGains` | 3개의 개별 `useWriteContract` 인스턴스. fire-and-forget (no receipt). `console.error` only. |
| `/lend` | WRITE **0건** (read-only) | 마켓 리스트 표시만 |

### TOBE: 13개 WRITE 액션

| 프로토콜 | 액션 | 구현 위치 |
|----------|------|-----------|
| Liquity | `openTrove` | `useTroveActions.ts` (approve → hints → write → receipt) |
| Liquity | `adjustTrove` | `useTroveActions.ts` (approve → write → receipt) |
| Liquity | `adjustTroveInterestRate` | `useTroveActions.ts` (hints → write → receipt) |
| Liquity | `closeTrove` | `useTroveActions.ts` (write → receipt) |
| Liquity | `provideToSP` (deposit) | `useStabilityPool.ts` (write → receipt → refetch) |
| Liquity | `withdrawFromSP` (withdraw) | `useStabilityPool.ts` (write → receipt → refetch) |
| Liquity | `claimAllCollGains` (claimAll) | `useStabilityPool.ts` (write → receipt → refetch) |
| Morpho | `supply` | `useMorphoActions.ts` (approve → write → receipt → callback) |
| Morpho | `withdraw` | `useMorphoActions.ts` (write → receipt → callback) |
| Morpho | `supplyCollateral` | `useMorphoActions.ts` (approve → write → receipt → callback) |
| Morpho | `borrow` | `useMorphoActions.ts` (write → receipt → callback) |
| Morpho | `repay` | `useMorphoActions.ts` (approve → write → receipt → callback) |
| Morpho | `withdrawCollateral` | `useMorphoActions.ts` (write → receipt → callback) |

### 결과

- Liquity: "읽기 중심 페이지"에서 "트로브 생애주기 전체 관리 UI"로 바뀌었다.
- Morpho: "시장 리스트"에서 "공급/대출 모두 가능한 사용자 포지션 UI"로 바뀌었다.

---

## 6. 트랜잭션 안정성 패턴

### ASIS

```
click → writeContractAsync → 해시 반환 (fire-and-forget)
         ↓
         refetchInterval: 10_000 에만 의존 (10초 폴링)
         에러: console.error
```

| 항목 | 상태 |
|------|------|
| receipt 대기 | 없음 |
| 후속 상태 갱신 | `refetchInterval` 폴링만 |
| 잔고 refetch | `useTokenBalance.ts`에서 외부 노출 안 함 |
| Token Approval | 없음 (미구현) |
| Hint Helpers | 없음 (0n, 0n 하드코딩) |
| 에러 피드백 | `console.error` only |

### TOBE

```
click
 → domain action
 → approve (if needed)
 → hints (if needed, with fallback)
 → writeContractAsync
 → waitForTransactionReceipt
 → refetch(position/trove/balance)
 → UI state refresh + toast
```

| 항목 | 구현 | 설명 |
|------|------|------|
| `waitForTransactionReceipt` | 모든 WRITE 훅 | receipt 확인 후 다음 단계 |
| `refetch` 노출 | `useTokenBalance.ts` | native/ERC20 balance 모두 refetch 가능 |
| 후속 refetch wiring | 모든 page handler | position + trove + balance 동시 갱신 |
| Token Approval | `useTokenApproval` 훅 | `approve(amount)` 후 write 실행 |
| Hint Helpers | `getInsertPosition()` | `HintHelpers.getApproxHint` → `SortedTroves.findInsertPosition`. 실패 시 (0n, 0n) fallback |
| Toast 피드백 | `toast.error()` via sonner | 전역 `Toaster` 마운트 |

### 패턴 코드

**StabilityPool — `waitAndRefetch`**:
```typescript
const waitAndRefetch = async (hash: `0x${string}`) => {
  await waitForTransactionReceipt(config, { hash });
  await refetch();
  return hash;
};
```

**MorphoActions — `waitAndCallback`**:
```typescript
const waitAndCallback = async (hash: `0x${string}`) => {
  await waitForTransactionReceipt(config, { hash });
  onSuccess?.();
  return hash;
};
```

### 의미

이 변화는 "버튼이 눌렸는가" 수준이 아니라 "receipt가 성공했고, 이후 화면 상태가 바뀌었는가"를 기준으로 write를 안정화했다는 의미다. DoD에서 요구한 post-state 검증이 이 패턴으로 닫힌다.

---

## 7. UI/UX 비교

### 레이아웃

| 항목 | ASIS | TOBE |
|------|------|------|
| 화면 기준 | 기능별 단일 페이지 | 프로토콜별 레이아웃 + 서브탭 |
| Liquity 브랜치 전환 | 페이지 내부 `<Tabs>` (radix) | `layout.tsx`에서 `branch` query 기반 `<Link>` pill buttons |
| Morpho UX | 마켓 카드 리스트만 | Supply/Borrow 분리, 포지션 카드 + 다이얼로그 |
| 컨테이너 | 각 page에 `max-w-5xl` | layout에서 통합 관리 |
| Suspense | 없음 | `liquity/layout.tsx`에서 `<Suspense>` 감싸기 (SSR 호환) |

### 다이얼로그

| 다이얼로그 | ASIS | TOBE |
|-----------|------|------|
| Open Trove | 정적 UI only (Input 2개, 비활성 Button) | 기능 완전 구현: coll/debt/rate 입력, balance 표시, insufficient balance 검증 |
| Adjust Trove | 없음 | 신규: add/remove coll, borrow/repay debt (select dropdown) |
| Adjust Rate | 없음 | 신규: new rate input |
| Close Trove | 없음 | 신규: destructive variant 버튼 |
| Morpho Supply | 없음 | 신규: Supply/Withdraw 2 actions in dialog per market |
| Morpho Borrow | 없음 | 신규: SupplyCollateral/Borrow/Repay/WithdrawCollateral 4 sections, HF warning |

### Trove 목록

| 항목 | ASIS | TOBE |
|------|------|------|
| 표시 | "You have {N} trove(s). Trove details loading..." (placeholder) | 실제 TroveData 카드: Collateral, Debt, Rate, ICR + Adjust/Rate/Close 버튼 |
| 개수 | 숫자만 | `Your Troves ({count})` 제목 |

### 피드백

| 항목 | ASIS | TOBE |
|------|------|------|
| 에러 표시 | `console.error` | `toast.error(err.message)` (sonner) |
| 전역 Toaster | 없음 | `app/layout.tsx`에 `<Toaster />` 마운트 |
| Demo UX | 없음 | `[Demo]` 뱃지 + read-only CTA 잠금 |

---

## 8. Fixture / Mocking 전략

### ASIS

Liquity/Morpho fixture 없음. 명시적 test mode 없음.

### TOBE

| 파일 | 역할 |
|------|------|
| `domains/defi/liquity/data/fixtures.ts` | `DEMO_TROVES` (3건): id, coll, debt, interestRate, icr, status |
| `domains/defi/morpho/data/fixtures.ts` | `DEMO_POSITIONS` (3건): supplyShares, borrowShares, collateral, supplyAssets, borrowAssets, healthFactor, liquidationPrice |

적용 방식:
```typescript
const IS_TEST_MODE = process.env.NEXT_PUBLIC_TEST_MODE === "true";

const displayTroves = [
  ...troves.map(t => ({ ...t, isDemo: false })),
  ...(IS_TEST_MODE ? DEMO_TROVES.map(t => ({ ...t, isDemo: true })) : []),
];
```

- 자동 fallback이 아니라 명시적 opt-in
- `[Demo]` 표시로 실제/demo 데이터 구분
- Demo 카드는 `disabled={!isConnected || isDemo}`로 WRITE 진입 차단

---

## 9. 네비게이션 변경

파일: `apps/web/src/shared/config/nav.tsx`

| 구분 | ASIS DeFi 섹션 | TOBE DeFi 섹션 |
|------|---------------|----------------|
| 항목 1 | Lend (`/lend`, Landmark) | **Liquity** (`/liquity`, HandCoins) |
| 항목 2 | Borrow (`/borrow`, HandCoins) | **Morpho** (`/morpho`, Landmark) |
| 항목 3 | Earn (`/earn`, Percent) | Yield (`/yield`, Vault) |
| 항목 4 | Yield (`/yield`, Vault) | - |
| 항목 수 | 4 | 3 |

"Liquity에서 빌리고 Earn도 한다"가 아니라 "Liquity 프로토콜 안에서 Borrow/Earn을 한다"로 인지 모델이 바뀌었다.

---

## 10. E2E 테스트 커버리지

### 삭제된 테스트

| 파일 | 테스트 수 | 사유 |
|------|----------|------|
| `borrow.spec.ts` | 6 tests, 53 lines | `/borrow` 라우트 삭제됨 |
| `earn.spec.ts` | 7 tests, 45 lines | `/earn` 라우트 삭제됨 |
| `lend.spec.ts` | 3 tests, 27 lines | `/lend` 라우트 삭제됨 |

### 신규/수정 테스트

| 파일 | 테스트 수 | 주요 검증 |
|------|----------|-----------|
| `liquity-borrow.spec.ts` | 6 tests, 42 lines | 브랜치 selector, stat cards, tab nav, URL branch param, connect wallet, Open Trove button |
| `liquity-earn.spec.ts` | 5 tests, 33 lines | stat cards, deposit/withdraw cards, input, tab nav, Earn tab active class (`border-ice-400`) |
| `morpho-supply.spec.ts` | 4 tests, 31 lines | stat cards, Supply/Borrow tabs, Supply APY/Borrow APR 표시, utilization bar |
| `navigation.spec.ts` (수정) | - | SIDEBAR_LINKS: `Lend/Borrow/Earn` → `Liquity/Morpho`, mobile nav 검증 업데이트 |

---

## 11. Codex 리뷰 히스토리

v0.9.0은 codex-phase-workflow의 5단계 프로세스를 따랐으며, 매 Step마다 Codex 리뷰 게이트를 통과해야 다음 단계로 진행했다.

| Step | 리뷰 라운드 | 주요 Finding | 최종 |
|------|-------------|-------------|------|
| **1. PRD** | 2회 (1차 NO → OK) | Earn 라우트 처리 모호성, mocking 정의 부족, DDD 정당화 부족, `adjustTroveInterestRate` 누락 | OK |
| **2. Design** | 2회 (1차 NO → OK) | fixture 자동 fallback 문제, Playwright 파손 고려 누락, Toaster 의존성/섹션 누락 | OK |
| **3. DoD** | 5회 (4차 NO → OK) | 실행 불가능한 CLI 명령, receipt 후 상태 검증 부족, edge case 검증 불충분, E7 fallback 검증 인프라/경로 오류 | OK |
| **4. Tickets** | 4회 (3차 NO → OK) | Toaster 순서 의존성, Step 08 선행조건 오류, N4 toast 소유권 모호, Step 04 `sonner` scope 누락 | OK |
| **5. Development** | 4회 (3차 NO → OK) | `useTroves` 시스템 전체 조회, receipt/wait 부족, balance refetch 누락, demo CTA 잠금 누락, scope drift 문서화 필요, Morpho loan token balance refetch 누락 | OK |

### 누적 관찰

- 문서 단계에서 범위와 검증 기준을 계속 조였기 때문에, 개발 단계에서 큰 구조 변경이 반복되지는 않았다.
- 가장 많이 다듬어진 부분은 DoD(5라운드)와 개발(4라운드)이었다.
- 최종적으로는 "기능 구현"보다 "검증 가능성"을 맞추는 과정이 더 길었다.
- 총 리뷰 라운드: **17회** (5 Steps × 평균 3.4회)

---

## 결론

v0.9.0의 본질은 단순한 화면 개편이 아니다. 이 phase는 다음 세 가지를 동시에 끝냈다:

1. **정보 구조를 행위 기준에서 프로토콜 기준으로 뒤집었다** — `/lend`, `/borrow`, `/earn`이라는 기능 이름에서 `/liquity`, `/morpho`라는 프로토콜 이름으로.

2. **Liquity와 Morpho의 핵심 WRITE를 도메인 훅으로 수렴시켰다** — ASIS의 인라인 fire-and-forget 3건에서 TOBE의 도메인 추상화 13 actions로.

3. **운영 가능한 트랜잭션 패턴을 도입했다** — receipt 대기, refetch, toast, fixture guardrail까지 포함한 end-to-end 안정성.

ASIS가 "DeFi 데모의 일부 화면"에 가까웠다면, TOBE는 "Liquity/Morpho를 실제로 조작할 수 있는 프로토콜 UI"에 가깝다. 특히 `domains/defi/liquity`, `domains/defi/morpho`, `app/(defi)/liquity`, `app/(defi)/morpho`의 4축 정리가 v0.9.0의 핵심 산출물이다.

---

**작성일**: 2026-03-06 20:30 KST
**작성자**: Codex (OpenAI) + Claude (Anthropic) 독립 분석 통합
**Phase 문서**: [docs/archive/v0.9.0-lending-protocol-unification/](../archive/v0.9.0-lending-protocol-unification/README.md)
