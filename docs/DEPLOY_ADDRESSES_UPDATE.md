# 배포 주소 업데이트 — 프론트엔드 반영 필요

> 날짜: 2026-02-27
> 대상: `packages/frontend/src/config/addresses.ts`
> 관련 배포 파일: `deployments/creditcoin-testnet/algebra.json`, `yield.json`

---

## 요약

Algebra DEX와 Yield Vault가 Creditcoin Testnet에 배포 완료되었습니다.
`addresses.ts`에서 아래 **2개 섹션**을 교체해주세요.

---

## 1. DEX 주소 교체

기존 DEX 주소가 **이전 배포본(무효)** 입니다. 아래로 교체하세요.

```typescript
// ─── DEX (Algebra V4 Integral) ───
export const DEX = {
  snowballFactory: "0xd478a63345d7cd17881a540e15943919604691f6" as Address,
  snowballPoolDeployer: "0x1ff0fa39ae0db2c37b400fbbaf234ad6eee3bd86" as Address,
  snowballRouter: "0xd604593426538fd1fa5b2660e3e443fa1ce93411" as Address,
  dynamicFeePlugin: "0x5b0901f4c205fa4a92bbc3fecaef9b0b72ef4246" as Address,
  nonfungiblePositionManager: "0x54b8584dd202cee8db0fbfa3522f78cb7d9bf6dd" as Address,
  quoterV2: "0xeb2b122a28dceaeecb87b745173d6aa3c990d5c0" as Address,
} as const;
```

### DEX 풀 주소 (필요시 참고)

| 풀 | 주소 |
|----|------|
| sbUSD / USDC | `0x2CB59078c54DcBc94D378f0E09c89C6c1e61Dc07` |
| wCTC / sbUSD | `0xECA2908d81aC151A6f530b7f91E41C02704E65E2` |
| wCTC / USDC | `0x992C2B184807Ce60132a535791b44142CA198D10` |
| lstCTC / wCTC | `0x134D6F5D497538842adf361bD198c393D32321A2` |

---

## 2. Yield Vault 주소 교체

placeholder(0x0000...) 주소를 실제 배포 주소로 교체하세요.

```typescript
// ─── Yield Vaults (Beefy V7 Fork) ───
export const YIELD = {
  vaults: [
    {
      address: "0x8d0ed3fd144530fb2e763ecb68993fd6e73cc511" as Address,
      strategy: "0xa15d3d2eaefcc677d2255f2fc7f5c1c59f0904a4" as Address,
      want: TOKENS.sbUSD,
      wantSymbol: "sbUSD",
      name: "Stability Pool",
      description: "Liquity 청산 수익 자동 복리",
    },
    {
      address: "0x8076a963a86daa86ee8f0929c03d075e2bd62ccf" as Address,
      strategy: "0x5c3f1b8d16abb5114f08ed7d9c6aa2ab425fcfdb" as Address,
      want: TOKENS.sbUSD,
      wantSymbol: "sbUSD",
      name: "Morpho sbUSD",
      description: "SnowballLend sbUSD 공급 이자",
    },
    {
      address: "0x3927608bdbb9165deeb518b07cef4e3efadaaefc" as Address,
      strategy: "0x6aac79123e76075ace9777e41dee8212c4b13ea0" as Address,
      want: TOKENS.wCTC,
      wantSymbol: "wCTC",
      name: "Morpho wCTC",
      description: "SnowballLend wCTC 공급 이자",
    },
    {
      address: "0xb5fd93247f0fd8cbf3b8db7963e699e35bc79b97" as Address,
      strategy: "0xb76d6fbc6403d4890202e9c6cd39cecd078ac734" as Address,
      want: TOKENS.USDC,
      wantSymbol: "USDC",
      name: "Morpho USDC",
      description: "SnowballLend USDC 공급 이자",
    },
  ],
} as const;
```

---

## 중요: DEX `deployer` 파라미터

**DEX 함수 호출 시 `deployer` 파라미터는 반드시 `address(0)` (`0x0000...0000`)을 사용해야 합니다.**

Standard pool은 `deployer = address(0)`로 생성됩니다. QuoterV2, Router, NFTManager 등에서 `deployer` 인자를 넘길 때:
```typescript
// ✅ 올바른 사용
const deployer = "0x0000000000000000000000000000000000000000";

// ❌ 틀린 사용 (PoolDeployer 주소 아님!)
const deployer = DEX.snowballPoolDeployer; // 이거 쓰면 revert
```

---

## 3. 온체인 통합 테스트 결과 (최종 — 35/35 PASS)

LP, Swap, Vault Deposit/Withdraw 모두 실제 트랜잭션으로 검증 완료.

| 테스트 | 결과 | 비고 |
|--------|------|------|
| QuoterV2 (quote) | ✅ | 10 wCTC → sbUSD |
| NFTManager.mint (LP) | ✅ | wCTC/sbUSD full range |
| Router.exactInputSingle (swap) | ✅ | 5 wCTC → ~4.0 sbUSD |
| sbUSD-Morpho deposit/withdraw | ✅ | 20 sbUSD → 20 shares, 50% withdraw |
| wCTC-Morpho deposit/withdraw | ✅ | 75 wCTC → 75 shares, 50% withdraw |
| sbUSD-SP deposit/withdraw | ✅ | 20 sbUSD → 20 shares, 50% withdraw |

### Yield Vaults (현재 활성)

| Vault | name | want | vault address | strategy address |
|-------|------|------|---------------|------------------|
| Stability Pool | mooSbUSD-SP | sbUSD | `0x8d0e...c511` | `0xa15d...0a4` |
| Morpho sbUSD | mooSbUSD-Morpho | sbUSD | `0x8076...ccf` | `0x5c3f...fdb` |
| Morpho wCTC | mooWCTC-Morpho | wCTC | `0x3927...efc` | `0x6aac...ea0` |
| Morpho USDC | mooUSDC-Morpho | USDC | `0xb5fd...b97` | `0xb76d...734` |

- 모든 Strategy의 `paused() = false`, `withdrawFee() = 10` (0.1%)

### Algebra DEX

| 컨트랙트 | 검증 함수 | 결과 |
|----------|----------|------|
| Factory | poolDeployer() | 0x1ff0... (PoolDeployer 매칭) |
| Router | factory() | 0xd478... (Factory 매칭) |
| Router | WNativeToken() | 0x8f7f... (wCTC 매칭) |
| QuoterV2 | factory() | 0xd478... (Factory 매칭) |
| NFTManager | name() | "Algebra Positions NFT-V2" |

---

## 4. 전체 배포 파일 위치

| 파일 | 내용 |
|------|------|
| `deployments/creditcoin-testnet/algebra.json` | DEX 전체 주소 (core + pools) |
| `deployments/creditcoin-testnet/yield.json` | Yield Vault 4세트 + config |
| `deployments/creditcoin-testnet/morpho.json` | Lend (변경 없음) |
| `deployments/creditcoin-testnet/liquity.json` | Borrow/Earn (변경 없음) |
| `deployments/creditcoin-testnet/options.json` | Options (변경 없음) |
| `deployments/creditcoin-testnet/oracle.json` | Oracle (변경 없음) |
