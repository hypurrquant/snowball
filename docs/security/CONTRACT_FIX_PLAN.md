# 컨트랙트 수정 기획서

**기준 문서**: `FINAL_AUDIT_REPORT.md`
**현재 상태**: 커밋 `e49b25c` — 핵심 취약점 2차 패치 완료
**최종 위험 등급**: LOW (핵심 프로토콜 기준)

---

## 개요

FINAL_AUDIT_REPORT.md의 권고사항(§6) 기준으로 아직 수정되지 않은 항목들을 정리한 기획서.
이미 수정 완료된 항목(P/S/G accumulator, deployer guard, Ownable, pragma)은 제외.

---

## 수정 항목 전체 목록

| # | 우선순위 | 컨트랙트 | 항목 | 난이도 | 재배포 필요 |
|---|---------|---------|------|--------|------------|
| 1 | **P1** | CollSurplusPool | deployer guard 누락 | 하 | ✅ |
| 2 | **P1** | SortedTroves | `_findInsertPosition` 선형 탐색 가스 위험 | 중 | ✅ |
| 3 | **P1** | CollateralRegistry | `branches` 배열 상한선 없음 | 하 | ✅ |
| 4 | **P2** | 다수 | 이벤트 누락 (ActivePool 등) | 하 | ✅ |
| 5 | **P2** | 다수 | NatSpec 문서화 | 하 | 선택 |
| 6 | **P2** | BorrowerOperations/TroveManager | Pausable 긴급 정지 메커니즘 | 중 | ✅ |
| 7 | **P0 (조건)** | AgentVault | 재활성화 시 필수 수정 4건 | 상 | ✅ |

---

## P1 — 개선 권장

### 1. CollSurplusPool — deployer guard 누락

**보고서 참조**: R-05 (§6 Priority 1)
**파일**: `contracts/core/CollSurplusPool.sol:27-36`
**위험**: 배포 직후 `setAddresses()` 프론트러닝으로 악의적 `borrowerOperations` 주소 주입 가능

#### 현재 코드 (취약)

```solidity
function setAddresses(
    address _borrowerOperations,
    address _troveManager,
    address _collToken
) external {
    require(borrowerOperations == address(0), "Already set"); // 누구나 먼저 호출 가능
    borrowerOperations = _borrowerOperations;
    ...
}
```

#### 수정안

```solidity
address public immutable deployer;

constructor() {
    deployer = msg.sender;
}

function setAddresses(
    address _borrowerOperations,
    address _troveManager,
    address _collToken
) external {
    require(msg.sender == deployer, "CollSurplusPool: not deployer"); // ← 추가
    require(borrowerOperations == address(0), "Already set");
    borrowerOperations = _borrowerOperations;
    troveManager = _troveManager;
    collToken = IERC20(_collToken);
}
```

**영향**: 없음 (초기화 로직만 변경). 재배포 필요.

---

### 2. SortedTroves — `_findInsertPosition` 선형 탐색 가스 위험

**보고서 참조**: R-06 (§6 Priority 1)
**파일**: `contracts/core/SortedTroves.sol:167-185`
**위험**: 힌트(prevId/nextId)가 유효하지 않을 때 처음부터 전체 리스트를 선형 탐색. Trove가 많아질수록 `openTrove`, `adjustTroveInterestRate` 가스 급증.

#### 현재 코드 (위험)

```solidity
function _findInsertPosition(...) internal view returns (uint256, uint256) {
    // 힌트가 유효하면 즉시 반환 (OK)
    if (_prevId != 0 && nodes[_prevId].exists && ...) {
        return (_prevId, _nextId);
    }

    // 힌트가 없거나 유효하지 않으면 head부터 전체 선형 탐색 → O(n)
    uint256 current = head;
    while (current != 0 && nodes[current].annualInterestRate > _annualInterestRate) {
        prev = current;
        current = nodes[current].nextId; // ← Trove 수만큼 반복
    }
}
```

#### 수정안 A — 탐색 깊이 제한 (단순, 권장)

