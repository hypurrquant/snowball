# SSOT — Snowball Protocol (Liquity V2 Fork)

> Single Source of Truth for contract addresses, tokens, branches, and integration config.
> Creditcoin Testnet deployment.
> Version: v1.0.0 | Status: Active
> [INDEX](INDEX.md)

---

## Network

| Key | Value |
|-----|-------|
| Name | Creditcoin Testnet |
| Chain ID | `102031` |
| RPC | `https://rpc.cc3-testnet.creditcoin.network` |
| Explorer | `https://creditcoin-testnet.blockscout.com` |
| Native Token | CTC (tCTC on testnet, 18 decimals) |

---

## Tokens

| Symbol | Name | Decimals | Address |
|--------|------|----------|---------|
| CTC | Creditcoin (native) | 18 | — (native) |
| wCTC | Wrapped CTC | 18 | `0x8f7f60a0f615d828eafcbbf6121f73efcfb56969` |
| lstCTC | Liquid Staked CTC | 18 | `0x72968ff9203dc5f352c5e42477b84d11c8c8f153` |
| sbUSD | Snowball USD (stablecoin) | 18 | `0x5772f9415b75ecca00e7667e0c7d730db3b29fbd` |

> 모든 토큰은 Mock (테스트넷 전용). `mint(address, uint256)` 또는 `faucet(uint256)` 호출로 발행 가능.

---

## Branches (Multi-Collateral)

Snowball Protocol은 **2개 담보 Branch**로 구성. 각 Branch는 독립적인 컨트랙트 세트를 가짐.

### Branch 0: wCTC

| 항목 | 값 |
|------|-----|
| MCR (최소 담보비율) | 110% (`1.1e18`) |
| CCR (위기 담보비율) | 150% (`1.5e18`) |

| 컨트랙트 | 주소 |
|----------|------|
| AddressesRegistry | `0xd5bd51f411e8472ddc3632e7d9bf3ddff44225ce` |
| BorrowerOperations | `0xe8285b406dc77d16c193e6a1a2b8ecc1f386602c` |
| TroveManager | `0x30ef6615f01be4c9fea06c33b07432b40cab7bdc` |
| StabilityPool | `0x91c9983499f257015597d756108efdf26746db81` |
| ActivePool | `0xad3a046f1db8f648d2641c34a2dfff72b9c39bde` |
| DefaultPool | `0x9edc874320a806eeaf228d26db22c25e30df84d7` |
| GasPool | `0xb63801de6786adf227b134abb6dda6eef2e0b4f0` |
| CollSurplusPool | `0x8b3d20b841861978cba49fdea9aa59c4626d1c83` |
| SortedTroves | `0x749f4111b67b7f770d2e43187d6433b470c2b3ad` |
| TroveNFT | `0x51b7b40ded97cffd01b448402c8802b839942e9b` |
| PriceFeed | `0x17a36a4d4dbda9aa3f9ba3d12e0a4bfc9533c96c` |

### Branch 1: lstCTC

| 항목 | 값 |
|------|-----|
| MCR (최소 담보비율) | 120% (`1.2e18`) |
| CCR (위기 담보비율) | 160% (`1.6e18`) |

| 컨트랙트 | 주소 |
|----------|------|
| AddressesRegistry | `0x5f407d42b3cd83a5bbb70c09726d8a8ebd2c866c` |
| BorrowerOperations | `0x34f36f41f912e29c600733d90a4d210a49718a5d` |
| TroveManager | `0xda7b322d26b3477161dc80282d1ea4d486528232` |
| StabilityPool | `0x353f40353453f123f9073f117956e8fdf324e977` |
| ActivePool | `0x94e0d44e8b03782f7616a3488b4f973d7f76b6a4` |
| DefaultPool | `0x6fdf2d2f519cd5a53d458bb330adb14aeaee56ac` |
| GasPool | `0xe16e3e476f25ab1eab5da592c042e3bb8f5a118d` |
| CollSurplusPool | `0x5723805320cb998deef674bedd4208e9a0ed7c9e` |
| SortedTroves | `0x645b38f477ea61bd71072face0892021208b8d49` |
| TroveNFT | `0x32da60f2b720e67889c4a2722ae881c99c2dc281` |
| PriceFeed | `0x702121516551b72f7f1ee77906b2488bd8d2eb0a` |

