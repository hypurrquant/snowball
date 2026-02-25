# OP.md — Snowball Lend App Operations Guide

> Morpho Blue 기반 Lending UI 운영 가이드
> Last updated: 2026-02-25

---

## 1. 개요

Snowball App은 Morpho Blue 포크(SnowballLend) 기반의 렌딩 프로토콜 프론트엔드입니다.
- **Supply** — 자산을 예치하고 이자 수익
- **Borrow** — 담보를 예치하고 자산 대출
- **Health Factor** — 포지션 안전도 실시간 모니터링

| 항목 | 값 |
|------|-----|
| 프레임워크 | React 18 + Vite (SPA) |
| 웹3 | wagmi 2 + viem 2 + Privy |
| 라우팅 | React Router v6 |
| 네트워크 | Creditcoin Testnet (Chain ID 102031) |

---

## 2. 실행

```bash
# 루트에서 의존성 설치 (최초 1회)
cd snowball && pnpm install

# Lend 앱 개발 서버
cd snowball-app
pnpm dev:app      # http://localhost:5173

# 또는 직접
cd snowball-app/packages/app
pnpm dev
```

### 환경 변수

`snowball-app/packages/app/.env`:
```env
# Privy 인증 (필수)
VITE_PRIVY_APP_ID=your_privy_app_id

# 백엔드 API (Liquity agent — 옵션)
VITE_API_BASE=http://localhost:3000/api
VITE_CHAT_API_BASE=http://localhost:3002/api
```

> Lend 기능만 사용할 경우 `VITE_PRIVY_APP_ID`만 필요합니다. 백엔드 API는 Liquity 에이전트 기능용.

---

## 3. 컨트랙트 주소

### SnowballLend Core

| 컨트랙트 | 주소 |
|----------|------|
| SnowballLend | `0x7d604b31297b36aace73255931f65e891cf289d3` |
| AdaptiveCurveIRM | `0x0ac487d84507b2fbe9130acc080f2b554cb3fffe` |
| VaultFactory | `0x6e97df392462b8c2b8d13e2cd77a90168925edf6` |
| PublicAllocator | `0x35b35a8c835eaf78b43137a51c4adccfc5d653b4` |

### Oracles

| 담보 | Oracle 주소 |
|------|-------------|
| wCTC | `0x42ca12a83c14e95f567afc940b0118166d8bd852` |
| lstCTC | `0x192f1feb36f319e79b3bba25a17359ee72266a14` |
| sbUSD | `0xc39f222e034f4bd4f3c858e6fde9ce4398400a26` |

### 마켓 목록

| 마켓 | 담보 | 대출 | LLTV |
|------|------|------|------|
| wCTC / sbUSD | wCTC (18) | sbUSD (18) | 77% |
| lstCTC / sbUSD | lstCTC (18) | sbUSD (18) | 80% |
| sbUSD / USDC | sbUSD (18) | USDC (6) | 86% |

> 마켓 설정: `packages/app/src/config/lendContracts.ts`

---

## 4. 라우트 구조

| 경로 | 컴포넌트 | 설명 |
|------|----------|------|
| `/lend` | LendDashboard | 대시보드 (총 예치/대출, TVL) |
| `/lend/markets` | LendMarkets | 마켓 목록 (APY, APR, 이용률) |
| `/lend/markets/:id` | LendMarketDetail | 마켓 상세 + Supply/Borrow 패널 |
| `/lend/positions` | LendPositions | 내 포지션 (예치/대출 현황) |

---

## 5. 새 마켓 추가 절차

### 5-1. 컨트랙트 (packages/morpho)

```bash
cd packages/morpho

# deploy-viem.ts에서 createMarket 호출 추가
# 또는 별도 스크립트로 마켓 생성
```

SnowballLend.createMarket() 파라미터:
- `loanToken` — 대출 토큰 주소
- `collateralToken` — 담보 토큰 주소
- `oracle` — 가격 오라클 주소
- `irm` — 이자율 모델 주소 (AdaptiveCurveIRM)
- `lltv` — 청산 LTV (예: 77% = `770000000000000000`)

### 5-2. 프론트엔드

`packages/app/src/config/lendContracts.ts`의 `LEND_MARKETS` 배열에 추가:

