# Morpho (SnowballLend) 시뮬레이션 가이드

## MarketParams 구성

모든 Morpho 함수에 `marketParams` 튜플이 필요. 마켓 ID에서 조립:

```typescript
const MARKETS = {
  "wCTC/sbUSD": {
    id: "0x8dce00fbd59450e4d2f46e9aa637690fc21c058c4c8abf4dea75e9ab2ce38364",
    params: {
      loanToken: "0x8aefed3e2e9a886bdd72ec9cebe27d7aabced2a5",      // sbUSD
      collateralToken: "0xca69344e2917f026ef4a5ace5d7b122343fc8528", // wCTC
      oracle: "0xf3c292721011ef0f5bff2b4657a1d32b15a34fa2",
      irm: "0x0ac487d84507b2fbe9130acc080f2b554cb3fffe",
      lltv: 770000000000000000n,
    },
  },
  "lstCTC/sbUSD": {
    id: "0x93c1cf16ce13082a758d11757a899388741c39c4ed01364116137074fc9671ae",
    params: {
      loanToken: "0x8aefed3e2e9a886bdd72ec9cebe27d7aabced2a5",      // sbUSD
      collateralToken: "0xa768d376272f9216c8c4aa3063391bdafbcad4c2", // lstCTC
      oracle: "0xff5f8a4c3f41d6bd0247d9655cebda9e3246712a",
      irm: "0x0ac487d84507b2fbe9130acc080f2b554cb3fffe",
      lltv: 770000000000000000n,
    },
  },
  "sbUSD/USDC": {
    id: "0x6708534b3aa0dc0b77dd4e534187d801f664958238b45b0563e63dbfe914fddd",
    params: {
      loanToken: "0x60e204104cfe1a93f630ea5ebc0a895cc80ebed9",      // USDC
      collateralToken: "0x8aefed3e2e9a886bdd72ec9cebe27d7aabced2a5", // sbUSD
      oracle: "0x32fc6b26d7f5f0af091f196e1cac66678a0ef84a",
      irm: "0x0ac487d84507b2fbe9130acc080f2b554cb3fffe",
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
// 1. approve loanToken → SnowballLend
await walletClient.writeContract({
  address: market.params.loanToken, abi: MockERC20ABI,
  functionName: "approve", args: [LEND.snowballLend, amount],
});
// 2. supply
const hash = await walletClient.writeContract({
  address: LEND.snowballLend, abi: SnowballLendABI,
  functionName: "supply",
  args: [market.params, amount, 0n, account.address, "0x"],
});
await publicClient.waitForTransactionReceipt({ hash });
```

### Withdraw (공급 인출)

```typescript
const hash = await walletClient.writeContract({
  address: LEND.snowballLend, abi: SnowballLendABI,
  functionName: "withdraw",
  args: [market.params, amount, 0n, account.address, account.address],
});
```

### Supply Collateral (담보 예치)

```typescript
// approve collateralToken → SnowballLend
// supplyCollateral(marketParams, amount, onBehalf, data)
const hash = await walletClient.writeContract({
  address: LEND.snowballLend, abi: SnowballLendABI,
  functionName: "supplyCollateral",
  args: [market.params, amount, account.address, "0x"],
});
```

### Borrow (대출)

```typescript
// approve 불필요
const hash = await walletClient.writeContract({
  address: LEND.snowballLend, abi: SnowballLendABI,
  functionName: "borrow",
  args: [market.params, amount, 0n, account.address, account.address],
});
```

### Repay (상환)

```typescript
// approve loanToken → SnowballLend
const hash = await walletClient.writeContract({
  address: LEND.snowballLend, abi: SnowballLendABI,
  functionName: "repay",
  args: [market.params, amount, 0n, account.address, "0x"],
});
```

### Withdraw Collateral (담보 인출)

```typescript
const hash = await walletClient.writeContract({
  address: LEND.snowballLend, abi: SnowballLendABI,
  functionName: "withdrawCollateral",
  args: [market.params, amount, account.address, account.address],
});
```

---

## Position 조회

```typescript
const [supplyShares, borrowShares, collateral] = await publicClient.readContract({
  address: LEND.snowballLend, abi: SnowballLendABI,
  functionName: "position",
  args: [marketId, account.address],
});
```

## Market 상태 조회

```typescript
const [totalSupplyAssets, totalSupplyShares, totalBorrowAssets, totalBorrowShares, lastUpdate, fee] =
  await publicClient.readContract({
    address: LEND.snowballLend, abi: SnowballLendABI,
    functionName: "market", args: [marketId],
  });
```

---

## Health Factor 계산

```typescript
// HF = (collateral * LLTV) / borrowAssets
// LLTV는 1e18 기준 (77% = 770000000000000000n)
const hf = borrowAssets > 0n
  ? Number(collateral * lltv / borrowAssets) / 1e18
  : Infinity;
```

### HF 가이드라인

| 페르소나 | 목표 HF | 담보:대출 비율 |
|---------|---------|--------------|
| Conservative (#4) | ∞ (borrow 안함) | supply only |
| Moderate (#5) | 2.0+ | 담보의 ~38% 대출 |
| Aggressive (#6) | 1.2~1.5 | 담보의 ~55% 대출 |
