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
