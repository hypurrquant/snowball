# Pool Volume Generation 가이드

> 5개 DEX 풀에 스왑 볼륨을 생성한 실전 경험 정리

---

## 실행 결과 요약 (2026-03-07)

| Pool | TVL | 24H Volume | APR | Swaps | Fee |
|------|-----|-----------|-----|-------|-----|
| wCTC / USDC | $1.5K | $6.6K | 471.5% | 23 | 0.30% |
| wCTC / sbUSD | $10.9K | $22.9K | 230.6% | 52 | 0.30% |
| sbUSD / USDC | $3.6K | $2.7K | 13.5% | 50 | 0.05% |
| lstCTC / wCTC | $2.7K | $9.3K | 380.5% | 20 | 0.30% |
| lstCTC / USDC | $1.1K | $4.9K | 507.0% | 18 | 0.30% |

**합계**: $19.7K TVL, $46.3K Volume, $132 Fees

---

## 스크립트 목록

| 스크립트 | 용도 | 풀 |
|---------|------|-----|
| `scripts/simulate-dex-liquidity.ts` | LP 추가 (분포별 5 positions) | wCTC/USDC, lstCTC/USDC, lstCTC/wCTC |
| `scripts/simulate-swap-volume.ts` | 스왑 볼륨 생성 | wCTC/USDC |
| `scripts/simulate-sbUSD-pools.ts` | Trove→LP→스왑 | wCTC/sbUSD, sbUSD/USDC |
| `scripts/simulate-lstCTC-pools.ts` | 스왑 볼륨 생성 | lstCTC/wCTC, lstCTC/USDC |
| `scripts/simulate-liquity.ts` | Liquity Trove 오픈 | (sbUSD 민팅용) |

### 실행 순서

```bash
# 1. 유동성 추가 (wCTC/USDC, lstCTC 풀)
NODE_PATH=apps/web/node_modules npx tsx scripts/simulate-dex-liquidity.ts

# 2. wCTC/USDC 스왑 볼륨
NODE_PATH=apps/web/node_modules npx tsx scripts/simulate-swap-volume.ts

# 3. sbUSD 풀 (Trove → LP → 스왑)
NODE_PATH=apps/web/node_modules npx tsx scripts/simulate-sbUSD-pools.ts

# 4. lstCTC 풀 스왑 볼륨
NODE_PATH=apps/web/node_modules npx tsx scripts/simulate-lstCTC-pools.ts
```

---

## 풀별 특성

### wCTC / USDC (fee: 3000)

- **token0**: USDC (0x60...), **token1**: wCTC (0xca...)
- 초기 유동성: simulate-dex-liquidity.ts로 bell curve 분포 LP
- 스왑 계정: #2 Active Trader, #3 Arbitrageur (각 5회)

### wCTC / sbUSD (fee: 3000)

- **token0**: sbUSD (0x8a...), **token1**: wCTC (0xca...)
- sbUSD 획득: Liquity wCTC Trove에서 borrow
- LP 계정: #1, #5, #8 (200 토큰씩)
- 스왑 계정: #2, #3 (각 5회)

### sbUSD / USDC (fee: 500)

- **token0**: USDC (0x60...), **token1**: sbUSD (0x8a...)
- **주의**: fee가 500 (0.05%) — stablecoin pair
- **tickSpacing**: 10 (다른 풀은 60)
- LP 계정: #1, #5, #8 (200 토큰씩)
- 스왑 계정: #2, #3 (각 5회)

### lstCTC / wCTC (fee: 3000)

- **token0**: lstCTC (0xa7...), **token1**: wCTC (0xca...)
- 초기 유동성: simulate-dex-liquidity.ts로 leptokurtic 분포 LP
- 스왑 계정: #2, #3 (각 5회)

### lstCTC / USDC (fee: 3000)

- **token0**: USDC (0x60...), **token1**: lstCTC (0xa7...)
- 초기 유동성: simulate-dex-liquidity.ts로 right-skewed 분포 LP
- 스왑 계정: #2, #3 (각 5회)

---

## 실전 패턴 & 트러블슈팅

### SPL 에러 (sqrtPriceLimitX96)

**증상**: `exactInputSingle` revert with "SPL"

