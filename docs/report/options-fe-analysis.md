# Options 기능 FE 심층 분석

> Codex 6라운드 토론 기반 — 구현 현황, GAP, 오류, 구현 계획 종합 리포트

---

## 개요

Snowball DeFi 프론트엔드의 Options (바이너리 옵션 트레이딩) 기능을 심층 분석했다.
Options Phase 개발 계획 수립을 위한 기반 자료로, FE 코드 전수 조사 + 컨트랙트 소스 대조 + Codex 6라운드 FP/FN 검증을 수행했다.

### 분석 범위

- **FE 코드**: `apps/web/src/` 내 options 관련 5개 파일
- **컨트랙트 소스**: `packages/options/src/` 내 4개 Solidity 파일
- **백엔드 API**: `backend/app/options/` 스키마 및 라우터
- **ABI**: `core/abis/options.ts` — 5개 컨트랙트 ABI
- **기존 리포트**: `analysis.md`, `frontend-gap-analysis.md`, `user-flow-inventory.md`

### 분석 방법

1. FE 코드 전수 읽기 (5개 파일, 약 700줄)
2. ABI 정의와 FE 호출 1:1 대조
3. 기존 3개 리포트와 교차 검증
4. Codex(OpenAI) 6라운드 토론으로 FP/FN 검증 + 컨트랙트 소스 직접 확인
   - Round 1: FP/FN 검증, useConnection 정상 확인
   - Round 2: EIP-712 서명 플로우 + 우선순위 분류
   - Round 3: Order 스키마 확정 (컨트랙트 소스에서 발견)
   - Round 4: FE-백엔드 스키마 불일치 발견 + 아키텍처 플로우 확정
   - Round 5: 전체 체크리스트 검증 + 리스크 분석
   - Round 6: 파일별 작업 분해 + DAG 의존관계 + 구현 순서

---

## 1. 아키텍처 현황

### 1.1 컨트랙트 구조 (5개)

| 컨트랙트 | 주소 | 역할 |
|---------|------|------|
| SnowballOptions (engine) | `0x595e...352` | 라운드 관리, 주문 매칭, 에스크로 처리 |
| OptionsClearingHouse | `0xd999...741` | 자금 관리 (deposit/withdraw/balanceOf/escrowOf) |
| OptionsVault | `0x7745...079` | LP용 유동성 제공 (deposit/requestWithdraw/executeWithdraw) |
| BTCMockOracle | `0xcfad...abc` | BTC 가격 피드 (테스트넷) |
| OptionsRelayer | `0xe58f...b1` | EIP-712 서명 검증 + 배치 주문 제출 |

### 1.2 데이터 플로우

```
FE (서명 생성)
  ↓ POST /api/options/order
Backend (서명 검증 → FIFO 매칭)
  ↓ submitSignedOrders(overOrders[], underOrders[])
OptionsRelayer (서명 검증 → SnowballOptions 호출)
  ↓ submitFilledOrders()
SnowballOptions (에스크로 잠금 → 라운드 정산)
  ↓ lockInEscrow(user, amount)
ClearingHouse (자금 이동)
```

**핵심 발견**: FE는 OptionsRelayer를 직접 호출하지 않는다. Relayer는 `OPERATOR_ROLE` 보유자(백엔드)만 호출 가능하며, 매칭된 주문 쌍만 배치 제출한다.

> **근거**: `packages/options/src/OptionsRelayer.sol:100` — `submitSignedOrders` 함수에 `onlyRole(OPERATOR_ROLE)` 접근 제어

### 1.3 FE 파일 구조

```
apps/web/src/
├── app/(options)/options/
│   ├── page.tsx          # 메인 트레이딩 페이지 (273줄)
│   └── history/
│       └── page.tsx      # 거래 내역 페이지 (134줄)
├── domains/options/
│   ├── hooks/
│   │   ├── useOptions.ts      # 라운드/잔고/주문 제출 훅 (126줄)
│   │   └── useOptionsPrice.ts # BTC 가격 피드 훅 (139줄)
│   └── components/
│       └── PriceChart.tsx     # 캔들스틱 차트 (101줄)
└── core/
    ├── abis/options.ts        # 5개 컨트랙트 ABI (43줄)
    └── config/addresses.ts    # OPTIONS 주소 설정
```

