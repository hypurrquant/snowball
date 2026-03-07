# Morpho (SnowballLend) 시뮬레이션 가이드

## MarketParams 구성

모든 Morpho 함수에 `marketParams` 튜플이 필요. 마켓 ID에서 조립:

```typescript
const MORPHO = "0x190a733eda9ba7d2b52d56764c5921d5cd4752ca";
const IRM = "0xc4c694089af9bab4c6151663ae8424523fce32a8";

const MARKETS = {
  "wCTC/sbUSD": {
    id: "0x5aa4edaf3dcbf0e54abbf2bb639acbdc95305f61bd4a4f4801d42040998c5752",
    params: {
      loanToken: "0x8aefed3e2e9a886bdd72ec9cebe27d7aabced2a5",      // sbUSD
      collateralToken: "0xca69344e2917f026ef4a5ace5d7b122343fc8528", // wCTC
      oracle: "0xbd2c8afda5fa753669c5dd03885a45a3612171af",
      irm: IRM,
      lltv: 770000000000000000n,
    },
  },
  "lstCTC/sbUSD": {
    id: "0x2eea8a6ba032c2af6adef715c6f9ed1068e77782c7d8e127a3975389e8bedd0e",
    params: {
      loanToken: "0x8aefed3e2e9a886bdd72ec9cebe27d7aabced2a5",      // sbUSD
      collateralToken: "0xa768d376272f9216c8c4aa3063391bdafbcad4c2", // lstCTC
      oracle: "0xa9aeac36aab8ce93fe4a3d63cf6b1d263dd2eb31",
      irm: IRM,
      lltv: 770000000000000000n,
    },
  },
  "sbUSD/USDC": {
    id: "0x3a94c96ec40aa5fe54bcd20ecbcd733497e4f4f2c8d31ae4862951b20f992a0c",
    params: {
      loanToken: "0x60e204104cfe1a93f630ea5ebc0a895cc80ebed9",      // USDC
      collateralToken: "0x8aefed3e2e9a886bdd72ec9cebe27d7aabced2a5", // sbUSD
      oracle: "0xf82396f39e93d77802bfecc33344faafc4df50f2",
      irm: IRM,
      lltv: 900000000000000000n,
    },
  },
};
```

---

## 액션별 코드 패턴

### Supply (공급자 역할 — loanToken 공급)

```typescript
const amount = parseEther("50"); // 5% of 1000
// 1. approve loanToken -> SnowballLend
await walletClient.writeContract({
  address: market.params.loanToken, abi: MockERC20ABI,
  functionName: "approve", args: [MORPHO, amount],
});
// 2. supply
const hash = await walletClient.writeContract({
  address: MORPHO, abi: SnowballLendABI,
  functionName: "supply",
  args: [market.params, amount, 0n, account.address, "0x"],
});
await publicClient.waitForTransactionReceipt({ hash });
```

### Withdraw (공급 인출)

```typescript
const hash = await walletClient.writeContract({
  address: MORPHO, abi: SnowballLendABI,
  functionName: "withdraw",
  args: [market.params, amount, 0n, account.address, account.address],
});
```

### Supply Collateral (담보 예치)

```typescript
// approve collateralToken -> SnowballLend
// supplyCollateral(marketParams, amount, onBehalf, data)
const hash = await walletClient.writeContract({
  address: MORPHO, abi: SnowballLendABI,
  functionName: "supplyCollateral",
  args: [market.params, amount, account.address, "0x"],
});
```

### Borrow (대출)

```typescript
// approve 불필요
const hash = await walletClient.writeContract({
  address: MORPHO, abi: SnowballLendABI,
  functionName: "borrow",
  args: [market.params, amount, 0n, account.address, account.address],
});
```

### Repay (상환)

```typescript
// approve loanToken -> SnowballLend
const hash = await walletClient.writeContract({
  address: MORPHO, abi: SnowballLendABI,
  functionName: "repay",
  args: [market.params, amount, 0n, account.address, "0x"],
});
```

### Withdraw Collateral (담보 인출)

```typescript
const hash = await walletClient.writeContract({
  address: MORPHO, abi: SnowballLendABI,
  functionName: "withdrawCollateral",
  args: [market.params, amount, account.address, account.address],
});
```

---

## Position 조회

```typescript
const [supplyShares, borrowShares, collateral] = await publicClient.readContract({
  address: MORPHO, abi: SnowballLendABI,
  functionName: "position",
  args: [marketId, account.address],
});
```

## Market 상태 조회

```typescript
const [totalSupplyAssets, totalSupplyShares, totalBorrowAssets, totalBorrowShares, lastUpdate, fee] =
  await publicClient.readContract({
    address: MORPHO, abi: SnowballLendABI,
    functionName: "market", args: [marketId],
  });
```

---

## Oracle Scale

- **1e36 스케일** (Morpho Blue 표준, CreditcoinOracle)
- wCTC: 5e36, lstCTC: 5.2e36, sbUSD: 1e36
- `price()` 반환값은 collateral/loan 가격 비율

## Health Factor 계산

