# 설계 - useTokenApproval

## 공유 훅 인터페이스

```typescript
function useTokenApproval({
  token?: Address,
  spender?: Address,
  amount?: bigint,
  owner?: Address,
}): {
  allowance: bigint | undefined;
  needsApproval: boolean;
  approve: () => Promise<Hash>;
  isApproving: boolean;
}
```

## 적용 대상

| 파일 | 현재 approve 로직 | 변경 후 |
|------|------------------|---------|
| useSwap.ts | allowance 조회 + approve + swap | useTokenApproval + swap |
| useAddLiquidity.ts | approve 2개(tokenA, tokenB) + mint | useTokenApproval x2 + mint |
| VaultActionDialog.tsx | allowance 조회 + approve + deposit | useTokenApproval + deposit |

## 의존성 방향

```
core/abis (erc20Abi) ← shared/hooks/useTokenApproval ← domains/*
```