---

## 2. 구현 현황 (A — 정상 동작, 8건)

| # | 기능 | 파일 | 상세 |
|---|------|------|------|
| A1 | BTC 가격 차트 | `useOptionsPrice.ts:52`, `PriceChart.tsx:4` | WebSocket(`ws/price`) + REST polling 폴백(10초) + OHLCV(1m, 100개) → lightweight-charts CandlestickSeries |
| A2 | 라운드 정보 읽기 | `useOptions.ts:27` | `currentRoundId()` + `getRound(id)`, 5초 리페치 |
| A3 | 유저 잔고 읽기 | `useOptions.ts:45` | `balanceOf(user)` + `escrowOf(user)`, 10초 리페치 |
| A4 | ClearingHouse deposit | `options/page.tsx:45` | native tCTC value transfer (`deposit{value}()`), approve 불필요 |
| A5 | 주문 UI | `options/page.tsx:170` | Over/Under 버튼 선택 + 금액 입력 |
| A6 | 풀 비율 시각화 | `options/page.tsx:190` | Over/Under 비율 바 + 퍼센트 표시 |
| A7 | 타이머 표시 | `options/page.tsx:77` | 라운드 남은 시간 `MM:SS` 표시 (비실시간) |
| A8 | StatCard 통계 | `options/page.tsx:91` | BTC Price, Round #, Time Left, Balance/Escrow |

### Codex 검증 결과
- 8건 모두 코드에서 확인 완료
- **보정**: 초기 분석에서 "주문 히스토리(REST API)"를 A로 분류했으나, 백엔드 응답 스키마 불일치가 확인되어 C로 이동
- `useConnection()` 사용이 wagmi v2 기준 오류로 보였으나, **wagmi v3.5.0에서는 정식 API**임을 확인 (FP 제거)

> **근거**: `node_modules/.pnpm/wagmi@3.5.0_*/node_modules/wagmi/dist/types/exports/index.d.ts:20`

---

## 3. 미구현 (B — GAP, 8건)

| # | 기능 | ABI 존재 | 우선순위 | 상세 |
|---|------|---------|---------|------|
| B1 | EIP-712 서명 | `OptionsRelayerABI` | **P1** | `useSignTypedData` + `nonces(user)` 조회 필요 |
| B2 | ClearingHouse withdraw | `OptionsClearingHouseABI.withdraw` | **P1** | 입금만 가능, 출금 경로 없음 — 자금 회수 불가 |
| B3 | 라운드 결과/정산 표시 | `getRound().closePrice/status` | **P1** | 정산 후 closePrice, 승패 결과 표시 없음 |
| B4 | commissionFee/paused | `SnowballOptionsABI` | **P1** | paused 시 주문 차단, 수수료 표시 없음 |
| B5 | getOrder 온체인 조회 | `SnowballOptionsABI.getOrder` | P2 | API 의존도 감소, 온체인 검증 가능 |
| B6 | 과거 라운드 조회 | `getRound(id)` | P2 | 이전 라운드 결과 브라우징 UI 없음 |
| B7 | OptionsVault LP 페이지 | `OptionsVaultABI` (9개 함수) | P3 | `/options/liquidity` 전체 미존재 |
| B8 | BTCMockOracle 온체인 가격 | `BTCMockOracleABI` | P3 | 백엔드 API 대체 중, 온체인 대조 없음 |

### B1 EIP-712 서명 — 상세

컨트랙트 소스에서 확정된 Order 스키마:

```
Order(address user, uint8 direction, uint256 amount, uint256 roundId, uint256 nonce, uint256 deadline)
```

> **근거**: `packages/options/src/OptionsRelayer.sol:23`

EIP-712 도메인:

```
name = "SnowballOptionsRelayer"
version = "1"
chainId = block.chainid
verifyingContract = OPTIONS.relayer
```

> **근거**: `packages/options/src/OptionsRelayer.sol:64`

### B7 OptionsVault LP — 상세