```solidity
uint256 public constant MAX_FIND_ITERATIONS = 200; // 최대 탐색 깊이

function _findInsertPosition(...) internal view returns (uint256, uint256) {
    // 힌트 유효성 검증 (기존 로직)
    if (_prevId != 0 && nodes[_prevId].exists && _nextId != 0 && nodes[_nextId].exists) {
        if (nodes[_prevId].annualInterestRate >= _annualInterestRate &&
            nodes[_nextId].annualInterestRate <= _annualInterestRate) {
            return (_prevId, _nextId);
        }
    }

    // 단방향 힌트: prevId만 있는 경우
    if (_prevId != 0 && nodes[_prevId].exists &&
        nodes[_prevId].annualInterestRate >= _annualInterestRate) {
        // prevId에서 앞으로 탐색
        uint256 current = _prevId;
        uint256 prev2 = nodes[_prevId].prevId;
        uint256 iters = 0;
        while (current != 0 && nodes[current].annualInterestRate >= _annualInterestRate && iters < MAX_FIND_ITERATIONS) {
            prev2 = current;
            current = nodes[current].nextId;
            iters++;
        }
        if (iters < MAX_FIND_ITERATIONS) return (prev2, current);
    }

    // 전체 탐색 — 최대 MAX_FIND_ITERATIONS 제한
    uint256 current = head;
    uint256 prev = 0;
    uint256 iters = 0;
    while (current != 0 &&
           nodes[current].annualInterestRate > _annualInterestRate &&
           iters < MAX_FIND_ITERATIONS) {
        prev = current;
        current = nodes[current].nextId;
        iters++;
    }
    require(iters < MAX_FIND_ITERATIONS, "SortedTroves: provide valid hints");
    return (prev, current);
}
```

#### 수정안 B — 단방향 힌트 우선 탐색 추가 (중간)

```solidity
// nextId만 있는 경우, nextId에서 역방향으로 더 빠르게 찾기
if (_nextId != 0 && nodes[_nextId].exists &&
    nodes[_nextId].annualInterestRate <= _annualInterestRate) {
    uint256 current = _nextId;
    uint256 prev = nodes[_nextId].prevId;
    while (prev != 0 && nodes[prev].annualInterestRate < _annualInterestRate) {
        current = prev;
        prev = nodes[prev].prevId;
    }
    return (prev, current);
}
```

**권장**: 수정안 A (탐색 깊이 제한). 힌트를 올바르게 전달하면 O(1), 잘못 전달하면 `require` 실패로 명확한 에러 메시지.

**프론트엔드/백엔드 영향**: HintHelpers 컨트랙트를 통해 정확한 힌트를 계산하여 전달해야 함. 현재 `0, 0` 힌트를 사용 중이라면 반드시 수정 필요.

> **주의**: 이 수정 후 `openTrove`, `adjustTroveInterestRate`에서 힌트 없이 `(0, 0)` 전달 시 Trove가 200개를 초과하면 revert됨. 백엔드/프론트엔드에서 HintHelpers 활용 필요.

---

### 3. CollateralRegistry — branches 배열 상한선 없음

**보고서 참조**: R-07 (§6 Priority 1)
**파일**: `contracts/core/CollateralRegistry.sol:30-48`
**위험**: `redeemCollateral()`이 `branches` 배열을 전체 순회. 브랜치가 많아지면 가스 초과.

#### 현재 코드 (위험)

```solidity
function addBranch(...) external onlyOwner {
    branches.push(Branch({...})); // 상한선 없음
}

function redeemCollateral(...) external {
    for (uint256 i = 0; i < branchCount && remainingBold > 0; i++) { // branchCount 무제한
        ...
    }
}
```

#### 수정안

```solidity
uint256 public constant MAX_BRANCHES = 10; // 최대 브랜치 수

function addBranch(...) external onlyOwner {
    require(branches.length < MAX_BRANCHES, "CollateralRegistry: max branches reached"); // ← 추가
    branches.push(Branch({
        token: _token,
        troveManager: _troveManager,
        borrowerOperations: _borrowerOperations,
        stabilityPool: _stabilityPool,
        activePool: _activePool,
        priceFeed: _priceFeed,
        isActive: true
    }));
    emit BranchAdded(branches.length - 1, _token);
}
```

**영향**: 없음 (현재 2개 브랜치 사용). 재배포 필요.

---

## P2 — 선택적 개선

### 4. 이벤트 누락 보강

**보고서 참조**: R-08 (§6 Priority 2)

현재 상태 변경이 있지만 이벤트가 없는 함수들. 오프체인 모니터링, 서브그래프 연동, 감사 추적에 필요.

