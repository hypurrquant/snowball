# DeFi Simulation Skill

> Snowball 프로토콜에서 8개 페르소나 계정으로 DEX/Morpho 시뮬레이션 실행

---

## 사용 시기

- "시뮬레이션 실행", "simulate", "페르소나 실행"
- "DEX 스왑 시뮬레이션", "Morpho 시뮬레이션"
- "Yield Vault 시뮬레이션", "vault deposit", "vault withdraw"
- "계정별 전략 실행", "시뮬 돌려"
- "볼륨 생성", "스왑 볼륨", "풀 볼륨 채우기"

---

## 핵심 규칙

### 유동성 제한 (필수)

**한 번의 액션에 각 토큰 보유량의 최대 5%까지만 사용 가능.**

예: wCTC 1,000 보유 시 → 1회 최대 50 wCTC.

이 규칙은 모든 프로토콜(DEX LP, Morpho Supply/Borrow, Swap)에 동일 적용.

### 실행 환경

```bash
# viem이 apps/web/node_modules에 있으므로 반드시 NODE_PATH 설정
NODE_PATH=/Users/mousebook/Documents/side-project/snowball/apps/web/node_modules npx tsx <script>
```

---

## 계정 및 페르소나

**파일**: `scripts/simulation-accounts.json`

| # | Label | Persona | Protocol | 전략 요약 |
|---|-------|---------|----------|----------|
| D | Deployer | 토큰 분배 담당 | - | 초기 설정 전용 |
| 1 | Whale LP | 큰 범위 유동성 공급 | DEX | 넓은 tick range LP, 수수료 수익 |
| 2 | Active Trader | 빈번한 스왑 | DEX | 토큰 간 회전매매 |
| 3 | Arbitrageur | 가격차 이용 | DEX | 풀 간 양방향 스왑 |
| 4 | Conservative Lender | 순수 Supply | Morpho | Supply only, 리스크 제로 |
| 5 | Moderate Borrower | 안전 대출 | Morpho | 담보 넉넉히, HF 2.0+ |
| 6 | Aggressive Borrower | 공격적 대출 | Morpho | HF 1.2~1.5 아슬아슬 |
| 7 | Multi-Market | 분산 전략 | Morpho | 여러 마켓에 supply+borrow |
| 8 | DeFi Maximalist | 복합 전략 | DEX+Morpho | LP + Morpho supply 동시 |

---

## 네트워크 및 컨트랙트

상세: [contracts.md](contracts.md)

### Quick Reference

- **Chain**: Creditcoin3 Testnet (ID: 102031)
- **RPC**: `https://rpc.cc3-testnet.creditcoin.network`
- **토큰**: wCTC, lstCTC, sbUSD, USDC (all 18 decimals)
- **DEX**: Uniswap V3 (SwapRouter, NonfungiblePositionManager, QuoterV2)
- **Morpho**: SnowballLend (3 markets: wCTC/sbUSD, lstCTC/sbUSD, sbUSD/USDC)
- **Yield**: SnowballYieldVault (4 vaults: StabilityPool sbUSD, Morpho sbUSD/wCTC/USDC)

---

## Yield Vault 시뮬레이션 가이드

상세: [yield-guide.md](yield-guide.md)

### 가능한 액션

| 액션 | 함수 | approve 필요 |
|------|------|-------------|
| Deposit | `deposit(uint256)` | want → vault |
| Deposit All | `depositAll()` | want → vault |
| Withdraw | `withdraw(uint256)` | 불필요 |
| Withdraw All | `withdrawAll()` | 불필요 |

### Vault 정보

| Vault | Want | Address |
|-------|------|---------|
| StabilityPool sbUSD | sbUSD | `0x40a8b5b8a6c1e4236da10da2731944e59444c179` |
| Morpho sbUSD | sbUSD | `0x384ebff116bb8458628b62624ab9535a4636a397` |
| Morpho wCTC | wCTC | `0x766c8bf45d7a7356f63e830c134c07911b662757` |
| Morpho USDC | USDC | `0xa6f9c033dba98f2d0fc79522b1b5c5098dc567b7` |

### Deposit 패턴 (기본)

```typescript
// 1. approve want → vault (maxUint256)
// 2. deposit(amount)  — amount는 want 토큰 수량 (18 decimals)
```

---

## DEX 시뮬레이션 가이드

상세: [dex-guide.md](dex-guide.md)

