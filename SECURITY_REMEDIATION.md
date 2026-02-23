# Snowball Protocol — Security Remediation Guide

감사 일자: 2026-02-24
대상: `contracts/core/` (15 파일, 19 컨트랙트)
발견: CRITICAL 2 / HIGH 24 / MEDIUM 26

---

## 목차

1. [CRITICAL: AgentVault — 토큰 풀 공유 + approve 취약점](#1-critical-agentvault)
2. [CRITICAL: SbUSDToken — 생성자 접근제어](#2-critical-sbusdtoken-생성자)
3. [HIGH: AgentVault — nonReentrant 누락](#3-high-agentvault-nonreentrant-누락)
4. [HIGH: 초기화 함수 프론트러닝](#4-high-초기화-함수-프론트러닝)
5. [HIGH: ERC4626 Inflation 오탐 정리](#5-high-erc4626-inflation-오탐-정리)
6. [HIGH: SortedTroves — view 함수 오탐 정리](#6-high-sortedtroves-view-함수-오탐-정리)
7. [MEDIUM: AgentVault — unbounded loop](#7-medium-agentvault-unbounded-loop)
8. [MEDIUM: StabilityPool — unbounded loop + 정밀도 손실](#8-medium-stabilitypool-unbounded-loop)
9. [MEDIUM: BorrowerOperations — state inconsistency](#9-medium-borroweroperations-state-inconsistency)
10. [MEDIUM: tainted-arithmetic 일괄 분류](#10-medium-tainted-arithmetic-일괄-분류)
11. [INFO: floating-pragma](#11-info-floating-pragma)

---

## 1. CRITICAL: AgentVault

### 1-A. `approveFromVault` — 토큰 풀 공유 문제

**파일**: `AgentVault.sol:119-135`

**문제**: `approveFromVault`가 `IERC20(token).forceApprove(spender, amount)`를 호출하지만, AgentVault는 **모든 유저의 토큰을 하나의 주소에 보유**하고 있다. approve된 spender가 `transferFrom`으로 **다른 유저의 토큰까지** 탈취 가능.

**공격 시나리오**:
```
1. Alice가 100 WCTC 예치, Bob이 300 WCTC 예치
2. AgentVault의 실제 WCTC 잔액 = 400
3. 악의적 에이전트가 approveFromVault(Alice, WCTC, 공격자주소, 10) 호출
4. IERC20(WCTC).forceApprove(공격자주소, 10) 실행
5. 공격자가 WCTC.transferFrom(AgentVault, 공격자, 400) 호출
   → approve는 10이지만, forceApprove 후 별도로 approve를 늘릴 수 있음
   → 또는 반복 호출로 approve 누적
```

**수정 방안**: `approveFromVault` 함수를 제거하고, vault가 직접 transfer하는 방식으로 변경한다.

```solidity
// 수정 전 (삭제)
function approveFromVault(...) external nonReentrant {
    ...
    IERC20(token).forceApprove(spender, amount);
}

// 수정 후: approve 대신 직접 transfer
function spendFromVault(
    address user,
    address token,
    address to,
    uint256 amount
) external nonReentrant {
    Permission storage perm = _permissions[user][msg.sender];
    require(perm.active, "AgentVault: no permission");
    require(perm.expiry == 0 || block.timestamp <= perm.expiry, "AgentVault: expired");
    require(perm.spent + amount <= perm.spendingCap, "AgentVault: cap exceeded");
    require(_balances[user][token] >= amount, "AgentVault: insufficient balance");

    // to 주소도 allowedTargets에 있어야 함
    require(_containsAddress(perm.allowedTargets, to), "AgentVault: target not allowed");

    perm.spent += amount;
    _balances[user][token] -= amount;
    IERC20(token).safeTransfer(to, amount);
}
```

### 1-B. `transferFromVault` — `to` 주소 미검증

**파일**: `AgentVault.sol:139-156`

**문제**: 에이전트가 `to`를 자유롭게 지정하여 유저의 토큰을 임의 주소로 보낼 수 있다. `allowedTargets` 체크가 없다.

**수정 방안**: `to` 주소를 `allowedTargets`에 대해 검증한다.

```solidity
function transferFromVault(...) external nonReentrant {
    ...
    // 추가: to 주소 화이트리스트 검증
    require(_containsAddress(perm.allowedTargets, to), "AgentVault: target not allowed");
    ...
}
```

### 1-C. `executeOnBehalf` — data 파라미터 미검증

**파일**: `AgentVault.sol:87-113`

**문제**: selector만 화이트리스트 체크하고 나머지 calldata 파라미터는 검증하지 않는다. 에이전트가 허용된 함수를 호출하되 **다른 유저의 troveId** 등 임의 파라미터를 넣을 수 있다.

**수정 방안**: `msg.sender` 컨텍스트 문제와 함께, call을 AgentVault 자체가 아닌 유저의 SmartAccount를 통해 실행하거나, 최소한 calldata의 첫번째 address 파라미터가 `user` 본인인지 검증하는 로직을 추가한다.

```solidity
// 옵션 A: calldata에 user 주소가 포함되어 있는지 검증
// (BorrowerOperations.openTrove의 첫번째 파라미터가 _owner)
// 이 방식은 함수마다 다르므로 범용적이지 않음

// 옵션 B (권장): SmartAccount를 통한 실행
// user의 SmartAccount가 있다면, SmartAccount를 통해 call을 실행하여
// msg.sender가 AgentVault가 아닌 user의 SmartAccount가 되도록 함
```

---

## 2. CRITICAL: SbUSDToken 생성자

**파일**: `SbUSDToken.sol:35-37`

**문제**: 정적 분석기가 `constructor() { owner = msg.sender; }` 를 "접근제어 없는 owner 설정"으로 탐지.

**실제 심각도**: **FALSE POSITIVE** — constructor는 배포 시 한 번만 실행되므로 접근제어가 불필요하다. 다만 owner 이전/포기 함수가 없어서 **단일 실패점**이 된다.

**권장사항**: 긴급도는 낮지만, OpenZeppelin `Ownable`을 상속하면 코드가 깔끔해지고 `renounceOwnership`, `transferOwnership` 등 표준 패턴을 사용할 수 있다.

```solidity
// 수정 전
address public owner;
modifier onlyOwner() { require(msg.sender == owner, "SbUSD: not owner"); _; }
constructor() ... { owner = msg.sender; }

// 수정 후
import "@openzeppelin/contracts/access/Ownable.sol";

contract SbUSDToken is ERC20, ERC20Permit, ISbUSDToken, Ownable {
    constructor()
        ERC20("Snowball USD", "sbUSD")
        ERC20Permit("Snowball USD")
        Ownable(msg.sender)
    {}
    // onlyOwner modifier는 Ownable에서 제공
}
```

---

## 3. HIGH: AgentVault — nonReentrant 누락

**파일**: `AgentVault.sol:49, 74, 160, 164`

**문제**: `grantPermission`, `revokePermission`, `getPermission`, `getBalance`에 `nonReentrant`가 없다. 같은 컨트랙트의 `deposit`, `withdraw`에는 있어서 분석기가 불일치를 탐지.

**실제 심각도**:
- `getPermission`, `getBalance` → **FALSE POSITIVE**: view 함수라 reentrancy 불가
- `grantPermission`, `revokePermission` → **LOW**: 외부 호출이 없어 reentrancy 벡터가 없음. 다만 방어적으로 추가하는 것이 좋다

**수정 방안**: 상태 변경 함수에만 `nonReentrant` 추가 (view 함수는 불필요).

```solidity
function grantPermission(...) external override nonReentrant { ... }
function revokePermission(address agent) external override nonReentrant { ... }
// getPermission, getBalance은 view이므로 변경 불필요
```

---

## 4. HIGH: 초기화 함수 프론트러닝

**영향 컨트랙트**: `ActivePool`, `SortedTroves`, `BorrowerOperations`, `StabilityPool`, `DefaultPool`, `TroveNFT`

**문제**: `setAddressesRegistry()`, `setAddresses()` 함수들이 `require(!isInitialized)` 또는 `require(addr == address(0))` 패턴만 사용. 배포 직후 누구든 먼저 호출하면 악의적 주소로 초기화 가능 (프론트러닝).

**예시** (`ActivePool.sol:36-40`):
```solidity
function setAddressesRegistry(address _addressesRegistry) external override {
    require(!isInitialized, "Already initialized");  // 누구든 먼저 호출 가능!
    isInitialized = true;
    addressesRegistry = _addressesRegistry;
}
```

**수정 방안**: 배포자만 초기화할 수 있도록 deployer 검증을 추가한다.

```solidity
address public immutable deployer;

constructor() {
    deployer = msg.sender;
}

function setAddressesRegistry(address _addressesRegistry) external override {
    require(msg.sender == deployer, "Not deployer");
    require(!isInitialized, "Already initialized");
    isInitialized = true;
    addressesRegistry = _addressesRegistry;
}
```

또는 constructor에서 직접 초기화하거나, OpenZeppelin `Initializable`을 사용한다.

**적용 대상 파일**:
| 파일 | 함수 |
|------|------|
| `ActivePool.sol:36` | `setAddressesRegistry` |
| `ActivePool.sol:42` | `setAddresses` |
| `SortedTroves.sol:35` | `setAddressesRegistry` |
| `SortedTroves.sol:41` | `setAddresses` |
| `BorrowerOperations.sol:59` | `setAddressesRegistry` |
| `BorrowerOperations.sol:78` | `setCollateralRegistry` |
| `StabilityPool.sol:51` | `setAddressesRegistry` |
| `StabilityPool.sol:57` | `setAddresses` |
| `DefaultPool.sol:28` | `setAddresses` |
| `TroveNFT.sol:22` | `setAddresses` |

---

## 5. HIGH: ERC4626 Inflation — 오탐 정리

**영향**: `AgentVault`, `SbUSDToken`, `TroveNFT`

**실제 심각도**: **FALSE POSITIVE** — 이 컨트랙트들은 ERC4626 vault가 아니다.
- `AgentVault`: mapping 기반 잔액 관리, share/asset 개념 없음
- `SbUSDToken`: 일반 ERC20 토큰
- `TroveNFT`: ERC721 NFT

정적 분석기가 "vault" 키워드 + balance mapping 패턴을 ERC4626로 오인한 것. **수정 불필요**.

---

## 6. HIGH: SortedTroves — view 함수 오탐 정리

**영향**: `contains`, `isEmpty`, `getSize`, `getFirst`, `getLast`, `getNext`, `getPrev`, `findInsertPosition`

**실제 심각도**: **FALSE POSITIVE** — 모두 `view` 함수이므로 상태를 변경하지 않는다. `onlyAuthorized` modifier가 없는 것은 의도된 설계 (읽기 전용은 누구나 접근 가능해야 함).

**수정 불필요**.

---

## 7. MEDIUM: AgentVault — unbounded loop

**파일**: `AgentVault.sol:170-181`

**문제**: `_containsAddress`와 `_containsSelector`가 배열을 선형 탐색. 에이전트에게 많은 target/function을 허용하면 가스 비용 증가 → DoS 가능.

**수정 방안**: 배열 크기를 제한하거나 mapping으로 변경한다.

```solidity
// 옵션 A: 배열 크기 제한 (간단)
uint256 public constant MAX_TARGETS = 10;
uint256 public constant MAX_FUNCTIONS = 20;

function grantPermission(...) external override nonReentrant {
    require(targets.length <= MAX_TARGETS, "Too many targets");
    require(functions.length <= MAX_FUNCTIONS, "Too many functions");
    ...
}

// 옵션 B: mapping으로 변경 (효율적, 구조 변경 필요)
// Permission 구조체 내부를:
//   mapping(address => bool) allowedTargets;
//   mapping(bytes4 => bool) allowedFunctions;
// 으로 변경
```

---

## 8. MEDIUM: StabilityPool — unbounded loop + 정밀도 손실

### 8-A. unbounded loop

**파일**: `StabilityPool.sol:145-157`, `StabilityPool.sol:174-183`

**문제**: `offset()`과 `triggerBoldRewards()`에서 전체 `depositors` 배열을 순회. 예금자가 늘어나면 가스 한도 초과로 청산/보상 분배 불가능.

**수정 방안**: Liquity V2 원본의 epoch-scale 방식을 사용한다. 전체 순회 대신 글로벌 스냅샷으로 비례 분배를 추적하고, 각 유저가 claim할 때 개별 계산.

```solidity
// Liquity V2 스타일: O(1) offset
// 글로벌 변수로 누적 비율을 추적
uint256 public P = 1e18;              // 잔액 축소 비율
uint256 public S;                      // 담보 누적 비율
uint256 public epochScale;

function offset(uint256 _debtToOffset, uint256 _collToAdd) external onlyTroveManager {
    if (totalBoldDeposits == 0) return;

    uint256 collPerUnitStaked = (_collToAdd * 1e18) / totalBoldDeposits;
    uint256 boldLossPerUnitStaked = (_debtToOffset * 1e18) / totalBoldDeposits;

    S += collPerUnitStaked;
    P = P * (1e18 - boldLossPerUnitStaked) / 1e18;
    totalBoldDeposits -= _debtToOffset;
}
```

### 8-B. 정밀도 손실

**파일**: `StabilityPool.sol:151-153`

**문제**: share 계산에서 나눗셈 후 곱셈 순서로 인한 정밀도 손실.

```solidity
// 현재: 나눗셈 먼저 → 정밀도 손실
uint256 share = (dep.initialValue * DECIMAL_PRECISION) / totalBoldDeposits;
uint256 collShare = (_collToAdd * share) / DECIMAL_PRECISION;

// 수정: 곱셈 먼저
uint256 collShare = (dep.initialValue * _collToAdd) / totalBoldDeposits;
```

---

## 9. MEDIUM: BorrowerOperations — state inconsistency

**파일**: `BorrowerOperations.sol:59, 226`

**문제**: 분석기가 `priceFeed`와 `lastUpdate`를 연관 변수로 감지했으나, `priceFeed`는 `setAddressesRegistry`에서 설정되는 컨트랙트 주소이고 `lastUpdate`는 `_applyTroveInterest`에서 사용하는 TroveManager의 값.

**실제 심각도**: **FALSE POSITIVE** — 두 변수는 서로 다른 맥락. `priceFeed`는 오라클 주소, `lastUpdate`는 이자 계산용 타임스탬프로, 동시 업데이트가 필요한 관계가 아니다.

**수정 불필요**. 다만 `_applyTroveInterest`에서 `lastUpdate` 갱신이 TroveManager 측에서 이루어지는지 확인 필요:

```solidity
// BorrowerOperations._applyTroveInterest에서:
troveManager.adjustTrove(_troveId, 0, false, accrued, true);
// ↑ 이 호출이 TroveManager에서 lastDebtUpdateTime을 갱신하는지 확인 필요
// 갱신하지 않으면 이자가 중복 적용되는 실제 버그
```

---

## 10. MEDIUM: tainted-arithmetic 일괄 분류

22개 tainted-arithmetic 중 대부분은 **`onlyAuthorized` modifier로 보호**되어 있어 실제 위험은 낮다.

### 수정 불필요 (FALSE POSITIVE)

내부 함수이거나 `onlyAuthorized`/`onlyTroveManager` modifier가 이미 적용:

| 컨트랙트 | 함수 | 이유 |
|---------|------|------|
| ActivePool | receiveColl, increaseCollBalance, sendColl 등 7개 | `onlyAuthorized` |
| DefaultPool | increaseBoldDebt, decreaseBoldDebt, sendCollToActivePool | `onlyTroveManager` |
| CollSurplusPool | accountSurplus | 내부 호출만 |
| StabilityPool | offset | `onlyTroveManager` |

### 실제 검토 필요

| 컨트랙트 | 함수 | 위험 | 설명 |
|---------|------|------|------|
| BorrowerOperations | `_calcUpfrontFee` | LOW | `_annualInterestRate`가 MIN/MAX 범위로 이미 검증됨 |
| BorrowerOperations | `_adjustTroveInternal` | LOW | ICR 검증으로 간접 보호 |
| BorrowerOperations | `_applyTroveInterest` | LOW | `timeDelta`는 block.timestamp 차이라 조작 어려움 |
| HintHelpers | `getApproxHint`, `_absDiff` | LOW | view 함수, 오프체인 호출 용도 |
| MultiTroveGetter | `getMultipleSortedTroves` | LOW | view 함수 |
| TroveManager | `batchLiquidateTroves`, `_computeICR` | LOW | 내부/관리자 호출 |
| CollateralRegistry | `addBranch` | **MEDIUM** | 접근제어 확인 필요 |
| AgentVault | `_containsAddress`, `_containsSelector` | LOW | 배열 인덱스 산술 |

---

## 11. INFO: floating-pragma

**영향**: 전체 15개 파일

**현재**: `pragma solidity ^0.8.24;`

**수정**: 배포 시에는 정확한 버전으로 고정한다.

```solidity
// 수정 전
pragma solidity ^0.8.24;

// 수정 후
pragma solidity 0.8.24;
```

---

## 수정 우선순위 요약

| 우선순위 | 항목 | 영향 | 난이도 |
|---------|------|------|--------|
| **P0** | AgentVault `approveFromVault` 제거/교체 | 자금 탈취 가능 | 중 |
| **P0** | AgentVault `transferFromVault` to 주소 검증 | 자금 탈취 가능 | 하 |
| **P1** | 초기화 함수 deployer 검증 (6개 컨트랙트) | 프로토콜 하이재킹 | 하 |
| **P1** | StabilityPool 루프 → epoch-scale 방식 | 청산 DoS | 상 |
| **P2** | AgentVault 배열 크기 제한 | 가스 DoS | 하 |
| **P2** | AgentVault `grantPermission` nonReentrant | 방어적 조치 | 하 |
| **P3** | SbUSDToken Ownable 상속 | 코드 품질 | 하 |
| **P3** | pragma 버전 고정 | 코드 품질 | 하 |
| — | BorrowerOps `_applyTroveInterest` lastUpdate 갱신 확인 | 이자 중복 가능 | 확인 필요 |
