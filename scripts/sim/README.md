# Simulation & Test Scripts

> DeFi 시뮬레이션, 조회, 단위 테스트 스크립트

## 실행 방법

```bash
cd /Users/mousebook/Documents/side-project/snowball
NODE_PATH=apps/web/node_modules npx tsx scripts/sim/<script>.ts
```

## 파일 목록

### E2E / Bridge

| 파일 | 설명 | Phase |
|------|------|-------|
| simulate-dn-bridge.ts | DN Bridge 전체 E2E (CC deposit → Sepolia mint/burn → USC mint 확인) | v0.17.0 |

### DEX (Uniswap V3)

| 파일 | 설명 | Phase |
|------|------|-------|
| simulate-dex-liquidity.ts | wCTC/USDC, lstCTC/USDC, lstCTC/wCTC 풀에 LP 추가 (Whale LP 페르소나) | v0.12.0 |
| simulate-swap-volume.ts | wCTC/USDC 풀 양방향 스왑 볼륨 생성 | v0.12.0 |
| simulate-sbUSD-pools.ts | Liquity Trove에서 sbUSD mint → wCTC/sbUSD, sbUSD/USDC LP + 볼륨 | v0.12.0 |
| simulate-lstCTC-pools.ts | lstCTC/wCTC, lstCTC/USDC 스왑 볼륨 생성 | v0.12.0 |
| mint-multi-lp.ts | Account 2로 wCTC/USDC LP 민팅 | v0.4.0 |
| swap-1usd-account2.ts | Account 2로 wCTC→USDC 1달러 스왑 | v0.4.0 |
| check-pool-wctc-usdc.ts | wCTC/USDC 풀 상태 조회 (slot0, liquidity, LP positions) | v0.4.0 |

### Morpho (SnowballLend)

| 파일 | 설명 | Phase |
|------|------|-------|
| simulate-morpho-supply.ts | Morpho 마켓에 loanToken supply (Conservative Lender 페르소나) | v0.12.0 |
| simulate-morpho-borrow.ts | 담보 예치 + 대출 (Moderate/Aggressive Borrower 페르소나) | v0.12.0 |
| simulate-morpho-rebalance.ts | Morpho 포지션 리밸런싱 (repay + withdraw + re-supply) | v0.12.0 |

### Liquity

| 파일 | 설명 | Phase |
|------|------|-------|
| simulate-liquity.ts | Trove 오픈 + sbUSD mint + Stability Pool deposit 시뮬레이션 | v0.12.0 |

### 유틸리티 / 조회

| 파일 | 설명 | Phase |
|------|------|-------|
| sim-check-balances.ts | 8 페르소나 계정 종합 잔고 조회 (토큰 + Morpho + Liquity + DEX LP) | v0.12.0 |
| sim-check-state.ts | 풀 상태 + 마켓 상태 요약 조회 | v0.12.0 |
| sim-check-ticks.ts | 풀별 활성 tick range 조회 | v0.12.0 |
| sim-multi-mint.ts | 8 페르소나 계정에 토큰 대량 faucet mint | v0.12.0 |
| send-tokens.ts | deployer → 특정 계정 토큰 전송 | v0.12.0 |

### 단위 테스트

| 파일 | 설명 | Phase |
|------|------|-------|
| test-hint-fallback.ts | Liquity getInsertPosition RPC 실패 시 폴백 검증 | v0.4.0 |
| test-tick-query.ts | 온체인 tick bitmap 2-phase 조회 검증 | v0.4.0 |
| test-multicall3.ts | Multicall3 aggregate3 + viem multicall 검증 | v0.4.0 |

## 상세

### simulate-dn-bridge.ts (2026-03-07)

DN Crosschain Bridge 전체 파이프라인 E2E 테스트.
1. CC Testnet: USDC approve → BridgeVault deposit
2. Sepolia: DN Token mint → bridgeBurn
3. USC Worker가 감지 → processBridgeMint (docker 상시 운영)

테스트 결과:
- Run 0: 10 DN, 즉시 처리 (이전 burn, worker 미운영 → 시작 후 즉시 mint)
- Run 1: 5 DN, attestation ~4m30s, USC DN balance 10→15 확인
- TX hashes: 스크립트 파일 상단 주석 참조

### simulate-dex-liquidity.ts (2026-03-07)

Whale LP(Account 1)가 3개 풀에 넓은 범위 LP 추가. approve → NonfungiblePositionManager.mint.
SPL 에러 방지를 위해 보유량 5% 제한 준수.

### simulate-swap-volume.ts (2026-03-07)

wCTC/USDC 풀에 양방향 스왑 반복. Active Trader(Account 2) + Arbitrageur(Account 3) 페르소나.
SPL 방지: 스왑 금액 0.5~1.5%, 방향 교대, 실패 시 반대방향 retry.

### simulate-sbUSD-pools.ts (2026-03-07)

sbUSD는 faucet 없음 → Liquity Trove에서 mint 필요.
1. Trove 오픈 → sbUSD 획득
2. wCTC/sbUSD(fee 3000), sbUSD/USDC(fee 500) LP 추가
3. 양방향 스왑 볼륨 생성

### simulate-morpho-supply.ts (2026-03-07)

Conservative Lender(Account 4)가 wCTC/sbUSD, lstCTC/sbUSD 마켓에 loanToken(sbUSD) supply.
approve → Morpho.supply(marketParams, assets, 0, onBehalf, "").

### simulate-morpho-borrow.ts (2026-03-07)

Moderate Borrower(Account 5): 담보 예치 → 안전 대출 (HF 2.0+).
Aggressive Borrower(Account 6): 최소 담보 → 최대 대출 (HF 1.2~1.5).

### simulate-liquity.ts (2026-03-07)

wCTC + lstCTC 양쪽 branch에서 Trove 오픈. gas compensation(0.2 wCTC) 포함.
openTrove approve 패턴: wCTC branch → approve(collAmount + 0.2e18).

### sim-check-balances.ts (2026-03-07)

8 페르소나 + deployer 전체 잔고 대시보드. 토큰 잔고, Morpho 포지션(supply/borrow/collateral/HF), Liquity Trove(coll/debt/rate), DEX LP 개수.