---

## Shared Contracts

| 컨트랙트 | 주소 | 역할 |
|----------|------|------|
| CollateralRegistry | `0xb18f7a1944e905739e18f96d6e60427aab93c23d` | 담보 Branch 통합 레지스트리, 리뎀션 처리 |
| HintHelpers | `0x7e8fa8852b0c1d697905fd7594d30afe693c76bb` | 수수료 예측, 삽입 위치 힌트 |
| MultiTroveGetter | `0x8376dfa413a536075e23c706affbd6370ec7d380` | 배치 Trove 조회 |
| AgentVault | `0xb944c1fdc2bd1232d490dd03ab5129ab15ccbc40` | AI Agent 권한 관리 + 자산 보관 |

---

## Build & Compile

| Key | Value |
|-----|-------|
| Solidity | `0.8.24` |
| EVM Target | `cancun` (Foundry) / `shanghai` (Hardhat) |
| Optimizer | enabled, 200 runs |
| OpenZeppelin | v5.4.0 |
| Build Tools | Foundry + Hardhat (dual) |

---

## Protocol Constants

| 상수 | 값 | 설명 |
|------|-----|------|
| DECIMAL_PRECISION | `1e18` | 기본 정밀도 |
| MIN_ANNUAL_INTEREST_RATE | `0.5%` (`5e15`) | 최소 연이율 |
| MAX_ANNUAL_INTEREST_RATE | `25%` (`25e16`) | 최대 연이율 |
| MIN_DEBT | `200 sbUSD` (`200e18`) | 최소 차입 |
| GAS_COMPENSATION | `200 sbUSD` (`200e18`) | 청산 가스 보상 |

---

## 핵심 함수 (BorrowerOperations)

### Trove 열기

```solidity
function openTrove(
    address _owner,
    uint256 _ownerIndex,
    uint256 _ETHAmount,       // 담보량 (wei)
    uint256 _boldAmount,      // 차입할 sbUSD (wei)
    uint256 _upperHint,
    uint256 _lowerHint,
    uint256 _annualInterestRate, // 연이율 (0.5%~25%, wei)
    uint256 _maxUpfrontFee,
    address _addManager,
    address _removeManager,
    address _receiver
) returns (uint256 troveId)
```

### Trove 조정

```solidity
function adjustTrove(
    uint256 _troveId,
    uint256 _collChange,      // 담보 변경량
    bool _isCollIncrease,     // true: 추가, false: 인출
    uint256 _boldChange,      // sbUSD 변경량
    bool _isDebtIncrease,     // true: 추가 차입, false: 상환
    uint256 _maxUpfrontFee
)
```

### Trove 닫기

```solidity
function closeTrove(uint256 _troveId)
```

### 이자율 변경

```solidity
function adjustTroveInterestRate(
    uint256 _troveId,
    uint256 _newAnnualInterestRate,
    uint256 _upperHint,
    uint256 _lowerHint,
    uint256 _maxUpfrontFee
)
```

---

## 핵심 함수 (StabilityPool)

```solidity
function provideToSP(uint256 _amount, bool _doClaim)  // sbUSD 예치
function withdrawFromSP(uint256 _amount, bool _doClaim) // sbUSD 인출
function claimAllCollGains()                            // 청산 수익 수령
```

### 읽기

```solidity
function getTotalBoldDeposits() view returns (uint256)
function getCompoundedBoldDeposit(address) view returns (uint256)
function getDepositorCollGain(address) view returns (uint256)
function getDepositorYieldGain(address) view returns (uint256)
```

---

## 핵심 함수 (TroveManager)

