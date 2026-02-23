# Security Patch Notes — Snowball Protocol

**감사 기준**: `audit_report_v2.md` (2026-02-24, SC Audit Agent v1.0)
**수정 적용일**: 2026-02-24
**커밋**: `e49b25c`
**컴파일**: `Compiled 15 Solidity files successfully (evm target: shanghai)`

---

## 전체 Finding 처리 현황

| 심각도 | 총 건수 | 실제 수정 | False Positive | 스킵 (미사용) |
|--------|--------|----------|---------------|--------------|
| CRITICAL | 2 | 0 | 1 | 1 |
| HIGH | 24 | 0 | 19 | 5 |
| MEDIUM | 28 | 1 (기존) + 3 (신규) | 23 | 2 |
| **합계** | **54** | **4** | **43** | **8** |

> 기존 커밋(`a028c4c`)에서 MEDIUM #29 (batchLiquidateTroves 배치 제한)를 먼저 수정.
> 이번 커밋(`e49b25c`)에서 P1/P3 항목 추가 수정.

---

## 이번 수정 상세 (커밋 `e49b25c`)

---

### [P1] StabilityPool — O(n) 루프 → O(1) Accumulator 방식

**근거**: SECURITY_REMEDIATION.md §8-A, §8-B
**파일**: `packages/contracts-liquity/contracts/core/StabilityPool.sol`

#### 문제

`offset()`과 `triggerBoldRewards()`에서 모든 예금자를 순회하는 O(n) 루프가 있었음. 예금자가 늘어나면 가스 한도를 초과해 **청산 자체가 불가능**해지는 DoS 취약점.

추가로, 보상 비율 계산 시 이중 나눗셈으로 인한 **정밀도 손실**이 발생.

```solidity
// Before — O(n) 루프
for (uint256 i = 0; i < depositorCount; i++) {
    uint256 share = (dep.initialValue * 1e18) / totalBoldDeposits; // 1차 나눗셈
    uint256 collShare = (_collToAdd * share) / 1e18;               // 2차 나눗셈 → 정밀도 손실
    dep.collGain += collShare;
}
```

#### 수정 — Liquity V1 Epoch-Scale Accumulator

모든 루프를 제거하고 3개의 글로벌 상태 변수로 O(1) 처리:

```solidity
uint256 public P = 1e18; // 청산 손실 누적 곱
uint256 public S;        // 담보 이득 누적기
uint256 public G;        // sbUSD 이자 이득 누적기
```

**Deposit 구조체 변경** — 사전 계산값 제거, 스냅샷만 저장:

```solidity
struct Deposit {
    uint256 initialValue; // 예금 원금
    uint256 S;            // 예금 시점의 S 스냅샷
    uint256 G;            // 예금 시점의 G 스냅샷
    uint256 P;            // 예금 시점의 P 스냅샷
}
```

**청산 처리 (`offset`)** — O(1):

```solidity
// After — O(1) 수학 연산만
uint256 collGainPerUnit = _collToAdd * 1e18 / totalBoldDeposits;
S += collGainPerUnit * P / 1e18;                                  // S 누적

uint256 lossPerUnit = debtToOffset * 1e18 / totalBoldDeposits;
P = P * (1e18 - lossPerUnit) / 1e18;                              // P 갱신
totalBoldDeposits -= debtToOffset;
```

**이자 분배 (`triggerBoldRewards`)** — O(1):

```solidity
// After — O(1)
G += _boldYield * 1e18 / totalBoldDeposits;
```

**이득 계산 (Lazy — 청구 시점에 계산)**:

| 항목 | 계산식 |
|------|--------|
| 현재 유효 예금 | `initialValue × P / P_snap` |
| 담보 이득 | `initialValue × (S - S_snap) / P_snap` |
| sbUSD 이자 이득 | `compounded × (G - G_snap) / 1e18` |

**정밀도 수정**:
```solidity
// Before: 두 번 나눔 → 잘림 오류 누적
share = (d * 1e18) / D;  collShare = (coll * share) / 1e18;

// After: 한 번만 나눔 → 정밀도 보존
collShare = (d * coll) / D;
```

