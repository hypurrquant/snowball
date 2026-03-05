# 프론트엔드 GAP 분석 — 컨트랙트 vs 실제 구현

> 17개 User Context 대비 실제 FE 코드 순회 결과, 페이지별 빠진 기능 상세 정리

---

## 개요

analysis.md에 정리된 17개 User Context(스마트 컨트랙트 기준 모든 atomic action)와
실제 프론트엔드 코드(`apps/web/src/`)를 1:1 대조하여
누락된 페이지, 훅, 컴포넌트, 쓰기 연결을 식별한다.

---

## 1. 컨텍스트별 상세 GAP

### ✅ 완료 (4개)

#### Context 3: Stability Pool → `/earn`
- provideToSP ✅, withdrawFromSP ✅, claimAllCollGains ✅
- 브랜치 선택기 (wCTC/lstCTC) ✅
- 실시간 리페치 (10초) ✅
- **GAP 없음**

#### Context 9: DEX 스왑 → `/swap`
- quoteExactInputSingle ✅, exactInputSingle ✅
- ERC20 approval 플로우 ✅
- 토큰 선택기 ✅, 슬리피지 기본값 0.5% ✅
- **Minor GAP**: 설정 아이콘은 있으나 슬리피지 변경 UI 미구현

#### Context 11: Yield V1 → `/yield`
- 4개 볼트 (SP, Morpho sbUSD/wCTC/USDC) ✅
- deposit ✅, withdraw ✅, approval 플로우 ✅
- 볼트 메트릭스 (TVL, price/share, lastHarvest) ✅
- **GAP 없음**

#### Dashboard → `/dashboard`
- 토큰 잔고 (tCTC, wCTC, sbUSD, lstCTC) ✅
- 포지션 요약 (Trove 수, SP 예금) ✅
- **Minor GAP**: 포트폴리오 도넛 차트가 스피닝 플레이스홀더

---

### ⚠️ 부분 구현 (4개)

#### Context 1: CDP 대출 (Trove) → `/borrow`

**있는 것:**
- 시스템 통계 읽기: TVL, Total Debt, TCR ✅
- 브랜치 선택기 (wCTC/lstCTC) ✅
- 사용자 Trove 개수 표시 ✅
- Open Trove 다이얼로그 UI 껍데기 ✅

**없는 것:**

| 기능 | ABI 존재 | 훅 | UI | 상태 |
|------|---------|-----|-----|------|
| openTrove | ✅ BorrowerOperationsABI | ❌ | 다이얼로그 있으나 disabled | 🔴 핵심 |
| adjustTrove (담보 추가/제거, 부채 변경) | ✅ | ❌ | ❌ | 🔴 |
| closeTrove | ✅ | ❌ | ❌ | 🔴 |
| adjustTroveInterestRate | ✅ | ❌ | ❌ | 🟡 |
| Trove 상세 페이지 (개별 Trove 조회) | ✅ getTroveEntireColl/Debt | ❌ | ❌ | 🔴 |
| Trove 리스트 (내 모든 Trove 목록) | ✅ TroveNFT.tokenOfOwnerByIndex | ❌ | ❌ | 🔴 |
| 힌트 계산 (SortedTroves) | 컨트랙트 존재 | ❌ | - | 🟡 |

**필요한 개발:**
1. `useTrove` 훅 — openTrove, adjustTrove, closeTrove 쓰기
2. `useTroveList` 훅 — 사용자 Trove NFT 조회 → 각 Trove 상세
3. `/borrow/[troveId]` 페이지 — Trove 관리 (담보 추가/인출, 부채 상환, 이자율 변경, 닫기)
4. 힌트 계산 유틸리티 (SortedTroves 연동)

---

#### Context 6: Morpho 렌딩 → `/lend`

**있는 것:**
- 3개 마켓 리스트 (wCTC/sbUSD, lstCTC/sbUSD, sbUSD/USDC) ✅
- 마켓 메트릭스 (TVL, utilization, borrow APR, supply APY) ✅
- Oracle 가격 읽기 ✅
- `lendMath.ts` 유틸리티 (APR/APY 계산, health factor, liquidation price) ✅

**없는 것:**

| 기능 | ABI 존재 | 훅 | UI | 상태 |
|------|---------|-----|-----|------|
| 마켓 상세 페이지 | - | ❌ | ❌ | 🔴 핵심 |
| supply (대출 자산 공급) | ✅ SnowballLendABI | ❌ | ❌ | 🔴 |
| borrow (대출 실행) | ✅ | ❌ | ❌ | 🔴 |
| repay (대출 상환) | ✅ | ❌ | ❌ | 🔴 |
| withdraw (공급 자산 인출) | ✅ | ❌ | ❌ | 🔴 |
| supplyCollateral (담보 공급) | ✅ | ❌ | ❌ | 🔴 |
| withdrawCollateral (담보 인출) | ✅ | ❌ | ❌ | 🔴 |
| position 조회 (유저 포지션) | ✅ position(id, user) | ❌ | ❌ | 🔴 |
| borrowRate 조회 | ✅ AdaptiveCurveIRMABI | ❌ | ❌ | 🟡 |

