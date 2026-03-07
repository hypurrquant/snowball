# Yield Vault 시뮬레이션 가이드

## Vault 목록

| Vault | Address | Want Token | Strategy |
|-------|---------|------------|----------|
| StabilityPool sbUSD | `0x40a8b5b8a6c1e4236da10da2731944e59444c179` | sbUSD | Liquity 청산 수익 자동 복리 |
| Morpho sbUSD | `0x384ebff116bb8458628b62624ab9535a4636a397` | sbUSD | SnowballLend sbUSD 공급 이자 |
| Morpho wCTC | `0x766c8bf45d7a7356f63e830c134c07911b662757` | wCTC | SnowballLend wCTC 공급 이자 |
| Morpho USDC | `0xa6f9c033dba98f2d0fc79522b1b5c5098dc567b7` | USDC | SnowballLend USDC 공급 이자 |

## ABI (SnowballYieldVault)

| 함수 | 용도 | approve 필요 |
|------|------|-------------|
| `deposit(uint256 _amount)` | want 토큰을 vault에 예치 | want → vault |
| `depositAll()` | want 잔고 전액 예치 | want → vault |
| `withdraw(uint256 _shares)` | share 수량 지정 인출 | 불필요 |
| `withdrawAll()` | 전체 share 인출 | 불필요 |
| `getPricePerFullShare()` | share당 want 가격 (view) | - |
| `balance()` | vault 총 TVL (view) | - |
| `balanceOf(address)` | 유저 share 수량 (view) | - |

## Deposit 패턴

```typescript
import { maxUint256 } from "viem";

// 1. approve want → vault
await walletClient.writeContract({
  address: wantToken,
  abi: ERC20_ABI,
  functionName: "approve",
  args: [vaultAddress, maxUint256],
});

// 2. deposit
await walletClient.writeContract({
  address: vaultAddress,
  abi: SnowballYieldVaultABI,
  functionName: "deposit",
  args: [amount],  // want 토큰 수량 (18 decimals)
});
```

## Withdraw 패턴

```typescript
// share 수량 지정 인출
await walletClient.writeContract({
  address: vaultAddress,
  abi: SnowballYieldVaultABI,
  functionName: "withdraw",
  args: [shareAmount],  // share 수량
});

// 전체 인출 (BigInt 정밀도 손실 방지)
await walletClient.writeContract({
  address: vaultAddress,
  abi: SnowballYieldVaultABI,
  functionName: "withdrawAll",
});
```

## 5% 제한 시 sbUSD 분배 전략

sbUSD는 2개 Vault(StabilityPool, Morpho sbUSD)에서 사용하므로 5% 한도를 반으로 분배:

```typescript
const sbUSD5pct = sbUSDBalance * 5n / 100n;
const sbUSDperVault = sbUSD5pct / 2n;  // 각 vault에 2.5%씩
```

## 실전 교훈

1. **Vault TVL 확인 먼저**: `balance()` 호출로 현재 TVL 확인
2. **PPS 확인**: `getPricePerFullShare()`가 1e18이면 초기 상태, 그 이상이면 수익 발생
3. **sbUSD 부족 주의**: faucet 없음, Liquity Trove에서만 민팅 가능
4. **Morpho vault는 전략 실행 필요**: deposit만으로는 APY가 0. harvest()가 실행되어야 수익 반영
5. **approve는 maxUint256 권장**: 시뮬레이션에서는 무한 approve로 TX 절약

## 기존 스크립트

| 스크립트 | 용도 |
|---------|------|
| `scripts/sim/simulate-yield-deposit.ts` | #4 Conservative Lender가 4개 vault에 deposit (5% 제한) |