**기타 변경**:
- `depositors[]` 배열 완전 제거 (루프용이었으므로 불필요)
- `provideToSP()`: 기존 이득 먼저 정산 후 스냅샷 갱신 (CEI 패턴 준수)
- `getCompoundedBoldDeposit()`: 이제 `initialValue × P / P_snap`으로 정확한 현재 잔액 반환

---

### [P1] 초기화 함수 Deployer Guard

**근거**: SECURITY_REMEDIATION.md §4
**적용 파일**: 7개 컨트랙트

#### 문제

배포 직후 `setAddresses()` / `setAddressesRegistry()` 함수를 누구나 먼저 호출할 수 있는 **프론트러닝 취약점**.

```solidity
// Before — 누구나 호출 가능
function setAddresses(...) external {
    require(troveManager == address(0), "Already set"); // 선점하면 끝
    troveManager = _troveManager; // 악의적 주소로 초기화 가능
}
```

공격 시나리오: 배포 트랜잭션 이후 실제 초기화 트랜잭션 전 짧은 시간에, 공격자가 자신의 주소로 초기화 → **프로토콜 전체 탈취**.

#### 수정 — immutable deployer 패턴

```solidity
// After — 배포자만 호출 가능
address public immutable deployer;

constructor() {
    deployer = msg.sender; // 배포 시 한 번만 설정, 이후 변경 불가
}

function setAddresses(...) external {
    require(msg.sender == deployer, "[Contract]: not deployer"); // ← 추가
    require(troveManager == address(0), "Already set");
    ...
}
```

**적용 목록**:

| 컨트랙트 | 보호 함수 |
|---------|---------|
| `StabilityPool` | `setAddressesRegistry`, `setAddresses` |
| `ActivePool` | `setAddressesRegistry`, `setAddresses` |
| `SortedTroves` | `setAddressesRegistry`, `setAddresses` |
| `BorrowerOperations` | `setAddressesRegistry`, `setCollateralRegistry` |
| `TroveManager` | `setAddressesRegistry` |
| `DefaultPool` | `setAddresses` |
| `TroveNFT` | `setAddresses` |

---

### [P3] SbUSDToken — OpenZeppelin Ownable 상속

**근거**: SECURITY_REMEDIATION.md §2
**파일**: `packages/contracts-liquity/contracts/core/SbUSDToken.sol`

#### 문제

커스텀 `owner` 변수 + 커스텀 `onlyOwner` 구현은 표준 패턴에서 벗어나 있어 관리 취약점(소유권 이전 불가, 포기 불가) 발생.

```solidity
// Before — 커스텀 owner
address public owner;
modifier onlyOwner() { require(msg.sender == owner, "..."); _; }
constructor() ... { owner = msg.sender; }
// 소유권 이전/포기 방법 없음
```

#### 수정 — OZ Ownable 상속

```solidity
// After — OZ 표준
import "@openzeppelin/contracts/access/Ownable.sol";

contract SbUSDToken is ERC20, ERC20Permit, Ownable, ISbUSDToken {
    constructor()
        ERC20("Snowball USD", "sbUSD")
        ERC20Permit("Snowball USD")
        Ownable(msg.sender)
    {}
    // onlyOwner 자동 제공
    // transferOwnership(address) 지원
    // renounceOwnership() 지원 (탈중앙화 시 활용 가능)
}
```

---

### [P3] Pragma 버전 고정

**근거**: SECURITY_REMEDIATION.md §11
**적용 파일**: 15개 (`contracts/core/` 전체)

```solidity
// Before
pragma solidity ^0.8.24;  // 0.8.24 이상 모든 버전 허용

// After
pragma solidity 0.8.24;   // 정확히 0.8.24만 허용
```

`^` 캐럿 제거로 배포 시 컴파일러 버전을 고정. 예상치 못한 컴파일러 변경으로 인한 동작 차이를 방지.