| 컨트랙트 | 함수 | 추가할 이벤트 |
|---------|------|-------------|
| `ActivePool` | `receiveColl`, `sendColl` | `CollReceived(address from, uint256 amount)`, `CollSent(address to, uint256 amount)` |
| `ActivePool` | `increaseBoldDebt`, `decreaseBoldDebt` | `BoldDebtChanged(uint256 newDebt)` |
| `DefaultPool` | `increaseBoldDebt`, `sendCollToActivePool` | `DefaultDebtChanged(uint256 amount)`, `CollSentToActive(uint256 amount)` |
| `CollSurplusPool` | `accountSurplus`, `claimColl` | `SurplusRecorded(address user, uint256 amount)`, `SurplusClaimed(address user, uint256 amount)` |
| `StabilityPool` | `offset` (이미 있음) | ✅ OK |
| `TroveManager` | `liquidate` (이미 있음) | ✅ OK |

#### 예시 수정 (ActivePool)

```solidity
event CollReceived(address indexed from, uint256 amount);
event CollSent(address indexed to, uint256 amount);
event BoldDebtIncreased(uint256 amount, uint256 newTotal);
event BoldDebtDecreased(uint256 amount, uint256 newTotal);

function receiveColl(uint256 _amount) external override onlyAuthorized {
    collBalance += _amount;
    collToken.safeTransferFrom(msg.sender, address(this), _amount);
    emit CollReceived(msg.sender, _amount); // ← 추가
}

function sendColl(address _account, uint256 _amount) external override onlyAuthorized {
    collBalance -= _amount;
    collToken.safeTransfer(_account, _amount);
    emit CollSent(_account, _amount); // ← 추가
}
```

---

### 5. NatSpec 문서화

**보고서 참조**: R-09 (§6 Priority 2)

외부 함수에 `@notice`, `@param`, `@return` 추가. 컨트랙트 검증 사이트(Etherscan 등)와 IDE에서 자동 표시.

```solidity
/// @notice Open a new trove with collateral and borrow sbUSD
/// @param _owner The address that will own the trove (receives NFT)
/// @param _ownerIndex Index for trove ID derivation (0 for first trove per user)
/// @param _collAmount Amount of collateral token to deposit (wei)
/// @param _boldAmount Amount of sbUSD to borrow (wei)
/// @param _upperHint Sorted list insertion hint — trove with higher interest rate
/// @param _lowerHint Sorted list insertion hint — trove with lower interest rate
/// @param _annualInterestRate Annual interest rate in 1e18 scale (5e15 = 0.5%, 25e16 = 25%)
/// @param _maxUpfrontFee Maximum upfront fee the caller is willing to pay
/// @return troveId The ID of the newly created trove (also the NFT token ID)
function openTrove(...) external override returns (uint256 troveId) {
```

**우선순위**: 낮음. 기능에 영향 없음. 재배포 불필요 (오프체인 문서용은 주석만으로도 충분).

---

### 6. Pausable — 긴급 정지 메커니즘

**보고서 참조**: R-10 (§6 Priority 2)
**대상**: `BorrowerOperations`, `TroveManager` (사용자 자산 진입/출구)

#### 적용 시나리오

- 오라클 장애 (가격 조작 시도)
- 심각한 버그 발견 시 즉시 신규 포지션 생성/청산 차단
- 멀티시그로 관리

#### 수정안

```solidity
import "@openzeppelin/contracts/utils/Pausable.sol";

contract BorrowerOperations is IBorrowerOperations, Pausable {
    address public guardian; // 긴급 정지 권한 주소 (멀티시그 권장)

    modifier onlyGuardian() {
        require(msg.sender == guardian, "BorrowerOps: not guardian");
        _;
    }

    function pause() external onlyGuardian { _pause(); }
    function unpause() external onlyGuardian { _unpause(); }

    // 핵심 함수에 whenNotPaused 추가
    function openTrove(...) external override whenNotPaused returns (uint256) { ... }
    function adjustTrove(...) external override whenNotPaused { ... }
    function closeTrove(...) external override whenNotPaused { ... }

    // 청산과 상환은 위기 상황에서도 허용 (부채 감소이므로)
    // liquidate, redeemCollateral에는 whenNotPaused 미적용
}
```

**고려사항**: `guardian` 주소는 Gnosis Safe 멀티시그 사용 권장. 단일 EOA 사용 시 중앙화 리스크 발생.

---

## P0 (조건부) — AgentVault 재활성화 시

> AgentVault를 현재 사용하지 않는다면 이 섹션은 스킵. 재활성화 결정 시 필수 적용.

### AV-01. `approveFromVault` 제거 → `spendFromVault` 교체

**심각도**: CRITICAL
**파일**: `AgentVault.sol:119-135`

공유 풀에서 `forceApprove` 호출 시 다른 사용자 자산까지 노출.