### 가능한 액션

| 액션 | 컨트랙트 | 함수 |
|------|---------|------|
| Swap | SwapRouter | `exactInputSingle` |
| Quote | QuoterV2 | `quoteExactInputSingle` |
| Add LP | NonfungiblePositionManager | `mint` |
| Remove LP | NonfungiblePositionManager | `decreaseLiquidity` → `collect` |
| Collect Fees | NonfungiblePositionManager | `collect` |
| Pool Info | Pool | `slot0`, `liquidity` |

### Swap 패턴 (기본)

```typescript
// 1. approve tokenIn → SwapRouter
// 2. exactInputSingle({ tokenIn, tokenOut, fee: 3000, recipient, deadline, amountIn, amountOutMinimum: 0, sqrtPriceLimitX96: 0n })
```

### LP 패턴 (기본)

```typescript
// 1. approve token0 → NonfungiblePositionManager
// 2. approve token1 → NonfungiblePositionManager
// 3. mint({ token0, token1, fee: 3000, tickLower, tickUpper, amount0Desired, amount1Desired, amount0Min: 0, amount1Min: 0, recipient, deadline })
```

---

## Morpho 시뮬레이션 가이드

상세: [morpho-guide.md](morpho-guide.md)

### 가능한 액션

| 액션 | 함수 | approve 필요 |
|------|------|-------------|
| Supply (대출자에게 공급) | `supply` | loanToken → SnowballLend |
| Withdraw (공급 인출) | `withdraw` | 불필요 |
| Supply Collateral (담보 예치) | `supplyCollateral` | collateralToken → SnowballLend |
| Borrow (대출) | `borrow` | 불필요 |
| Repay (상환) | `repay` | loanToken → SnowballLend |
| Withdraw Collateral (담보 인출) | `withdrawCollateral` | 불필요 |

### 마켓 정보

| Market | Loan | Collateral | LLTV |
|--------|------|------------|------|
| wCTC / sbUSD | sbUSD | wCTC | 77% |
| lstCTC / sbUSD | sbUSD | lstCTC | 77% |
| sbUSD / USDC | USDC | sbUSD | 90% |

### MarketParams 구성

```typescript
const marketParams = {
  loanToken: "...",
  collateralToken: "...",
  oracle: "...",       // LEND.oracles[collSymbol]
  irm: LEND.adaptiveCurveIRM,
  lltv: market.lltv,
};
```

---

## 시뮬레이션 스크립트 전체 목록

### DEX 스크립트

상세: [dex-guide.md](dex-guide.md), [volume-generation.md](volume-generation.md)

| 스크립트 | 용도 | 프로토콜 |
|---------|------|---------|
| `simulate-dex-liquidity.ts` | LP 추가 (bell curve 분포) | DEX |
| `simulate-swap-volume.ts` | wCTC/USDC 스왑 볼륨 | DEX |
| `simulate-sbUSD-pools.ts` | Trove→LP→스왑 (sbUSD 풀) | Liquity+DEX |
| `simulate-lstCTC-pools.ts` | lstCTC 풀 스왑 볼륨 | DEX |
| `simulate-liquity.ts` | Liquity Trove 오픈 (sbUSD 민팅) | Liquity |

### Morpho 스크립트

상세: [morpho-guide.md](morpho-guide.md)

| 스크립트 | 용도 | 실행 순서 |
|---------|------|----------|
| `simulate-morpho-supply.ts` | 전 계정 3개 마켓 loanToken supply | 1 |
| `simulate-morpho-borrow.ts` | 페르소나별 담보예치 + 대출 | 2 |
| `simulate-morpho-rebalance.ts` | utilization 조정 (target% 지정) | 3 (필요시) |

### Yield 스크립트

상세: [yield-guide.md](yield-guide.md)

| 스크립트 | 용도 | 프로토콜 |
|---------|------|---------|
| `simulate-yield-deposit.ts` | #4 계정 4개 vault deposit (5% 제한) | Yield |

### 전체 실행 순서