```typescript
// HF = (collateral * oraclePrice / 1e36 * LLTV / 1e18) / borrowAssets
// LLTV는 1e18 기준 (77% = 770000000000000000n)
const collateralValue = collateral * oraclePrice / (10n ** 36n);
const maxBorrow = collateralValue * lltv / (10n ** 18n);
const hf = borrowAssets > 0n
  ? Number(maxBorrow * (10n ** 18n) / borrowAssets) / 1e18
  : Infinity;
```

### HF 가이드라인

| 페르소나 | 목표 HF | 담보:대출 비율 |
|---------|---------|--------------|
| Conservative (#4) | Infinity (borrow 안함) | supply only |
| Moderate (#5) | 2.0+ | 담보의 ~38% 대출 |
| Aggressive (#6) | 1.2~1.5 | 담보의 ~55% 대출 |

---

## 시뮬레이션 스크립트

### 스크립트 목록

| 스크립트 | 용도 | 실행 순서 |
|---------|------|----------|
| `scripts/simulate-morpho-supply.ts` | 전 계정 3개 마켓 loanToken supply | 1 (먼저) |
| `scripts/simulate-morpho-borrow.ts` | 페르소나별 담보예치 + 대출 | 2 (supply 후) |

### 실행

```bash
# 1. Supply (8 계정 × 3 마켓 = 24 tx)
NODE_PATH=apps/web/node_modules npx tsx scripts/simulate-morpho-supply.ts

# 2. Borrow (5 operations)
NODE_PATH=apps/web/node_modules npx tsx scripts/simulate-morpho-borrow.ts
```

### Supply 스크립트 동작

- 8개 페르소나 계정 전부 참여
- 각 마켓의 loanToken 잔액의 **5%** supply
- wCTC/sbUSD, lstCTC/sbUSD → sbUSD 5% supply
- sbUSD/USDC → USDC 5% supply
- approve → supply → waitForReceipt 순서

### Borrow 스크립트 동작

- 페르소나별 목표 HF에 맞춰 담보 예치 + 대출
- collateral은 잔액의 **5%** 사용
- available liquidity의 90%까지만 대출 (10% 버퍼)
- 순서: approve → supplyCollateral → borrow → position 확인

```typescript
// Borrow amount 계산 (target HF 기반)
const collateralValue = (collAmount * oraclePrice) / ORACLE_SCALE;
const maxBorrow = (collateralValue * lltv) / WAD;
const borrowAmount = (maxBorrow * WAD) / BigInt(Math.floor(targetHF * 1e18));
```

---

## 시뮬레이션 결과 (2026-03-07)

### Supply 결과 (전 계정)

| 마켓 | Total Supply | 참여 계정 |
|------|-------------|----------|
| wCTC/sbUSD | 273.85 sbUSD | 8명 |
| lstCTC/sbUSD | 273.85 sbUSD | 8명 |
| sbUSD/USDC | 3,847.71 USDC | 8명 |

### Borrow 결과

| 페르소나 | 마켓 | 담보 | 대출 | HF |
|---------|------|------|------|-----|
| #5 Moderate | wCTC/sbUSD | 465 wCTC | 246.5 sbUSD | 7.26 |
| #6 Aggressive | wCTC/sbUSD | 500 wCTC | 24.6 sbUSD | 78.1 |
| #7 Multi (lstCTC) | lstCTC/sbUSD | 500 lstCTC | 246.5 sbUSD | 8.12 |
| #7 Multi (sbUSD) | sbUSD/USDC | 51.6 sbUSD | 23.2 USDC | 2.00 |
| #8 Maximalist | lstCTC/sbUSD | 500 lstCTC | 24.6 sbUSD | 81.2 |

### Market State (After Rebalance)

| 마켓 | Supply | Borrow | Utilization |
|------|--------|--------|-------------|
| wCTC/sbUSD | 492.93 | 271.11 | 55.0% |
| lstCTC/sbUSD | 492.93 | 271.11 | 55.0% |
| sbUSD/USDC | 3,847.71 | 23.20 | 0.6% |

### Rebalance 스크립트

초기 borrow 후 utilization 99%까지 치솟아 `simulate-morpho-rebalance.ts`로 추가 supply 실행.

```bash
# utilization을 55%로 낮추기
NODE_PATH=apps/web/node_modules npx tsx scripts/simulate-morpho-rebalance.ts
```

스크립트 동작: target utilization 계산 → 필요 supply 산출 → sbUSD 잔고 높은 계정 순서대로 5%씩 supply

### 교훈

1. **sbUSD 유동성 부족**: sbUSD는 faucet 없고 Liquity Trove에서만 민팅 → 마켓 유동성이 작아 borrow가 제한됨
2. **HF가 목표보다 높음**: available liquidity 제한으로 실제 borrow < 계획 → HF가 목표보다 훨씬 높게 나옴
3. **utilization 급등 주의**: 초기 borrow만으로 99%까지 치솟을 수 있음 → supply 충분히 넣은 후 borrow 실행 권장
4. **rebalance 스크립트 활용**: utilization 조정이 필요하면 rebalance 스크립트로 target% 지정하여 실행