```typescript
{
    id: '0x...' as `0x${string}`,  // createMarket 반환값 (market ID hash)
    name: 'NEW / PAIR',
    loanToken: '0x...' as `0x${string}`,
    collateralToken: '0x...' as `0x${string}`,
    oracle: '0x...' as `0x${string}`,
    irm: LEND_ADDRESSES.adaptiveCurveIrm as `0x${string}`,
    lltv: parseEther('0.77'),
    loanSymbol: 'PAIR',
    collSymbol: 'NEW',
    loanDecimals: 18,
    collDecimals: 18,
}
```

---

## 6. 핵심 Hooks

### 데이터 조회

| Hook | 설명 |
|------|------|
| `useLendMarkets` | 전체 마켓 데이터 (공급량, 대출량, 이자율, 오라클 가격). 10초 리프레시 |
| `useLendPosition(marketId)` | 특정 마켓의 내 포지션 (supplyShares, borrowShares, collateral) |
| `useLendPositions` | 모든 마켓의 내 포지션 일괄 조회 |

### 트랜잭션

| Hook | 설명 |
|------|------|
| `useLendSupply` | supply({ marketId, assets, shares, onBehalf }) |
| `useLendWithdraw` | withdraw({ marketId, assets, shares, onBehalf, receiver }) |
| `useLendBorrow` | borrow({ marketId, assets, shares, onBehalf, receiver }) |
| `useLendRepay` | repay({ marketId, assets, shares, onBehalf }) |
| `useLendSupplyCollateral` | supplyCollateral({ marketId, assets, onBehalf }) |
| `useLendWithdrawCollateral` | withdrawCollateral({ marketId, assets, onBehalf, receiver }) |
| `useTokenApprove` | approve({ token, spender, amount }) |

### 수학 유틸리티

`packages/app/src/lib/lendMath.ts`:
- `toAssetsDown(shares, totalAssets, totalShares)` — shares → assets 변환
- `utilization(totalBorrow, totalSupply)` — 이용률 %
- `supplyAPY(borrowAPR, util, fee)` — 공급자 수익률
- `borrowRateToAPR(ratePerSecond)` — 초당 이자율 → 연 이자율
- `calculateHealthFactor(...)` — 건강 계수 계산

---

## 7. 트러블슈팅

### Supply 실패 "ERC20: insufficient allowance"
- approve 트랜잭션이 먼저 완료되어야 함
- `useTokenApprove`로 SnowballLend 주소에 approve 필요

### Health Factor가 ∞로 표시
- 대출이 없으면 정상 (대출 0 → HF 무한대)
- 대출이 있는데 ∞이면 오라클 가격 0 확인

### 마켓 데이터가 0으로 표시
- SnowballLend 컨트랙트 주소 확인 (`lendContracts.ts`)
- 마켓 ID가 정확한지 확인 (createMarket 반환값과 일치해야)
- RPC 연결 상태 확인

### Privy 로그인 안 됨
- `VITE_PRIVY_APP_ID` 환경 변수 설정 확인
- Privy 대시보드에서 Creditcoin Testnet 네트워크 활성화 확인

---

## 8. 컨트랙트 재배포 시

Morpho 컨트랙트 재배포 후:

1. `packages/app/src/config/lendContracts.ts` 주소 전체 갱신:
   - `LEND_ADDRESSES` (core contracts)
   - `LEND_TOKENS` (토큰 주소)
   - `LEND_ORACLES` (오라클 주소)
   - `LEND_MARKETS` (마켓 ID, LLTV 등)
2. ABI 변경 시 hook 파일의 `abi` 상수 업데이트
3. dev 서버 재시작 (Vite HMR이 대부분 자동 반영)

---

## 9. TODO

### 🔴 HIGH
- [ ] ERC20 allowance 사전 체크 (approve 불필요 시 스킵)
- [ ] 트랜잭션 상태 토스트 알림 (pending → confirmed → error)
- [ ] `any` 타입 제거 (market, position 등 proper typing)

### 🟡 MEDIUM
- [ ] 청산 가격 표시 (BorrowPanel)
- [ ] 트랜잭션 시뮬레이션 후 예상 Health Factor 표시
- [ ] 마켓 목록 정렬/필터 (APY순, TVL순)

### 🟢 LOW
- [ ] 모바일 반응형 개선
- [ ] 다크/라이트 테마 전환
- [ ] 마켓 차트 (이용률, APR 히스토리)