---

## 이전 커밋 수정 내역 (커밋 `a028c4c`)

### [MEDIUM #29] TroveManager — batchLiquidateTroves 배치 크기 제한

**파일**: `TroveManager.sol`

```solidity
// 추가된 상수
uint256 public constant MAX_BATCH_LIQUIDATION = 50;

// 추가된 검증
function batchLiquidateTroves(uint256[] calldata _troveIds) external override {
    require(_troveIds.length <= MAX_BATCH_LIQUIDATION, "TroveManager: batch too large");
    ...
}
```

---

## False Positive 상세

감사 툴이 오탐으로 보고한 항목들. 수정 불필요.

| Finding | 분류 | 실제 상황 |
|---------|------|---------|
| CRITICAL #2 SbUSDToken constructor | FALSE POSITIVE | constructor는 배포 시 1회만 실행. 재호출 불가. |
| HIGH #3–6 ActivePool view modifier | FALSE POSITIVE | `getCollBalance` 등 view 함수에 `onlyAuthorized` 불필요. 조회는 누구나 가능해야 함. |
| HIGH #12 SbUSDToken ERC4626 | FALSE POSITIVE | SbUSDToken은 ERC20. ERC4626 vault 아님. 툴이 balance mapping 패턴을 오인. |
| HIGH #13–16 SbUSDToken modifier | FALSE POSITIVE | `mint`/`burn` → `onlyAuthorized`, `setBranchAddresses` → `onlyOwner` 이미 적용됨. |
| HIGH #17–25 SortedTroves view | FALSE POSITIVE | `contains`, `isEmpty` 등 view 함수는 외부에서 자유롭게 조회 가능해야 함. |
| HIGH #26 TroveNFT ERC4626 | FALSE POSITIVE | TroveNFT는 ERC721. ERC4626 vault 아님. |
| MEDIUM #9 BorrowerOps inconsistency | FALSE POSITIVE | `TroveManager.adjustTrove`가 `lastDebtUpdateTime`을 갱신함 (line 163). 이중 계산 없음. |
| MEDIUM #10 CollateralRegistry addBranch | FALSE POSITIVE | `CollateralRegistry`는 OZ `Ownable` 상속 중. `addBranch`는 `onlyOwner`로 보호됨. |
| MEDIUM #30–54 tainted-arithmetic | FALSE POSITIVE | Solidity 0.8+는 기본 overflow/underflow 체크 내장. SafeMath 별도 불필요. |

---

## 스킵 항목 (AgentVault 미사용)

CRITICAL #1, HIGH #7–11, MEDIUM #27–28 총 8개 항목이 AgentVault에 관련되어 있음.

AgentVault 컨트랙트는 현재 프로토콜에서 사용하지 않으므로 수정 보류.
향후 AgentVault를 재활성화할 경우 다음 항목 수정 필요:

| 항목 | 수정 내용 |
|------|---------|
| `approveFromVault` 제거 | 공유 풀에서 approve → 다른 유저 자산 탈취 가능. `spendFromVault`로 교체 |
| `transferFromVault` `to` 검증 | `to`가 `allowedTargets` 화이트리스트에 있어야 함 |
| `grantPermission` nonReentrant | 상태 변경 함수에 재진입 방지 추가 |
| `revokePermission` nonReentrant | 상태 변경 함수에 재진입 방지 추가 |
| `_containsAddress` 배열 크기 제한 | `MAX_TARGETS = 10` 등 상한선 설정 |

---

## 재배포 필요 여부

이번 수정은 컨트랙트 스토리지 구조 변경(StabilityPool Deposit 구조체)을 포함하므로 **재배포 필요**.

```bash
cd packages/contracts-liquity
npx hardhat compile
npx tsx scripts/deploy-viem.ts
```

재배포 후 업데이트 대상:
- `deployments/addresses.json` (스크립트가 자동 갱신)
- `packages/frontend/src/config/addresses.json` (수동)
- `/SSOT.md` (수동)