| 함수 | 유형 | 설명 |
|------|------|------|
| `deposit()` | Write (payable) | LP 예치 (native tCTC) |
| `requestWithdraw(shares)` | Write | 출금 요청 (24h 지연) |
| `executeWithdraw()` | Write | 출금 실행 (잠금 해제 후) |
| `sharesOf(user)` | Read | LP 지분 |
| `totalDeposited()` | Read | 전체 예치량 |
| `totalShares()` | Read | 전체 지분 |
| `pendingWithdrawShares(lp)` | Read | 대기 중 출금 지분 |
| `withdrawUnlockTime(lp)` | Read | 잠금 해제 시각 |
| `availableLiquidity()` | Read | 사용 가능 유동성 |

2단계 출금 패턴(`requestWithdraw → executeWithdraw`)은 24h 지연으로 뱅크런을 방지하고, 라운드 진행 중 유동성 고갈을 막기 위함이다.

> **근거**: `packages/options/src/OptionsVault.sol:18` (WITHDRAW_DELAY = 24h)

---

## 4. 잘못 구현 / 불일치 (C, 4건)

### C1. submitOrder API 스키마 불일치 (CRITICAL)

**현재 FE가 보내는 것:**
```ts
// useOptions.ts:97
{
  user: address,
  isOver: params.isOver,      // boolean
  amount: params.amount,       // string
  signature: params.signature, // "0x"
  nonce: params.nonce,         // 0
}
```

**백엔드가 요구하는 것:**
```python
# backend/app/options/schemas.py:4
OrderSubmission {
  order: SignedOrder {
    user: str,
    direction: int,          # 0=Over, 1=Under (uint8)
    amount: str,
    round_id: int,           # 필수
    nonce: int,
    deadline: int,           # 필수
    signature: str,
  }
}
```

**누락 필드**: `direction`(uint8), `round_id`, `deadline`
**구조 불일치**: flat JSON vs `{ order: { ... } }` 래핑
**필드명 불일치**: `isOver`(boolean) vs `direction`(uint8)

> **근거**: `backend/app/options/schemas.py:4`, `backend/app/options/router.py:5`

### C2. history 응답 스키마 불일치

**FE가 기대하는 필드:**
```ts
// options/history/page.tsx:11
interface OrderHistory {
  roundId: number;
  isOver: boolean;
  amount: string;
  payout: string;
  startPrice: string;
  endPrice: string;
  status: string;     // "won" | "lost" | "pending"
  timestamp: number;
}
```

**백엔드가 실제 반환하는 필드:**
```
round_id, order_id, settled, user_direction
```

FE 파싱이 백엔드 응답과 맞지 않아 히스토리 페이지가 정상 동작하지 않을 가능성 높음.

> **근거**: `backend/app/options/router.py:81`

### C3. signature/nonce placeholder

```ts
// options/page.tsx:68-69
signature: "0x",  // placeholder
nonce: 0,
```

테스트넷 개발 단계에서 의도된 임시값이지만, EIP-712 구현 시 반드시 수정 필요.
현재 주석으로 `"In production, this would involve EIP-712 signing"` 명시됨.

> **근거**: `options/page.tsx:62`

### C4. BigInt → Number 정밀도 손실

```ts
// options/page.tsx:190
Number(round.totalOverAmount)  // BigInt → Number 변환
Number(round.totalUnderAmount)
```

```ts
// options/history/page.tsx:101-102
Number(order.amount) / 1e18
Number(order.payout) / 1e18
```

큰 금액에서 JavaScript Number의 안전 정수 범위(`2^53`)를 초과하면 정밀도가 손실된다.
`formatUnits`/`formatEther` 사용으로 교체 필요.

---

## 5. Codex 검증에서 보정된 항목

### FP 제거 (과잉 식별 → 정상)

| 초기 판단 | 보정 결과 | 근거 |
|----------|----------|------|
| `useConnection()` 사용이 잘못됨 | wagmi v3.5.0에서 정식 API | `wagmi@3.5.0` 타입 정의 확인 |
| `lockPrice→startPrice` 매핑 오류 | ABI `lockPrice` 필드와 정확히 일치 | `options.ts:24` getRound 반환 구조 |
| `settledOrders: 0n` 하드코딩 | Placeholder (ABI에 해당 필드 없음) | `SnowballOptionsABI.getRound` 반환 구조 |

### FN 추가 (누락 → 발견)