**필요한 개발:**
1. `/lend/market/[id]` 상세 페이지 — supply/borrow/repay/withdraw 탭
2. `useMorphoPosition` 훅 — 유저 포지션 조회 (supplyShares, borrowShares, collateral)
3. `useMorphoSupply` 훅 — supply + withdraw 쓰기
4. `useMorphoBorrow` 훅 — borrow + repay + collateral 관리 쓰기
5. Health Factor 게이지 UI

---

#### Context 10: DEX 유동성 → `/pool`, `/pool/add`

**있는 것:**
- 풀 리스트 (4개 풀 카드) ✅
- 새 포지션 추가 (`/pool/add`) — mint ✅
- 가격 범위 프리셋 (Full/Safe/Common/Expert) ✅

**없는 것:**

| 기능 | ABI 존재 | 훅 | UI | 상태 |
|------|---------|-----|-----|------|
| 내 LP 포지션 목록 | ✅ NFTManager.balanceOf + tokenOfOwnerByIndex | ❌ | ❌ | 🔴 |
| 포지션 상세 (range, 현재 liquidity) | ✅ NFTManager.positions | ❌ | ❌ | 🔴 |
| increaseLiquidity | ✅ | ❌ | ❌ | 🟡 |
| decreaseLiquidity | ✅ | ❌ | ❌ | 🔴 |
| collect (수수료 수금) | ✅ NFTManager.collect | ❌ | ❌ | 🔴 |
| burn (포지션 제거) | - | ❌ | ❌ | 🟡 |
| 풀 상세 페이지 | - | ❌ | ❌ | 🟡 |

**필요한 개발:**
1. `usePositions` 훅 — NFT 기반 LP 포지션 목록 조회
2. `/pool/[tokenId]` 상세 페이지 — 포지션 관리
3. `useManageLiquidity` 훅 — increase, decrease, collect 쓰기

---

#### Context 13: 옵션 트레이딩 → `/options`

**있는 것:**
- BTC 가격 차트 (WebSocket + REST) ✅
- 라운드 정보 (currentRound, 시간 남은 시간) ✅
- ClearingHouse deposit ✅
- 주문 UI (Over/Under 선택) ✅
- 주문 히스토리 (`/options/history`) ✅

**없는 것:**

| 기능 | 현재 상태 | 상태 |
|------|-----------|------|
| EIP-712 서명 | `"0x"` 플레이스홀더 | 🔴 핵심 |
| ClearingHouse withdraw | ABI 존재, UI 없음 | 🟡 |
| 라운드 결과 조회 | rounds() 읽기는 있으나 settlement 표시 없음 | 🟡 |

**필요한 개발:**
1. EIP-712 TypedData 서명 구현 (wagmi `useSignTypedData`)
2. withdraw UI 추가
3. 라운드 결과/정산 표시

---

### ❌ 미구현 (9개)

#### Context 2: 배치 매니저
- **페이지 필요**: `/borrow/batch-manager`
- **필요 액션**: registerBatchManager, setRate, lowerFee
- **우선순위**: 🟡 낮음 (관리자/전문가 기능)

#### Context 4: Redemption
- **페이지 필요**: `/borrow/redemption` 또는 `/redeem`
- **필요 액션**: redeemCollateral (sbUSD → 담보 교환)
- **우선순위**: 🟡 중간 (DeFi 파워유저 기능)

#### Context 5: 청산 (Liquity)
- **필요 액션**: batchLiquidateTroves
- **우선순위**: ⚪ 낮음 (봇/키퍼 전용, FE 불필요할 수 있음)

#### Context 7: Morpho 고급
- **필요 액션**: createMarket, liquidate, flashLoan
- **우선순위**: ⚪ 낮음 (관리자/봇 전용)

#### Context 8: MetaMorpho 볼트
- **페이지 필요**: `/vaults` 통합 또는 별도
- **필요 액션**: ERC-4626 deposit/mint/withdraw/redeem
- **우선순위**: 🟡 중간 (Yield와 통합 가능)
- **참고**: 컨트랙트 배포 여부 확인 필요

#### Context 12: Yield V2 (ERC-4626)
- **필요 액션**: ERC-4626 deposit/mint/withdraw/redeem
- **우선순위**: 🟡 중간
- **참고**: V1과 별개의 새 볼트, 배포 여부 확인 필요

#### Context 14: 옵션 LP (OptionsVault)
- **페이지 필요**: `/options/liquidity`
- **필요 액션**: deposit, requestWithdraw, executeWithdraw
- **우선순위**: 🟡 중간 (옵션 유동성 제공자용)
- **참고**: ABI는 `options.ts`에 이미 존재 (OptionsVaultABI)

