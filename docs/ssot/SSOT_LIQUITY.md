# SSOT — Snowball Protocol (Liquity V2 Fork)

> Single Source of Truth for contract addresses, tokens, branches, and integration config.
> Creditcoin Testnet deployment.
> Version: v2.0.0 | Status: Active | Updated: 2026-03-07
> [INDEX](../INDEX.md)

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
| wCTC | Wrapped CTC | 18 | `0xca69344e2917f026ef4a5ace5d7b122343fc8528` |
| lstCTC | Liquid Staked CTC | 18 | `0xa768d376272f9216c8c4aa3063391bdafbcad4c2` |
| sbUSD | Snowball USD (stablecoin) | 18 | `0x8aefed3e2e9a886bdd72ec9cebe27d7aabced2a5` |

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
| AddressesRegistry | `0x7cfed108ed84194cf37f93d47268fbdd14da73d2` |
| BorrowerOperations | `0xb637f375cbbd278ace5fdba53ad868ae7cb186ea` |
| TroveManager | `0xa20f9dfeb110e11c89147b9db5adb98a7d91e70e` |
| StabilityPool | `0xf1654541efb7a3c34a9255464ebb2294fa1a43f3` |
| ActivePool | `0xa7f0600a023cf6076f5d8dc51b46b91bafe095e5` |
| DefaultPool | `0x201ff7ec1a9ceaf1396ea6d90cd24ac6b757e404` |
| GasPool | `0x4aa86795705a604e3dac4cfe45c375976eca3189` |
| CollSurplusPool | `0x0dc9642129470d6a0ac0bac2a5d1b18a2ea09111` |
| SortedTroves | `0xf5ef344759df7786cda9d2133e4d1e10e3b43f9f` |
| TroveNFT | `0x72e383eff50893e2b2edeb711a81c3a812dcd2f9` |
| PriceFeed | `0xca9341894230b84fdff429ff43e83cc8f8990342` |

### Branch 1: lstCTC

| 항목 | 값 |
|------|-----|
| MCR (최소 담보비율) | 120% (`1.2e18`) |
| CCR (위기 담보비율) | 160% (`1.6e18`) |

| 컨트랙트 | 주소 |
|----------|------|
| AddressesRegistry | `0x0afe1c58a76c49d62bd7331f309aa14731efb1fc` |
| BorrowerOperations | `0x8700ed43989e2f935ab8477dd8b2822cae7f60ca` |
| TroveManager | `0x83715c7e9873b0b8208adbbf8e07f31e83b94aed` |
| StabilityPool | `0xec700d805b5de3bf988401af44b1b384b136c41b` |
| ActivePool | `0xa57cca34198bf262a278da3b2b7a8a5f032cb835` |
| DefaultPool | `0x6ed045c0cadc55755dc09f1bfee0f964baf1f859` |
| GasPool | `0x31d560b7a74b179dce8a8017a1de707c32dd67da` |
| CollSurplusPool | `0xa287db89e552698a118c89d8bbee25bf51a0ec33` |
| SortedTroves | `0x25aa78c7b0dbc736ae23a316ab44579467ba9507` |
| TroveNFT | `0x51a90151e0dd1348e77ee6bcc30278ee311f29a8` |
| PriceFeed | `0xa12ed39d24d4bbc100d310ae1cbf10b4c67e4a08` |

---

## Shared Contracts

| 컨트랙트 | 주소 | 역할 |
|----------|------|------|
| CollateralRegistry | `0x5c1683f9d8a8d77de48b380a15b623cf5d91bb59` | 담보 Branch 통합 레지스트리, 리뎀션 처리 |
| HintHelpers | `0x6ee9850b0915763bdc0c7edca8b66189449a447f` | 수수료 예측, 삽입 위치 힌트 |
| MultiTroveGetter | `0xc26bce003e00dde70c0ecff8778e9edacd5ec6e6` | 배치 Trove 조회 |
| AgentVault | `0x7bca6fb903cc564d92ed5384512976c94f2730d7` | AI Agent 권한 관리 + 자산 보관 |
| RedemptionHelper | `0x8baf58113f968b4dfb2916290b57ce3ae114fb77` | 리뎀션 헬퍼 |
| DebtInFrontHelper | `0x9fd6116fc1d006fa1d8993746ac1924f16d722bb` | 선순위 부채 조회 헬퍼 |

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
| MIN_DEBT | `10 sbUSD` (`10e18`) | 최소 차입 |
| GAS_COMPENSATION | `0.2 CTC` (`0.2 ether`) | 청산 가스 보상 |

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
const WCTC   = "0xca69344e2917f026ef4a5ace5d7b122343fc8528";
const LSTCTC = "0xa768d376272f9216c8c4aa3063391bdafbcad4c2";
const SBUSD  = "0x8aefed3e2e9a886bdd72ec9cebe27d7aabced2a5";