| 항목 | 발견 경위 |
|------|----------|
| `closeTimestamp` 미사용 | Round 3에서 컨트랙트 소스 확인, deadline 생성에 필수 |
| `OrderSettled` 이벤트 미활용 | Round 1에서 ABI 대조 시 발견 |
| history API 스키마 불일치 | Round 5에서 백엔드 소스 직접 확인 |

---

## 6. 구현 계획

### 6.1 우선순위별 작업 목록

#### P1 — 핵심 (9건)

| # | 작업 | 수정 파일 | 의존 | 난이도 |
|---|------|----------|------|--------|
| 1 | closeTimestamp Round 타입 추가 | `useOptions.ts` | - | S |
| 2 | direction 매핑 (isOver→uint8) | `options/page.tsx` | - | S |
| 3 | EIP-712 서명 구현 | `useOptions.ts`, `options/page.tsx` | 1, 2 | M |
| 4 | submitOrder API 스키마 정렬 | `useOptions.ts` | 1, 2, 3 | S |
| 5 | 입력값 검증 + 에러 UI | `options/page.tsx` | - | M |
| 6 | ClearingHouse withdraw UI | `options/page.tsx` | 5 | M |
| 7 | commissionFee/paused 읽기 + UI | `useOptions.ts`, `options/page.tsx` | - | S |
| 8 | 라운드 결과/정산 표시 | `useOptions.ts`, `options/page.tsx` | 1 | M |
| 9 | BigInt 안전 처리 | `options/page.tsx`, `history/page.tsx` | - | M |

#### P2 — 중요 (3건)

| # | 작업 | 수정 파일 | 의존 | 난이도 |
|---|------|----------|------|--------|
| 10 | getOrder 온체인 주문 조회 | `history/page.tsx` 또는 신규 훅 | - | M |
| 11 | 타이머 setInterval 실시간 갱신 | `options/page.tsx` | - | S |
| 12 | 과거 라운드 조회 UI | `history/page.tsx` 또는 신규 페이지 | 1 | M |

#### P3 — 확장 (2건)

| # | 작업 | 수정 파일 | 의존 | 난이도 |
|---|------|----------|------|--------|
| 13 | OptionsVault LP 페이지 | 신규: `options/liquidity/page.tsx`, `useOptionsVault.ts` | - | L |
| 14 | BTCMockOracle 온체인 가격 | 신규: `useOptionsOracle.ts` 또는 `useOptionsPrice.ts` 확장 | - | M |

### 6.2 의존관계 DAG

```
        ┌─────┐   ┌─────┐
        │  1  │   │  2  │   (closeTimestamp, direction)
        └──┬──┘   └──┬──┘
           │         │
           ▼         ▼
        ┌─────────────┐
        │      3      │   (EIP-712 서명)
        └──────┬──────┘
               │
               ▼
        ┌─────────────┐
        │      4      │   (API 스키마 정렬)
        └─────────────┘

        ┌─────┐          ┌─────┐   ┌─────┐   ┌─────┐
        │  5  │          │  7  │   │  8  │   │  9  │
        └──┬──┘          └─────┘   └──┬──┘   └─────┘
           │                          │
           ▼                          │ (의존: 1)
        ┌─────┐                       │
        │  6  │                       │
        └─────┘

독립: 10, 11, 12(→1), 13, 14
```

### 6.3 추천 구현 순서

```
Step 1: 1(closeTimestamp) + 2(direction) + 7(paused/fee) + 9(BigInt)  ← 병렬 가능
Step 2: 3(EIP-712 서명) → 4(API 스키마)                              ← 순차
Step 3: 5(입력 검증) → 6(withdraw)                                   ← 순차
Step 4: 8(정산 표시)
Step 5: 11(타이머) + 12(과거 라운드) + 10(getOrder)                  ← 병렬 가능
Step 6: 13(OptionsVault LP) + 14(Oracle)                             ← 병렬 가능
```

---

## 7. 리스크 및 의존성

### 7.1 백엔드 변경 필요 여부

| 항목 | FE만 변경 | BE도 변경 필요 |
|------|----------|--------------|
| submitOrder 스키마 정렬 | FE를 BE 스키마에 맞추면 가능 | 불필요 |
| history 응답 스키마 | - | BE 응답 확장 필요 |
| EIP-712 서명 | FE + 서명 검증은 BE/컨트랙트 기존 로직 | 불필요 |