#### Context 15-16: Agent + AgentVault
- **페이지 필요**: `/agent` (현재 껍데기) → 실제 구현
- **필요 액션**: registerAgent, submitReview, deposit, grantPermission
- **우선순위**: 🟡 중간 (ERC-8004 시스템)
- **참고**: `/agent` 페이지 껍데기는 존재

#### Context 17: 크로스 프로토콜 Router
- **페이지 필요**: `/compose`
- **필요 액션**: borrowAndSupply, borrowSwapAndSupply, execute
- **우선순위**: 🟡 높음 (데모 와우 팩터)

---

## 2. 페이지별 추가 GAP (컨텍스트 외)

| 페이지 | 문제 | 심각도 |
|--------|------|--------|
| `/analytics` | 모든 데이터가 하드코딩 mock — TVL, volume, fees 등 | 🟡 |
| `/dashboard` | 포트폴리오 차트 플레이스홀더, Morpho 포지션 미표시 | 🟡 |
| `/swap` | 슬리피지 설정 변경 UI 없음 (아이콘만 존재) | ⚪ |
| `/pool` | 풀 상세 페이지 라우트 없음, 기존 LP 포지션 조회 불가 | 🔴 |
| `/lend` | 마켓 상세 페이지 라우트 없음, 진입점 없음 | 🔴 |
| `/borrow` | Trove 리스트/상세 없음, 기존 Trove 관리 불가 | 🔴 |
| `/chat` | 백엔드 의존 — 백엔드 없으면 에러 발생 가능 | 🟡 |

---

## 3. 누락된 훅 목록 (필요 개발)

| 훅 이름 (제안) | 용도 | 읽기 | 쓰기 |
|---------------|------|------|------|
| `useTrove` | Trove 열기/조정/닫기 | getTroveEntireColl/Debt | openTrove, adjustTrove, closeTrove |
| `useTroveList` | 사용자 Trove 목록 | TroveNFT.balanceOf + tokenOfOwnerByIndex | - |
| `useMorphoPosition` | Morpho 유저 포지션 | position(id, user) | - |
| `useMorphoSupply` | Morpho 공급/인출 | - | supply, withdraw |
| `useMorphoBorrow` | Morpho 대출/상환 | - | borrow, repay, supplyCollateral, withdrawCollateral |
| `usePositions` | DEX LP 포지션 목록 | NFTManager.balanceOf + positions | - |
| `useManageLiquidity` | LP 관리 | - | increaseLiquidity, decreaseLiquidity, collect |
| `useOptionsVault` | 옵션 LP | sharesOf, totalDeposited | deposit, requestWithdraw, executeWithdraw |
| `useAgent` | ERC-8004 에이전트 | 에이전트 조회 | registerAgent, submitReview |
| `useAgentVault` | 위임 실행 | 잔고, 권한 조회 | deposit, grantPermission |
| `useRedemption` | sbUSD 상환 | - | redeemCollateral |
| `useCompose` | 1-click 조합 | - | borrowAndSupply, borrowSwapAndSupply |

---

## 4. 누락된 페이지 목록

| 경로 | 용도 | 우선순위 |
|------|------|---------|
| `/borrow/[troveId]` | Trove 상세 관리 | 🔴 P1 |
| `/lend/market/[id]` | Morpho 마켓 상세 (supply/borrow) | 🔴 P1 |
| `/pool/[tokenId]` | LP 포지션 상세 관리 | 🔴 P2 |
| `/options/liquidity` | 옵션 LP (OptionsVault) | 🟡 P3 |
| `/compose` | 크로스 프로토콜 1-click | 🟡 P3 |
| `/borrow/redemption` | Redemption 실행 | 🟡 P3 |
| `/borrow/batch-manager` | 배치 매니저 관리 | ⚪ P4 |
| `/agents` (리팩토링) | ERC-8004 에이전트 실제 구현 | ⚪ P4 |
| `/agents/vault` | AgentVault 관리 | ⚪ P4 |

---

## 5. 구현 로드맵 제안

### Phase 1: 핵심 DeFi 루프 완성 (데모 필수)
1. **Borrow: openTrove 연결** + Trove 리스트/상세 페이지
2. **Lend: 마켓 상세 페이지** + supply/borrow/repay 연결
3. **Options: EIP-712 서명** 구현

### Phase 2: 라이프사이클 완성
4. Trove 관리 (adjustTrove, closeTrove, 이자율 변경)
5. LP 포지션 관리 (collect, decrease, position list)
6. Options LP (OptionsVault 페이지)

### Phase 3: 고급 기능
7. Compose 페이지 (SnowballRouter 1-click)
8. MetaMorpho / Yield V2 통합
9. Redemption 페이지
10. Agent / AgentVault 실제 구현

### Phase 4: 폴리시
11. Analytics 실제 데이터 연결
12. Dashboard 차트 완성
13. 슬리피지 설정 UI

---

**작성일**: 2026-03-05 KST
**분석 방법**: 3개 Explore Agent 병렬 투입 → 전체 라우트, 훅, 컴포넌트, ABI 1:1 대조
