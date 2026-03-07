# 배포 주소 업데이트 — 프론트엔드 반영 필요

> 날짜: 2026-02-27
> 대상: `apps/web/src/config/addresses.ts`
> 관련 배포 파일: `deployments/creditcoin-testnet/algebra.json`, `yield.json`

---

## 요약

Uniswap V3 DEX와 Yield Vault가 Creditcoin Testnet에 배포 완료되었습니다.
`addresses.ts`에서 아래 **2개 섹션**을 교체해주세요.

---

## 1. DEX 주소 교체

기존 DEX 주소가 **이전 배포본(무효)** 입니다. 아래로 교체하세요.

```typescript
// ─── DEX (Uniswap V3) ───
export const DEX = {
  factory: "0xd478a63345d7cd17881a540e15943919604691f6" as Address,
  swapRouter: "0xd604593426538fd1fa5b2660e3e443fa1ce93411" as Address,
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
      address: "0x40a8b5b8a6c1e4236da10da2731944e59444c179" as Address,
      strategy: "0x342c8a3385341b07111bbf1a73aac48cdda32917" as Address,
      want: TOKENS.sbUSD,
      wantSymbol: "sbUSD",
      name: "Stability Pool",
      description: "Liquity 청산 수익 자동 복리",
    },
    {
      address: "0x384ebff116bb8458628b62624ab9535a4636a397" as Address,
      strategy: "0x9176910f4c9dc7a868d5e6261fd651f98d7cc0c3" as Address,
      want: TOKENS.sbUSD,
      wantSymbol: "sbUSD",
      name: "Morpho sbUSD",
      description: "SnowballLend sbUSD 공급 이자",
    },
    {
      address: "0x766c8bf45d7a7356f63e830c134c07911b662757" as Address,
      strategy: "0x241f5661d6db304434dfc48dab75f1c5be63404a" as Address,
      want: TOKENS.wCTC,
      wantSymbol: "wCTC",
      name: "Morpho wCTC",
      description: "SnowballLend wCTC 공급 이자",
    },
    {
      address: "0xa6f9c033dba98f2d0fc79522b1b5c5098dc567b7" as Address,
      strategy: "0xcdb7a9fb0040d2631f4cd212601838d195e8d08b" as Address,
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

### Uniswap V3 DEX

| 컨트랙트 | 검증 함수 | 결과 |
|----------|----------|------|
| Factory | owner() | 배포자 주소 매칭 |
| SwapRouter | factory() | 0xd478... (Factory 매칭) |
| SwapRouter | WETH9() | 0x8f7f... (wCTC 매칭) |
| QuoterV2 | factory() | 0xd478... (Factory 매칭) |
| NFTManager | name() | "Uniswap V3 Positions NFT-V1" |

---

## 4. 전체 배포 파일 위치

| 파일 | 내용 |
|------|------|
| `deployments/creditcoin-testnet/dex.json` | DEX 전체 주소 (core + pools) |
| `deployments/creditcoin-testnet/yield.json` | Yield Vault 4세트 + config |
| `deployments/creditcoin-testnet/morpho.json` | Lend (변경 없음) |
| `deployments/creditcoin-testnet/liquity.json` | Borrow/Earn (변경 없음) |
| `deployments/creditcoin-testnet/options.json` | Options (변경 없음) |
| `deployments/creditcoin-testnet/oracle.json` | Oracle (변경 없음) |