### 7.2 테스트넷 EIP-712 검증 전제 조건

1. Relayer 주소/chainId가 FE·BE·컨트랙트에서 동일해야 함
2. nonce가 Relayer의 `nonces(user)`와 일치해야 함
3. deadline이 미래 시각이어야 함
4. 매칭 가능한 주문 쌍(Over/Under, amount 동일, roundId 동일) 필요
5. ClearingHouse에 충분한 잔고/에스크로 가능 상태

### 7.3 OptionsVault 설계 시 참고

- 기존 `VaultActionDialog` (Yield) 패턴 재사용 가능
- **차이점**: native CTC (approve 불필요), 2-step withdraw + unlock time, shares 단위 입력, availableLiquidity 제약

---

## 8. ABI 호출/미호출 분석

### 현재 호출되는 함수 (5개)

| ABI | 함수 | 파일 |
|-----|------|------|
| OptionsClearingHouseABI | `deposit`, `balanceOf`, `escrowOf` | `useOptions.ts`, `options/page.tsx` |
| SnowballOptionsABI | `currentRoundId`, `getRound` | `useOptions.ts` |

### 미호출 함수 (16개)

| ABI | 함수 | 용도 |
|-----|------|------|
| OptionsClearingHouseABI | `withdraw` | 자금 출금 |
| OptionsVaultABI | `deposit`, `requestWithdraw`, `executeWithdraw`, `sharesOf`, `totalDeposited`, `totalShares`, `pendingWithdrawShares`, `withdrawUnlockTime`, `availableLiquidity` | LP 전체 |
| SnowballOptionsABI | `getOrder`, `commissionFee`, `paused` | 주문 조회, 수수료, 일시 정지 |
| BTCMockOracleABI | `price`, `lastUpdated`, `fetchPrice` | 온체인 가격 |
| OptionsRelayerABI | `DOMAIN_SEPARATOR`, `nonces`, `ORDER_TYPEHASH` | EIP-712 서명 |

---

## 9. 비활성화 조치

분석 결과 Options 기능은 다음 이유로 현재 사용 불가 상태이다:

1. **EIP-712 서명 미구현** — 주문이 인증 없이 제출됨
2. **API 스키마 불일치** — submitOrder가 백엔드 검증을 통과하지 못함
3. **출금 불가** — 입금만 가능, 자금 회수 경로 없음

따라서 Options Phase 구현 완료 전까지 네비게이션에서 비활성화한다.

---

## 결론

### 현황 요약

- **구현 완성도**: 약 30% (핵심 트레이딩 루프 미완성)
- **정상 동작**: 가격 차트, 라운드/잔고 읽기, deposit, UI 껍데기
- **핵심 GAP**: EIP-712 서명, withdraw, 정산 표시
- **잘못된 구현**: API 스키마 불일치 (C1, C2), BigInt 정밀도 (C4)

### 핵심 인사이트

1. **아키텍처 이해가 선행되어야 한다**: FE → API → Relayer → Engine 4단계 구조를 모르면 EIP-712 구현 방향을 잡을 수 없다
2. **컨트랙트 소스가 진실의 원천**: ABI만으로는 Order 스키마를 알 수 없었고, `OptionsRelayer.sol`에서 확정
3. **FE-BE 스키마 정합이 최우선**: 서명을 구현해도 API 스키마가 맞지 않으면 동작하지 않음
4. **OptionsVault는 독립 모듈**: 트레이딩 코어와 분리 가능, P3로 후순위

### 권장 다음 단계

Options Phase를 시작할 때:
1. `closeTimestamp` + `direction` 매핑부터 시작 (의존관계 해소)
2. EIP-712 서명 → API 스키마 순서로 트레이딩 루프 완성
3. withdraw + 정산 표시로 자금 라이프사이클 완성
4. OptionsVault LP는 별도 Phase로 분리 가능

---

**작성일**: 2026-03-06 KST
**분석 방법**: FE 코드 전수 조사 + 컨트랙트 소스 대조 + Codex 6라운드 토론 (FP/FN 검증)
**Codex Session**: `/Users/mousebook/Documents/side-project/snowball/8`
