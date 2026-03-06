# Morpho (SnowballLend) 시뮬레이션 가이드

## MarketParams 구성

모든 Morpho 함수에 `marketParams` 튜플이 필요. 마켓 ID에서 조립:

```typescript
const MARKETS = {
  "wCTC/sbUSD": {
    id: "0xfb2641d76f7e8a4170560c308a158508651a22e3f40110f99008ca892767f261",
    params: {
      loanToken: "0x5772f9415b75ecca00e7667e0c7d730db3b29fbd",      // sbUSD
      collateralToken: "0xdb5c8e9d0827c474342bea03e0e35a60d621afea", // wCTC
      oracle: "0x42ca12a83c14e95f567afc940b0118166d8bd852",
      irm: "0x0ac487d84507b2fbe9130acc080f2b554cb3fffe",
      lltv: 770000000000000000n,
    },
  },
  "lstCTC/sbUSD": {
    id: "0x35cfd9e93f81434c0f3e6e688a42775e53fc442163cc960090efcc4c2ef8488e",
    params: {
      loanToken: "0x5772f9415b75ecca00e7667e0c7d730db3b29fbd",      // sbUSD
      collateralToken: "0x47ad69498520edb2e1e9464fedf5309504e26207", // lstCTC
      oracle: "0x192f1feb36f319e79b3bba25a17359ee72266a14",
      irm: "0x0ac487d84507b2fbe9130acc080f2b554cb3fffe",
      lltv: 770000000000000000n,
    },
  },
  "sbUSD/USDC": {
    id: "0x3df89a2c4e307c088bc4ddff74f5e0dc246404b7a1c0096771d1fa6b080fb681",
    params: {
      loanToken: "0x3e31b08651644b9e6535f5bf0c7a9e7e6ad92e02",      // USDC
      collateralToken: "0x5772f9415b75ecca00e7667e0c7d730db3b29fbd", // sbUSD
      oracle: "0xc39f222e034f4bd4f3c858e6fde9ce4398400a26",
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
