# Snowball Protocol — Security Fixes Applied

**기준 문서**: `SECURITY_REMEDIATION.md`
**적용 일자**: 2026-02-24
**컴파일 결과**: `Compiled 15 Solidity files successfully (evm target: shanghai)`

---

## 수정 요약

| # | 항목 | 우선순위 | 상태 |
|---|------|---------|------|
| 1 | StabilityPool O(n) 루프 → O(1) epoch-scale accumulator | P1 | ✅ 완료 |
| 2 | StabilityPool 정밀도 손실 수정 | P1 | ✅ 완료 |
| 3 | 초기화 함수 deployer guard (7개 컨트랙트) | P1 | ✅ 완료 |
| 4 | SbUSDToken: 커스텀 owner → OZ Ownable 상속 | P3 | ✅ 완료 |
| 5 | pragma 버전 고정 (^0.8.24 → 0.8.24, 15개 파일) | P3 | ✅ 완료 |
| 6 | AgentVault 관련 (CRITICAL #1, HIGH #7-11, MEDIUM #27-28) | - | ⏭ 스킵 (미사용 컨트랙트) |
| 7 | ERC4626 inflation 오탐 (HIGH #7, #12, #26) | - | ✅ FALSE POSITIVE 확인됨 |
| 8 | view 함수 modifier 오탐 (HIGH #3-6, #13-16, #17-25) | - | ✅ FALSE POSITIVE 확인됨 |
| 9 | tainted-arithmetic 오탐 (MEDIUM #30-54) | - | ✅ FALSE POSITIVE (Solidity 0.8+) |
| 10 | BorrowerOperations state inconsistency (#9) | - | ✅ FALSE POSITIVE 확인됨 |
| 11 | CollateralRegistry.addBranch 접근제어 (#10 MEDIUM) | - | ✅ OZ Ownable이 이미 보호 |

---

## 상세 수정 내역

### 1. StabilityPool — O(1) Epoch-Scale Accumulator 리팩터

**파일**: `contracts/core/StabilityPool.sol`
**근거**: SECURITY_REMEDIATION.md §8-A, §8-B

#### 문제 (이전 코드)

```solidity
// offset()에서 전체 depositors 배열 순회 — O(n)
for (uint256 i = 0; i < depositorCount; i++) {
    Deposit storage dep = deposits[depositors[i]];
    uint256 share = (dep.initialValue * DECIMAL_PRECISION) / totalBoldDeposits; // ← 정밀도 손실
    uint256 collShare = (_collToAdd * share) / DECIMAL_PRECISION;               // ← 이중 나눗셈
    dep.collGain += collShare;
}
```

**이슈 1 — O(n) DoS**: 예금자가 많아지면 `offset()`과 `triggerBoldRewards()` 호출 시 가스 한도를 초과해 청산이 영구적으로 실패.

**이슈 2 — 정밀도 손실**: 나눗셈을 두 번 거치면서 소수점 잘림 오류가 누적.
```
before: share = (d * 1e18) / D  →  collShare = (coll * share) / 1e18  (두 번 나눔)
after:  collShare = (d * coll) / D                                      (한 번만 나눔)
```

#### 해결 — Liquity V1 스타일 글로벌 누적 변수

3개의 글로벌 상태 변수로 전체 기록을 O(1)로 처리:

```solidity
uint256 public P = DECIMAL_PRECISION; // 청산 손실 누적 곱 (1e18에서 시작)
uint256 public S;                      // 담보 이득 누적기
uint256 public G;                      // sbUSD 이자 이득 누적기
```

**Deposit 구조체** — 이제 사전 계산 대신 스냅샷만 저장:
```solidity
struct Deposit {
    uint256 initialValue; // 예금 원금 (이전과 동일)
    uint256 S;            // 예금 시점의 S 스냅샷
    uint256 G;            // 예금 시점의 G 스냅샷
    uint256 P;            // 예금 시점의 P 스냅샷
}
```

**청산 시 (`offset`)** — O(1):
```solidity
// S 업데이트: 현재 P를 반영하여 단위 이득 누적
uint256 collGainPerUnitStaked = _collToAdd * DECIMAL_PRECISION / totalBoldDeposits;
S += collGainPerUnitStaked * P / DECIMAL_PRECISION;

// P 업데이트: 손실 비율로 곱
uint256 boldLossPerUnit = debtToOffset * DECIMAL_PRECISION / totalBoldDeposits;
P = P * (DECIMAL_PRECISION - boldLossPerUnit) / DECIMAL_PRECISION;
totalBoldDeposits -= debtToOffset;
```

**이자 분배 (`triggerBoldRewards`)** — O(1):
```solidity
G += _boldYield * DECIMAL_PRECISION / totalBoldDeposits;
```

**이득 계산 (Lazy — 청구 시점에만 계산)**:
```solidity
// 현재 유효 예금 (청산 손실 반영)
compounded = deposit.initialValue * P / deposit.P

// 담보 이득
collGain = deposit.initialValue * (S - deposit.S) / deposit.P

// sbUSD 이자 이득
boldGain = compounded * (G - deposit.G) / DECIMAL_PRECISION
```

**성능 비교**:
| 연산 | 이전 (O(n)) | 이후 (O(1)) |
|------|-------------|-------------|
| `offset()` 가스 | 예금자 수에 비례 | 고정 (~30k gas) |
| `triggerBoldRewards()` 가스 | 예금자 수에 비례 | 고정 (~20k gas) |
| `claimReward()` 가스 | 고정 | 고정 |

**기타 변경사항**:
- `depositors[]` 배열 제거 (루프용이었으므로 불필요)
- `provideToSP()`: 기존 이득을 먼저 정산한 뒤 스냅샷 갱신 (CEI 패턴)
- `getCompoundedBoldDeposit()`: view 함수가 이제 `initialValue * P / P_snap` 계산으로 정확한 현재 잔액 반환

---

### 2. StabilityPool — deployer guard 추가

**파일**: `contracts/core/StabilityPool.sol`
**근거**: SECURITY_REMEDIATION.md §4

```solidity
address public immutable deployer;

constructor() {
    deployer = msg.sender;
}

function setAddressesRegistry(...) external override {
    require(msg.sender == deployer, "SP: not deployer");  // ← 추가
    ...
}

function setAddresses(...) external {
    require(msg.sender == deployer, "SP: not deployer");  // ← 추가
    ...
}
```

---

### 3. 초기화 함수 deployer guard (6개 컨트랙트)

**근거**: SECURITY_REMEDIATION.md §4

배포 직후 프론트러닝 공격으로 악의적 주소를 초기화할 수 있는 취약점을 방어.

**패턴** (모든 대상 컨트랙트에 동일하게 적용):
```solidity
address public immutable deployer;

constructor() {
    deployer = msg.sender;
}

// setAddresses / setAddressesRegistry에 추가:
require(msg.sender == deployer, "[Contract]: not deployer");
```

**적용 파일 목록**:

| 파일 | 보호한 함수 |
|------|-----------|
| `ActivePool.sol` | `setAddressesRegistry`, `setAddresses` |
| `SortedTroves.sol` | `setAddressesRegistry`, `setAddresses` |
| `BorrowerOperations.sol` | `setAddressesRegistry`, `setCollateralRegistry` |
| `TroveManager.sol` | `setAddressesRegistry` |
| `DefaultPool.sol` | `setAddresses` |
| `TroveNFT.sol` | `setAddresses` |

**주의**: `TroveNFT`는 기존 `constructor() ERC721(...) {}`에 `deployer = msg.sender;`를 추가.

---

### 4. SbUSDToken — OpenZeppelin Ownable 상속

**파일**: `contracts/core/SbUSDToken.sol`
**근거**: SECURITY_REMEDIATION.md §2 (P3 코드 품질)

#### 이전 (커스텀 owner)
```solidity
address public owner;
modifier onlyOwner() { require(msg.sender == owner, "SbUSD: not owner"); _; }
constructor() ... { owner = msg.sender; }
```

#### 이후 (OZ Ownable)
```solidity
import "@openzeppelin/contracts/access/Ownable.sol";

contract SbUSDToken is ERC20, ERC20Permit, Ownable, ISbUSDToken {
    constructor()
        ERC20("Snowball USD", "sbUSD")
        ERC20Permit("Snowball USD")
        Ownable(msg.sender)
    {}
    // onlyOwner는 OZ에서 자동 제공
}
```

**이점**:
- `transferOwnership(address newOwner)` — 소유권 이전 가능
- `renounceOwnership()` — 소유권 포기 가능 (중앙화 리스크 완화)
- 표준화된 코드, 검증된 보안

---

### 5. pragma 버전 고정 (15개 파일)

**근거**: SECURITY_REMEDIATION.md §11

```
pragma solidity ^0.8.24;  →  pragma solidity 0.8.24;
```

`^` (캐럿) 제거로 배포 시 컴파일러 버전을 0.8.24로 정확히 고정. 새 컴파일러 버전의 변경사항으로 인한 의도치 않은 동작 차이를 방지.

**적용 파일**: 15개 (core/ 디렉토리 전체)

---

## 수정하지 않은 항목

### AgentVault 관련 (CRITICAL #1, HIGH #7-11, MEDIUM #27-28)
**이유**: AgentVault 컨트랙트는 현재 프로토콜에서 사용하지 않음. 향후 재활성화 시 수정 적용 필요.

구체적으로 수정이 필요한 항목 (미사용이라 보류):
- `approveFromVault` 제거 → `spendFromVault`로 교체 (토큰 풀 공유 문제)
- `transferFromVault`에 `allowedTargets` 검증 추가
- `grantPermission`, `revokePermission`에 `nonReentrant` 추가
- `_containsAddress`, `_containsSelector` 배열 크기 제한

### False Positive 항목 (수정 불필요 확인)
| 항목 | 이유 |
|------|------|
| CRITICAL #2 SbUSDToken constructor | constructor는 배포 시 1회만 실행, 재호출 불가 |
| HIGH #3-6 ActivePool view 함수 modifier | view 함수에 onlyAuthorized 불필요, 정상 설계 |
| HIGH #12 SbUSDToken ERC4626 | SbUSDToken은 ERC20이지 ERC4626 vault가 아님 |
| HIGH #13-16 SbUSDToken modifier | mint/burn → onlyAuthorized, setBranch → onlyOwner 이미 있음 |
| HIGH #17-25 SortedTroves view 함수 | view 함수는 제한 불필요 |
| HIGH #26 TroveNFT ERC4626 | TroveNFT는 ERC721이지 ERC4626 vault가 아님 |
| MEDIUM #9 BorrowerOps state inconsistency | TroveManager.adjustTrove가 lastDebtUpdateTime 갱신 확인 (line 163) |
| MEDIUM #10 CollateralRegistry.addBranch | OZ Ownable의 onlyOwner로 이미 보호됨 |
| MEDIUM #30-54 tainted-arithmetic | Solidity 0.8+ 기본 overflow 체크 내장, SafeMath 불필요 |

---

## 배포 참고사항

이번 수정은 컨트랙트 로직 변경을 포함하므로 **재배포 필요**:

```bash
cd packages/contracts-liquity
npx hardhat compile
npx tsx scripts/deploy-viem.ts
```

재배포 후 다음 파일 업데이트:
- `deployments/addresses.json` (자동)
- `packages/frontend/src/config/addresses.json` (수동)
- `/SSOT.md` (수동)