// ─── Shared ───
const COLLATERAL_REGISTRY = "0x5c1683f9d8a8d77de48b380a15b623cf5d91bb59";
const HINT_HELPERS        = "0x6ee9850b0915763bdc0c7edca8b66189449a447f";
const MULTI_TROVE_GETTER  = "0xc26bce003e00dde70c0ecff8778e9edacd5ec6e6";
const AGENT_VAULT         = "0x7bca6fb903cc564d92ed5384512976c94f2730d7";
const REDEMPTION_HELPER   = "0x8baf58113f968b4dfb2916290b57ce3ae114fb77";
const DEBT_IN_FRONT_HELPER = "0x9fd6116fc1d006fa1d8993746ac1924f16d722bb";

// ─── Branch 0 (wCTC) ───
const WCTC_ADDR_REGISTRY  = "0x7cfed108ed84194cf37f93d47268fbdd14da73d2";
const WCTC_BORROWER_OPS   = "0xb637f375cbbd278ace5fdba53ad868ae7cb186ea";
const WCTC_TROVE_MANAGER  = "0xa20f9dfeb110e11c89147b9db5adb98a7d91e70e";
const WCTC_STABILITY_POOL = "0xf1654541efb7a3c34a9255464ebb2294fa1a43f3";
const WCTC_ACTIVE_POOL    = "0xa7f0600a023cf6076f5d8dc51b46b91bafe095e5";
const WCTC_DEFAULT_POOL   = "0x201ff7ec1a9ceaf1396ea6d90cd24ac6b757e404";
const WCTC_GAS_POOL       = "0x4aa86795705a604e3dac4cfe45c375976eca3189";
const WCTC_COLL_SURPLUS   = "0x0dc9642129470d6a0ac0bac2a5d1b18a2ea09111";
const WCTC_SORTED_TROVES  = "0xf5ef344759df7786cda9d2133e4d1e10e3b43f9f";
const WCTC_TROVE_NFT      = "0x72e383eff50893e2b2edeb711a81c3a812dcd2f9";
const WCTC_PRICE_FEED     = "0xca9341894230b84fdff429ff43e83cc8f8990342";

// ─── Branch 1 (lstCTC) ───
const LSTCTC_ADDR_REGISTRY  = "0x0afe1c58a76c49d62bd7331f309aa14731efb1fc";
const LSTCTC_BORROWER_OPS   = "0x8700ed43989e2f935ab8477dd8b2822cae7f60ca";
const LSTCTC_TROVE_MANAGER  = "0x83715c7e9873b0b8208adbbf8e07f31e83b94aed";
const LSTCTC_STABILITY_POOL = "0xec700d805b5de3bf988401af44b1b384b136c41b";
const LSTCTC_ACTIVE_POOL    = "0xa57cca34198bf262a278da3b2b7a8a5f032cb835";
const LSTCTC_DEFAULT_POOL   = "0x6ed045c0cadc55755dc09f1bfee0f964baf1f859";
const LSTCTC_GAS_POOL       = "0x31d560b7a74b179dce8a8017a1de707c32dd67da";
const LSTCTC_COLL_SURPLUS   = "0xa287db89e552698a118c89d8bbee25bf51a0ec33";
const LSTCTC_SORTED_TROVES  = "0x25aa78c7b0dbc736ae23a316ab44579467ba9507";
const LSTCTC_TROVE_NFT      = "0x51a90151e0dd1348e77ee6bcc30278ee311f29a8";
const LSTCTC_PRICE_FEED     = "0xa12ed39d24d4bbc100d310ae1cbf10b4c67e4a08";
```

---

## License

BUSL-1.1 (Liquity V2 Bold fork).