```solidity
// 제거 대상
function approveFromVault(address user, address token, address spender, uint256 amount) external nonReentrant {
    ...
    IERC20(token).forceApprove(spender, amount); // ← 삭제
}

// 교체할 함수
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
    require(_containsAddress(perm.allowedTargets, to), "AgentVault: target not allowed"); // ← 필수
    require(_balances[user][token] >= amount, "AgentVault: insufficient balance");

    perm.spent += amount;
    _balances[user][token] -= amount;
    IERC20(token).safeTransfer(to, amount); // approve 대신 직접 transfer
}
```

### AV-02. `transferFromVault` `to` 주소 검증 추가

**심각도**: HIGH
**파일**: `AgentVault.sol:139-156`

```solidity
function transferFromVault(...) external nonReentrant {
    ...
    require(_containsAddress(perm.allowedTargets, to), "AgentVault: target not allowed"); // ← 추가
    ...
}
```

### AV-03. grantPermission / revokePermission nonReentrant 추가

**심각도**: MEDIUM
**파일**: `AgentVault.sol:49, 74`

```solidity
function grantPermission(...) external override nonReentrant { ... } // ← nonReentrant 추가
function revokePermission(address agent) external override nonReentrant { ... } // ← nonReentrant 추가
```

### AV-04. allowedTargets / allowedFunctions 배열 크기 제한

**심각도**: MEDIUM
**파일**: `AgentVault.sol:49-71`

```solidity
uint256 public constant MAX_TARGETS = 10;
uint256 public constant MAX_FUNCTIONS = 20;

function grantPermission(...) external override nonReentrant {
    require(targets.length > 0 && targets.length <= MAX_TARGETS, "AgentVault: invalid targets count");
    require(functions.length > 0 && functions.length <= MAX_FUNCTIONS, "AgentVault: invalid functions count");
    ...
}
```

---

## 수정 일정 (권장)

| 단계 | 항목 | 작업 | 비고 |
|------|------|------|------|
| **즉시** | P1-1 CollSurplusPool deployer guard | 코드 수정 + 재배포 | 간단, 1시간 이내 |
| **즉시** | P1-3 CollateralRegistry MAX_BRANCHES | 코드 수정 + 재배포 | 간단, 30분 이내 |
| **단기** | P1-2 SortedTroves 탐색 깊이 제한 | 코드 수정 + 재배포 + 프론트엔드 힌트 연동 | 백엔드 힌트 계산 필요 |
| **중기** | P2-1 이벤트 보강 | 코드 수정 + 재배포 | 기능 영향 없음 |
| **중기** | P2-3 Pausable | 설계 + 코드 수정 + 재배포 | guardian 주소 결정 필요 |
| **장기** | P2-2 NatSpec | 주석 추가 | 재배포 선택사항 |
| **조건** | P0 AgentVault 4건 | 재활성화 결정 시 | 즉시 적용 필수 |

---

## 재배포 영향 범위

P1 항목 3개를 모두 수정하면 총 3개 컨트랙트 재배포:

```
CollSurplusPool (새 주소)
SortedTroves (새 주소)
CollateralRegistry (새 주소)
```

단, CollSurplusPool과 SortedTroves는 AddressesRegistry에 등록된 주소이므로 재배포 시 전체 브랜치 재배포 또는 AddressesRegistry 업데이트가 필요.

> **현실적 접근**: P1-1(CollSurplusPool)과 P1-3(CollateralRegistry)은 즉시 수정. P1-2(SortedTroves)는 테스트넷에서 Trove 수가 제한적이므로 메인넷 전환 전에 적용.

---

## 수정하지 않아도 되는 항목

FINAL_AUDIT_REPORT.md에서 이미 FALSE POSITIVE로 확인된 항목들. 추가 수정 불필요.

| Finding | 이유 |
|---------|------|
| ActivePool view 함수 modifier | view 함수에 접근 제어 불필요 |
| SortedTroves view 함수 modifier | view 함수에 접근 제어 불필요 |
| SbUSDToken ERC4626 inflation | ERC20이지 ERC4626 아님 |
| TroveNFT ERC4626 inflation | ERC721이지 ERC4626 아님 |
| tainted-arithmetic 27건 | Solidity 0.8+ 내장 보호 |
| BorrowerOperations state inconsistency | adjustTrove가 lastDebtUpdateTime 갱신 확인 |
| CollateralRegistry addBranch 접근제어 | OZ Ownable의 onlyOwner가 이미 보호 |