```bash
# DEX (먼저 — sbUSD 민팅에 Liquity 필요)
NODE_PATH=apps/web/node_modules npx tsx scripts/sim/simulate-dex-liquidity.ts
NODE_PATH=apps/web/node_modules npx tsx scripts/sim/simulate-swap-volume.ts
NODE_PATH=apps/web/node_modules npx tsx scripts/sim/simulate-sbUSD-pools.ts
NODE_PATH=apps/web/node_modules npx tsx scripts/sim/simulate-lstCTC-pools.ts

# Morpho (supply → borrow → rebalance)
NODE_PATH=apps/web/node_modules npx tsx scripts/sim/simulate-morpho-supply.ts
NODE_PATH=apps/web/node_modules npx tsx scripts/sim/simulate-morpho-borrow.ts
NODE_PATH=apps/web/node_modules npx tsx scripts/sim/simulate-morpho-rebalance.ts

# Yield (Morpho supply 이후 — vault가 Morpho에 supply하므로)
NODE_PATH=apps/web/node_modules npx tsx scripts/sim/simulate-yield-deposit.ts
```

### 실전 핵심 교훈

**DEX:**
1. SPL 에러 방지: 스왑 금액 0.5~1.5%, 방향 교대, 실패 시 반대방향 retry
2. 풀 주소: `Factory.getPool()`으로 온체인 검증 필수
3. fee tier: sbUSD/USDC는 500, 나머지 3000
4. 서버 연동: `packages/core/src/config/pools.ts`에 풀 등록

**Morpho:**
5. sbUSD faucet 없음 → Liquity Trove에서만 민팅 → supply 양이 제한적
6. supply 먼저 충분히 넣은 후 borrow (안 그러면 utilization 99% 급등)
7. Oracle 1e36 스케일 필수 (CreditcoinOracle)
8. utilization 조정은 rebalance 스크립트 활용

**Yield:**
9. sbUSD 2개 vault 분배: 5% 한도를 반으로 나눠 각 vault에 2.5%
10. Morpho vault는 harvest() 실행 전까지 APY 0 — 전략이 Morpho에 supply해야 수익 발생
11. approve는 maxUint256 권장 (시뮬레이션에서 TX 절약)
12. withdrawAll() 사용 시 BigInt 정밀도 손실 없이 전액 인출 가능

---

## 페르소나별 전략 상세

상세: [personas.md](personas.md)

### DEX 페르소나

- **#1 Whale LP**: 넓은 범위(-60000~+60000 tick) LP. amount = 보유량의 5%.
- **#2 Active Trader**: 3~5회 연속 스왑. wCTC→USDC→lstCTC→wCTC 순환.
- **#3 Arbitrageur**: 두 풀(wCTC/USDC, lstCTC/USDC) 간 가격 비교 후 저평가 매수.

### Morpho 페르소나

- **#4 Conservative Lender**: 3개 마켓 loanToken supply only. borrow 절대 안 함.
- **#5 Moderate Borrower**: wCTC 담보 예치 → sbUSD 대출. HF 2.0+ 목표.
- **#6 Aggressive Borrower**: wCTC 담보 → sbUSD 대출. HF 1.2~1.5 목표 (유동성 부족 시 제한).
- **#7 Multi-Market**: lstCTC/sbUSD + sbUSD/USDC 마켓에 분산 borrow.
- **#8 DeFi Maximalist**: Morpho supply + borrow + DEX LP 동시 운용.

---

## 스크립트 실행 패턴

```typescript
import { createPublicClient, createWalletClient, http, parseEther } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { defineChain } from "viem";
import accounts from "./simulation-accounts.json";

const cc3Testnet = defineChain({
  id: 102031,
  name: "Creditcoin3 Testnet",
  nativeCurrency: { name: "CTC", symbol: "tCTC", decimals: 18 },
  rpcUrls: { default: { http: ["https://rpc.cc3-testnet.creditcoin.network"] } },
});

const transport = http("https://rpc.cc3-testnet.creditcoin.network");
const publicClient = createPublicClient({ chain: cc3Testnet, transport });

// 계정 로드
const persona = accounts.accounts[0]; // #1 Whale LP
const account = privateKeyToAccount(persona.privateKey as `0x${string}`);
const walletClient = createWalletClient({ account, chain: cc3Testnet, transport });
```

---

## 체크리스트

시뮬레이션 스크립트 작성 시:

- [ ] 5% 유동성 제한 준수
- [ ] approve → write 순서 (supply, supplyCollateral, repay, swap, mint)
- [ ] waitForTransactionReceipt 후 다음 tx
- [ ] gas 충분한지 확인 (CTC 잔고)
- [ ] 스크립트는 `scripts/` 디렉토리에 저장
- [ ] NODE_PATH 설정 필수

---

**스킬 상태**: 활성