```solidity
// Trove 상태 조회
function getTroveStatus(uint256 _troveId) view returns (uint8)
function getCurrentICR(uint256 _troveId, uint256 _price) view returns (uint256)
function getLatestTroveData(uint256 _troveId) view returns (LatestTroveData)
function getTroveAnnualInterestRate(uint256 _troveId) view returns (uint256)

// 청산
function batchLiquidateTroves(uint256[] calldata _troveArray)
```

---

## 수학 공식

### 담보비율 (CR)

```
CR = (collateral × price) / debt
```

- `>= CCR` : Safe (정상)
- `>= MCR, < CCR` : Recovery Mode 진입 가능
- `< MCR` : 청산 대상

### 청산 가격

```
liquidationPrice = debt / collateral × MCR
```

### Stability Pool APY

```
SP APY = (yearlyCollGain × price + yearlyYieldGain) / totalDeposits × 100
```

---

## ABIs

소스: `packages/shared/src/abis/liquity.ts`

```typescript
import {
  BorrowerOperationsABI,
  TroveManagerABI,
  StabilityPoolABI,
  ActivePoolABI,
  DefaultPoolABI,
  CollSurplusPoolABI,
  CollateralRegistryABI,
  TroveNFTABI,
  SortedTrovesABI,
  HintHelpersABI,
  MultiTroveGetterABI,
  AddressesRegistryABI,
  RedemptionHelperABI,
  DebtInFrontHelperABI,
} from '@snowball/shared/abis';
```

---

## Deploy Order (재배포 시)

```
1. MockWCTC, MockLstCTC, MockPriceFeeds     ← Mock 토큰 & 오라클
2. SbUSDToken                                ← 스테이블코인
3. Branch 0 (wCTC): AddressesRegistry → 10개 컨트랙트 → Wire & Init
4. Branch 1 (lstCTC): AddressesRegistry → 10개 컨트랙트 → Wire & Init
5. sbUSD.setBranchAddresses(branch0, branch1)
6. CollateralRegistry(sbUSD, [wCTC, lstCTC], [tm0, tm1])
7. HintHelpers(collateralRegistry)
8. MultiTroveGetter(collateralRegistry)
9. RedemptionHelper, DebtInFrontHelper
10. AgentVault
```

---

## 빠른 복사용 (TypeScript)

```typescript
// ─── Tokens ───
const WCTC   = "0x8f7f60a0f615d828eafcbbf6121f73efcfb56969";
const LSTCTC = "0x72968ff9203dc5f352c5e42477b84d11c8c8f153";
const SBUSD  = "0x5772f9415b75ecca00e7667e0c7d730db3b29fbd";

// ─── Shared ───
const COLLATERAL_REGISTRY = "0xb18f7a1944e905739e18f96d6e60427aab93c23d";
const HINT_HELPERS        = "0x7e8fa8852b0c1d697905fd7594d30afe693c76bb";
const MULTI_TROVE_GETTER  = "0x8376dfa413a536075e23c706affbd6370ec7d380";
const AGENT_VAULT         = "0xb944c1fdc2bd1232d490dd03ab5129ab15ccbc40";

// ─── Branch 0 (wCTC) ───
const WCTC_BORROWER_OPS   = "0xe8285b406dc77d16c193e6a1a2b8ecc1f386602c";
const WCTC_TROVE_MANAGER  = "0x30ef6615f01be4c9fea06c33b07432b40cab7bdc";
const WCTC_STABILITY_POOL = "0x91c9983499f257015597d756108efdf26746db81";
const WCTC_PRICE_FEED     = "0x17a36a4d4dbda9aa3f9ba3d12e0a4bfc9533c96c";

// ─── Branch 1 (lstCTC) ───
const LSTCTC_BORROWER_OPS   = "0x34f36f41f912e29c600733d90a4d210a49718a5d";
const LSTCTC_TROVE_MANAGER  = "0xda7b322d26b3477161dc80282d1ea4d486528232";
const LSTCTC_STABILITY_POOL = "0x353f40353453f123f9073f117956e8fdf324e977";
const LSTCTC_PRICE_FEED     = "0x702121516551b72f7f1ee77906b2488bd8d2eb0a";
```

---

## License

BUSL-1.1 (Liquity V2 Bold fork).