**원인**: 한 방향으로 스왑이 몰려 가격이 유동성 범위 밖으로 밀림 (max tick 887271 도달)

**해결**:
1. 스왑 금액을 0.5~1.5% 범위로 축소 (기존 2~5%에서)
2. 방향을 번갈아가며 스왑 (A→B, B→A 교대)
3. 실패 시 반대 방향으로 자동 재시도

```typescript
// 실패 시 반대 방향 retry 패턴
let ok = await doSwap(wallet, addr, tIn, tOut, fee, amountIn, label);
if (!ok) {
  const altBal = await bal(tOut, addr);
  const altAmt = (altBal * BigInt(Math.round(pct * 100))) / 10000n;
  if (altAmt > 0n) {
    ok = await doSwap(wallet, addr, tOut, tIn, fee, altAmt, `${label}r`);
  }
}
```

### 풀 주소 불일치

**증상**: 서버가 볼륨을 수집하지 못함 (0으로 표시)

**원인**: `packages/core/src/config/pools.ts`의 주소가 이전 배포 주소

**해결**: Factory.getPool()으로 온체인 정식 주소 조회 후 업데이트

```typescript
// 풀 주소 검증
const pool = await publicClient.readContract({
  address: FACTORY, abi: FactoryABI,
  functionName: "getPool",
  args: [tokenA, tokenB, fee],
});
```

### sbUSD 획득 방법

sbUSD는 faucet/mint 없음. Liquity Trove에서만 발행 가능.

```
wCTC approve(collAmount + 0.2e18) → BorrowerOperations
openTrove(owner, 0, collAmount, boldAmount, 0, 0, rate, maxUint256, 0x0, 0x0, 0x0)
```

- **ETH_GAS_COMPENSATION**: 0.2 wCTC (모든 branch 공통)
- **lstCTC branch**: lstCTC approve(collAmount) + wCTC approve(0.2e18) 별도 필요
- **MIN_DEBT**: 10 sbUSD
- **rate**: parseEther("0.05") ~ parseEther("0.10") 범위 권장

### RPC 타임아웃

**증상**: 스왑 중간에 RPC 응답 없음

**해결**: 20초 대기 후 재실행. 스크립트는 멱등성 있게 설계 (이미 완료된 작업 skip).

### top-level await 에러

**증상**: `tsx -e` 인라인 실행 시 CJS 포맷 에러

**해결**: 반드시 `.ts` 파일로 작성하여 `npx tsx <file>` 실행

---

## 스왑 볼륨 생성 템플릿

새 풀에 볼륨을 생성할 때 이 패턴을 따른다:

```typescript
async function swapVolume(
  personaIdx: number,      // accounts.json 배열 인덱스 (0-based)
  tokenA: Address,         // 첫 번째 토큰
  tokenB: Address,         // 두 번째 토큰
  fee: number,             // 풀 fee tier (500 | 3000 | 10000)
  numSwaps: number,        // 스왑 횟수
) {
  const persona = accounts.accounts[personaIdx];
  const wallet = makeWallet(persona.privateKey);
  const addr = wallet.account.address;

  for (let i = 0; i < numSwaps; i++) {
    const useA = i % 2 === 0;           // 방향 교대
    const tIn = useA ? tokenA : tokenB;
    const tOut = useA ? tokenB : tokenA;
    const tInBal = await bal(tIn, addr);

    // 5% rule: 0.5~1.5% per swap
    const pct = 0.5 + Math.random() * 1.0;
    const amountIn = (tInBal * BigInt(Math.round(pct * 100))) / 10000n;
    if (amountIn === 0n) continue;

    let ok = await doSwap(wallet, addr, tIn, tOut, fee, amountIn, label);
    if (!ok) { /* retry opposite direction */ }
  }
}
```

### 핵심 체크리스트

- [ ] 풀에 유동성이 있는지 먼저 확인 (`pool.liquidity()`)
- [ ] fee tier 확인 (sbUSD/USDC는 500, 나머지는 3000)
- [ ] token0/token1 순서 확인 (주소값 오름차순)
- [ ] 스왑 금액 0.5~1.5% (SPL 방지)
- [ ] 방향 교대 + 실패 시 반대방향 retry
- [ ] 서버가 수집하도록 `packages/core/src/config/pools.ts`에 풀 등록 필요
