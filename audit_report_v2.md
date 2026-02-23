# Smart Contract Security Audit Report

**Target:** `/Users/hik/Documents/GitHub/ctc/snowball/packages/contracts-liquity/contracts/core/`
**Date:** 2026-02-24 02:42:08
**Auditor:** SC Audit Agent v1.0
**Duration:** 0.07s

## Executive Summary

| Metric | Value |
|--------|-------|
| Files Analyzed | 15 |
| Contracts Found | 19 |
| Total Findings | 54 |
| Detectors Run | 52 |
| Analysis Errors | 7 |

### Severity Breakdown

| Severity | Count |
|----------|-------|
| Critical | 2 |
| High | 24 |
| Medium | 28 |

## [CRITICAL] Critical Severity Findings

### 1. Tainted External Call Target

**Detector:** `tainted-call-target`
**Confidence:** MEDIUM
**SWC:** [SWC-107](https://swcregistry.io/docs/SWC-107)
**Location:** `/Users/hik/Documents/GitHub/ctc/snowball/packages/contracts-liquity/contracts/core/AgentVault.sol:100`
**Contract:** `AgentVault`
**Function:** `executeOnBehalf`

**Description:**
User-controlled input (CALLDATA) flows to an external call target via: target

**Code:**
```solidity
Taint chain: target
```

**Recommendation:**
Validate the call target against an allow-list or ensure it originates from a trusted storage variable rather than user input.

**Related Real-World Incidents:**
- Poly Network $611M (2021) – attacker-controlled call target

---

### 2. Unprotected Sensitive Function

**Detector:** `unprotected-sensitive`
**Confidence:** MEDIUM
**SWC:** [SWC-105](https://swcregistry.io/docs/SWC-105)
**Location:** `/Users/hik/Documents/GitHub/ctc/snowball/packages/contracts-liquity/contracts/core/SbUSDToken.sol:35-40`
**Contract:** `SbUSDToken`
**Function:** `constructor`

**Description:**
Function SbUSDToken.constructor() is public and contains ownership transfer but has no access control. Anyone can call this function.

**Code:**
```solidity
  34 | 
  35 |     constructor() ERC20("Snowball USD", "sbUSD") ERC20Permit("Snowball USD") {
  36 |         owner = msg.sender;
  37 |     }
  38 | 
  39 |     function setBranchAddresses(
  40 |         address _troveManagerAddress,
  41 |         address _stabilityPoolAddress,
  42 |         address _borrowerOperationsAddress,
  43 |         address _activePoolAddress
```

**Recommendation:**
Add access control modifiers (onlyOwner, onlyRole, etc.) to sensitive functions. Use OpenZeppelin's Ownable or AccessControl contracts.

**Related Real-World Incidents:**
- Parity Wallet Freeze (2017) - $150M (unprotected kill function)
- Parity Wallet Hack (2017) - $31M (unprotected initWallet)
- Rubixi (2016) - Constructor naming bug allowing ownership takeover
- HospoWise (2018) - Unprotected init function

---

## [HIGH] High Severity Findings

### 3. Missing Modifier in Override

**Detector:** `missing-modifier-in-override`
**Confidence:** MEDIUM
**Location:** `/Users/hik/Documents/GitHub/ctc/snowball/packages/contracts-liquity/contracts/core/ActivePool.sol:36-0`
**Contract:** `ActivePool`
**Function:** `setAddressesRegistry`

**Description:**
Override `setAddressesRegistry` is missing safety modifier(s) onlyauthorized present on `receiveColl`.

**Code:**
```solidity
function setAddressesRegistry(address _addressesRegistry) external override {
        require(!isInitialized, "Already initialized");
        isInitialized = true;
        addressesRegistry = _address
```

**Recommendation:**
Ensure overridden functions retain all safety modifiers from the base implementation.  Review the inheritance chain carefully.

---

### 4. Missing Modifier in Override

**Detector:** `missing-modifier-in-override`
**Confidence:** MEDIUM
**Location:** `/Users/hik/Documents/GitHub/ctc/snowball/packages/contracts-liquity/contracts/core/ActivePool.sol:57-0`
**Contract:** `ActivePool`
**Function:** `getCollBalance`

**Description:**
Override `getCollBalance` is missing safety modifier(s) onlyauthorized present on `receiveColl`.

**Code:**
```solidity
function getCollBalance() external view override returns (uint256) {
        return collBalance;
    }
```

**Recommendation:**
Ensure overridden functions retain all safety modifiers from the base implementation.  Review the inheritance chain carefully.

---

### 5. Missing Modifier in Override

**Detector:** `missing-modifier-in-override`
**Confidence:** MEDIUM
**Location:** `/Users/hik/Documents/GitHub/ctc/snowball/packages/contracts-liquity/contracts/core/ActivePool.sol:61-0`
**Contract:** `ActivePool`
**Function:** `getBoldDebt`

**Description:**
Override `getBoldDebt` is missing safety modifier(s) onlyauthorized present on `receiveColl`.

**Code:**
```solidity
function getBoldDebt() external view override returns (uint256) {
        return boldDebt;
    }
```

**Recommendation:**
Ensure overridden functions retain all safety modifiers from the base implementation.  Review the inheritance chain carefully.

---

### 6. Missing Modifier in Override

**Detector:** `missing-modifier-in-override`
**Confidence:** MEDIUM
**Location:** `/Users/hik/Documents/GitHub/ctc/snowball/packages/contracts-liquity/contracts/core/ActivePool.sol:65-0`
**Contract:** `ActivePool`
**Function:** `aggWeightedDebtSum`

**Description:**
Override `aggWeightedDebtSum` is missing safety modifier(s) onlyauthorized present on `receiveColl`.

**Code:**
```solidity
function aggWeightedDebtSum() external view override returns (uint256) {
        return _aggWeightedDebtSum;
    }
```

**Recommendation:**
Ensure overridden functions retain all safety modifiers from the base implementation.  Review the inheritance chain carefully.

---

### 7. ERC4626 Share Inflation Attack

**Detector:** `erc4626-inflation`
**Confidence:** MEDIUM
**Location:** `/Users/hik/Documents/GitHub/ctc/snowball/packages/contracts-liquity/contracts/core/AgentVault.sol:12-15`
**Contract:** `AgentVault`

**Description:**
ERC4626 vault AgentVault lacks share inflation protection. No virtual shares/assets offset, dead shares, or minimum deposit found. First depositor can steal funds from subsequent depositors.

**Code:**
```solidity
  12 | contract AgentVault is IAgentVault, ReentrancyGuard {
  13 |     using SafeERC20 for IERC20;
  14 | 
  15 |     // user => token => balance
  16 |     mapping(address => mapping(address => uint256)) private _balances;
  17 | 
```

**Recommendation:**
Implement virtual shares and virtual assets (OpenZeppelin ERC4626 default). Use a minimum deposit amount. Add dead shares on first deposit. Override _decimalsOffset() to return a non-zero value.

**Related Real-World Incidents:**
- Appears in nearly every ERC4626 Sherlock/C4 audit
- Multiple vault protocols exploited via inflation attack

---

### 8. Missing Modifier in Override

**Detector:** `missing-modifier-in-override`
**Confidence:** MEDIUM
**Location:** `/Users/hik/Documents/GitHub/ctc/snowball/packages/contracts-liquity/contracts/core/AgentVault.sol:49-0`
**Contract:** `AgentVault`
**Function:** `grantPermission`

**Description:**
Override `grantPermission` is missing safety modifier(s) nonreentrant present on `deposit`.

**Code:**
```solidity
function grantPermission(
        address agent,
        address[] calldata targets,
        bytes4[] calldata functions,
        uint256 cap,
        uint256 expiry
    ) external override {
        
```

**Recommendation:**
Ensure overridden functions retain all safety modifiers from the base implementation.  Review the inheritance chain carefully.

---

### 9. Missing Modifier in Override

**Detector:** `missing-modifier-in-override`
**Confidence:** MEDIUM
**Location:** `/Users/hik/Documents/GitHub/ctc/snowball/packages/contracts-liquity/contracts/core/AgentVault.sol:74-0`
**Contract:** `AgentVault`
**Function:** `revokePermission`

**Description:**
Override `revokePermission` is missing safety modifier(s) nonreentrant present on `deposit`.

**Code:**
```solidity
function revokePermission(address agent) external override {
        require(_permissions[msg.sender][agent].active, "AgentVault: not active");
        _permissions[msg.sender][agent].active = false;

```

**Recommendation:**
Ensure overridden functions retain all safety modifiers from the base implementation.  Review the inheritance chain carefully.

---

### 10. Missing Modifier in Override

**Detector:** `missing-modifier-in-override`
**Confidence:** MEDIUM
**Location:** `/Users/hik/Documents/GitHub/ctc/snowball/packages/contracts-liquity/contracts/core/AgentVault.sol:160-0`
**Contract:** `AgentVault`
**Function:** `getPermission`

**Description:**
Override `getPermission` is missing safety modifier(s) nonreentrant present on `deposit`.

**Code:**
```solidity
function getPermission(address user, address agent) external view override returns (Permission memory) {
        return _permissions[user][agent];
    }
```

**Recommendation:**
Ensure overridden functions retain all safety modifiers from the base implementation.  Review the inheritance chain carefully.

---

### 11. Missing Modifier in Override

**Detector:** `missing-modifier-in-override`
**Confidence:** MEDIUM
**Location:** `/Users/hik/Documents/GitHub/ctc/snowball/packages/contracts-liquity/contracts/core/AgentVault.sol:164-0`
**Contract:** `AgentVault`
**Function:** `getBalance`

**Description:**
Override `getBalance` is missing safety modifier(s) nonreentrant present on `deposit`.

**Code:**
```solidity
function getBalance(address user, address token) external view override returns (uint256) {
        return _balances[user][token];
    }
```

**Recommendation:**
Ensure overridden functions retain all safety modifiers from the base implementation.  Review the inheritance chain carefully.

---

### 12. ERC4626 Share Inflation Attack

**Detector:** `erc4626-inflation`
**Confidence:** MEDIUM
**Location:** `/Users/hik/Documents/GitHub/ctc/snowball/packages/contracts-liquity/contracts/core/SbUSDToken.sol:9-12`
**Contract:** `SbUSDToken`

**Description:**
ERC4626 vault SbUSDToken lacks share inflation protection. No virtual shares/assets offset, dead shares, or minimum deposit found. First depositor can steal funds from subsequent depositors.

**Code:**
```solidity
  9 | contract SbUSDToken is ERC20, ERC20Permit, ISbUSDToken {
  10 |     address public collateralRegistryAddress;
  11 |     address public owner;
  12 | 
  13 |     // Per-branch authorized minters/burners
  14 |     mapping(address => bool) public troveManagers;
```

**Recommendation:**
Implement virtual shares and virtual assets (OpenZeppelin ERC4626 default). Use a minimum deposit amount. Add dead shares on first deposit. Override _decimalsOffset() to return a non-zero value.

**Related Real-World Incidents:**
- Appears in nearly every ERC4626 Sherlock/C4 audit
- Multiple vault protocols exploited via inflation attack

---

### 13. Missing Modifier in Override

**Detector:** `missing-modifier-in-override`
**Confidence:** MEDIUM
**Location:** `/Users/hik/Documents/GitHub/ctc/snowball/packages/contracts-liquity/contracts/core/SbUSDToken.sol:39-0`
**Contract:** `SbUSDToken`
**Function:** `setBranchAddresses`

**Description:**
Override `setBranchAddresses` is missing safety modifier(s) onlyauthorized present on `mint`.

**Code:**
```solidity
function setBranchAddresses(
        address _troveManagerAddress,
        address _stabilityPoolAddress,
        address _borrowerOperationsAddress,
        address _activePoolAddress
    ) external 
```

**Recommendation:**
Ensure overridden functions retain all safety modifiers from the base implementation.  Review the inheritance chain carefully.

---

### 14. Missing Modifier in Override

**Detector:** `missing-modifier-in-override`
**Confidence:** MEDIUM
**Location:** `/Users/hik/Documents/GitHub/ctc/snowball/packages/contracts-liquity/contracts/core/SbUSDToken.sol:51-0`
**Contract:** `SbUSDToken`
**Function:** `setCollateralRegistry`

**Description:**
Override `setCollateralRegistry` is missing safety modifier(s) onlyauthorized present on `mint`.

**Code:**
```solidity
function setCollateralRegistry(address _collateralRegistryAddress) external override onlyOwner {
        collateralRegistryAddress = _collateralRegistryAddress;
    }
```

**Recommendation:**
Ensure overridden functions retain all safety modifiers from the base implementation.  Review the inheritance chain carefully.

---

### 15. Missing Modifier in Override

**Detector:** `missing-modifier-in-override`
**Confidence:** MEDIUM
**Location:** `/Users/hik/Documents/GitHub/ctc/snowball/packages/contracts-liquity/contracts/core/SbUSDToken.sol:55-0`
**Contract:** `SbUSDToken`
**Function:** `mint`

**Description:**
Override `mint` is missing safety modifier(s) onlyowner present on `setBranchAddresses`.

**Code:**
```solidity
function mint(address _account, uint256 _amount) external override onlyAuthorized {
        _mint(_account, _amount);
    }
```

**Recommendation:**
Ensure overridden functions retain all safety modifiers from the base implementation.  Review the inheritance chain carefully.

---

### 16. Missing Modifier in Override

**Detector:** `missing-modifier-in-override`
**Confidence:** MEDIUM
**Location:** `/Users/hik/Documents/GitHub/ctc/snowball/packages/contracts-liquity/contracts/core/SbUSDToken.sol:59-0`
**Contract:** `SbUSDToken`
**Function:** `burn`

**Description:**
Override `burn` is missing safety modifier(s) onlyowner present on `setBranchAddresses`.

**Code:**
```solidity
function burn(address _account, uint256 _amount) external override onlyAuthorized {
        _burn(_account, _amount);
    }
```

**Recommendation:**
Ensure overridden functions retain all safety modifiers from the base implementation.  Review the inheritance chain carefully.

---

### 17. Missing Modifier in Override

**Detector:** `missing-modifier-in-override`
**Confidence:** MEDIUM
**Location:** `/Users/hik/Documents/GitHub/ctc/snowball/packages/contracts-liquity/contracts/core/SortedTroves.sol:35-0`
**Contract:** `SortedTroves`
**Function:** `setAddressesRegistry`

**Description:**
Override `setAddressesRegistry` is missing safety modifier(s) onlyauthorized present on `insert`.

**Code:**
```solidity
function setAddressesRegistry(address _addressesRegistry) external override {
        require(!isInitialized, "Already initialized");
        isInitialized = true;
        addressesRegistry = _address
```

**Recommendation:**
Ensure overridden functions retain all safety modifiers from the base implementation.  Review the inheritance chain carefully.

---

### 18. Missing Modifier in Override

**Detector:** `missing-modifier-in-override`
**Confidence:** MEDIUM
**Location:** `/Users/hik/Documents/GitHub/ctc/snowball/packages/contracts-liquity/contracts/core/SortedTroves.sol:128-0`
**Contract:** `SortedTroves`
**Function:** `contains`

**Description:**
Override `contains` is missing safety modifier(s) onlyauthorized present on `insert`.

**Code:**
```solidity
function contains(uint256 _id) external view override returns (bool) {
        return nodes[_id].exists;
    }
```

**Recommendation:**
Ensure overridden functions retain all safety modifiers from the base implementation.  Review the inheritance chain carefully.

---

### 19. Missing Modifier in Override

**Detector:** `missing-modifier-in-override`
**Confidence:** MEDIUM
**Location:** `/Users/hik/Documents/GitHub/ctc/snowball/packages/contracts-liquity/contracts/core/SortedTroves.sol:132-0`
**Contract:** `SortedTroves`
**Function:** `isEmpty`

**Description:**
Override `isEmpty` is missing safety modifier(s) onlyauthorized present on `insert`.

**Code:**
```solidity
function isEmpty() external view override returns (bool) {
        return size == 0;
    }
```

**Recommendation:**
Ensure overridden functions retain all safety modifiers from the base implementation.  Review the inheritance chain carefully.

---

### 20. Missing Modifier in Override

**Detector:** `missing-modifier-in-override`
**Confidence:** MEDIUM
**Location:** `/Users/hik/Documents/GitHub/ctc/snowball/packages/contracts-liquity/contracts/core/SortedTroves.sol:136-0`
**Contract:** `SortedTroves`
**Function:** `getSize`

**Description:**
Override `getSize` is missing safety modifier(s) onlyauthorized present on `insert`.

**Code:**
```solidity
function getSize() external view override returns (uint256) {
        return size;
    }
```

**Recommendation:**
Ensure overridden functions retain all safety modifiers from the base implementation.  Review the inheritance chain carefully.

---

### 21. Missing Modifier in Override

**Detector:** `missing-modifier-in-override`
**Confidence:** MEDIUM
**Location:** `/Users/hik/Documents/GitHub/ctc/snowball/packages/contracts-liquity/contracts/core/SortedTroves.sol:140-0`
**Contract:** `SortedTroves`
**Function:** `getFirst`

**Description:**
Override `getFirst` is missing safety modifier(s) onlyauthorized present on `insert`.

**Code:**
```solidity
function getFirst() external view override returns (uint256) {
        return head;
    }
```

**Recommendation:**
Ensure overridden functions retain all safety modifiers from the base implementation.  Review the inheritance chain carefully.

---

### 22. Missing Modifier in Override

**Detector:** `missing-modifier-in-override`
**Confidence:** MEDIUM
**Location:** `/Users/hik/Documents/GitHub/ctc/snowball/packages/contracts-liquity/contracts/core/SortedTroves.sol:144-0`
**Contract:** `SortedTroves`
**Function:** `getLast`

**Description:**
Override `getLast` is missing safety modifier(s) onlyauthorized present on `insert`.

**Code:**
```solidity
function getLast() external view override returns (uint256) {
        return tail;
    }
```

**Recommendation:**
Ensure overridden functions retain all safety modifiers from the base implementation.  Review the inheritance chain carefully.

---

### 23. Missing Modifier in Override

**Detector:** `missing-modifier-in-override`
**Confidence:** MEDIUM
**Location:** `/Users/hik/Documents/GitHub/ctc/snowball/packages/contracts-liquity/contracts/core/SortedTroves.sol:148-0`
**Contract:** `SortedTroves`
**Function:** `getNext`

**Description:**
Override `getNext` is missing safety modifier(s) onlyauthorized present on `insert`.

**Code:**
```solidity
function getNext(uint256 _id) external view override returns (uint256) {
        return nodes[_id].nextId;
    }
```

**Recommendation:**
Ensure overridden functions retain all safety modifiers from the base implementation.  Review the inheritance chain carefully.

---

### 24. Missing Modifier in Override

**Detector:** `missing-modifier-in-override`
**Confidence:** MEDIUM
**Location:** `/Users/hik/Documents/GitHub/ctc/snowball/packages/contracts-liquity/contracts/core/SortedTroves.sol:152-0`
**Contract:** `SortedTroves`
**Function:** `getPrev`

**Description:**
Override `getPrev` is missing safety modifier(s) onlyauthorized present on `insert`.

**Code:**
```solidity
function getPrev(uint256 _id) external view override returns (uint256) {
        return nodes[_id].prevId;
    }
```

**Recommendation:**
Ensure overridden functions retain all safety modifiers from the base implementation.  Review the inheritance chain carefully.

---

### 25. Missing Modifier in Override

**Detector:** `missing-modifier-in-override`
**Confidence:** MEDIUM
**Location:** `/Users/hik/Documents/GitHub/ctc/snowball/packages/contracts-liquity/contracts/core/SortedTroves.sol:156-0`
**Contract:** `SortedTroves`
**Function:** `findInsertPosition`

**Description:**
Override `findInsertPosition` is missing safety modifier(s) onlyauthorized present on `insert`.

**Code:**
```solidity
function findInsertPosition(uint256 _annualInterestRate, uint256 _prevId, uint256 _nextId) external view override returns (uint256, uint256) {
        return _findInsertPosition(_annualInterestRate, _
```

**Recommendation:**
Ensure overridden functions retain all safety modifiers from the base implementation.  Review the inheritance chain carefully.

---

### 26. ERC4626 Share Inflation Attack

**Detector:** `erc4626-inflation`
**Confidence:** MEDIUM
**Location:** `/Users/hik/Documents/GitHub/ctc/snowball/packages/contracts-liquity/contracts/core/TroveNFT.sol:7-10`
**Contract:** `TroveNFT`

**Description:**
ERC4626 vault TroveNFT lacks share inflation protection. No virtual shares/assets offset, dead shares, or minimum deposit found. First depositor can steal funds from subsequent depositors.

**Code:**
```solidity
  7 | contract TroveNFT is ERC721Enumerable {
  8 |     address public troveManager;
  9 |     address public borrowerOperations;
  10 |     uint256 private _nextTokenId;
  11 | 
  12 |     modifier onlyAuthorized() {
```

**Recommendation:**
Implement virtual shares and virtual assets (OpenZeppelin ERC4626 default). Use a minimum deposit amount. Add dead shares on first deposit. Override _decimalsOffset() to return a non-zero value.

**Related Real-World Incidents:**
- Appears in nearly every ERC4626 Sherlock/C4 audit
- Multiple vault protocols exploited via inflation attack

---

## [MEDIUM] Medium Severity Findings

### 27. Unbounded Loop Over Dynamic Data

**Detector:** `unbounded-loop`
**Confidence:** MEDIUM
**SWC:** [SWC-128](https://swcregistry.io/docs/SWC-128)
**Location:** `/Users/hik/Documents/GitHub/ctc/snowball/packages/contracts-liquity/contracts/core/AgentVault.sol:171-174`
**Contract:** `AgentVault`
**Function:** `_containsAddress`

**Description:**
Unbounded loop over 'list' in AgentVault._containsAddress(). If this array grows large, the function will exceed the block gas limit.

**Code:**
```solidity
  171 |         for (uint256 i = 0; i < list.length; i++) {
  172 |             if (list[i] == item) return true;
  173 |         }
  174 |         return false;
  175 |     }
  176 | 
```

**Recommendation:**
Implement pagination or batch processing. Set a maximum iteration count. Use the pull-over-push pattern for distributions.

**Related Real-World Incidents:**
- GovernMental (2016) - Contract frozen due to unbounded loop
- Akutars (2022) - $34M locked (DoS in refund loop)

---

### 28. Unbounded Loop Over Dynamic Data

**Detector:** `unbounded-loop`
**Confidence:** MEDIUM
**SWC:** [SWC-128](https://swcregistry.io/docs/SWC-128)
**Location:** `/Users/hik/Documents/GitHub/ctc/snowball/packages/contracts-liquity/contracts/core/AgentVault.sol:178-181`
**Contract:** `AgentVault`
**Function:** `_containsSelector`

**Description:**
Unbounded loop over 'list' in AgentVault._containsSelector(). If this array grows large, the function will exceed the block gas limit.

**Code:**
```solidity
  178 |         for (uint256 i = 0; i < list.length; i++) {
  179 |             if (list[i] == item) return true;
  180 |         }
  181 |         return false;
  182 |     }
  183 | }
```

**Recommendation:**
Implement pagination or batch processing. Set a maximum iteration count. Use the pull-over-push pattern for distributions.

**Related Real-World Incidents:**
- GovernMental (2016) - Contract frozen due to unbounded loop
- Akutars (2022) - $34M locked (DoS in refund loop)

---

### 29. Unbounded Loop Over Dynamic Data

**Detector:** `unbounded-loop`
**Confidence:** MEDIUM
**SWC:** [SWC-128](https://swcregistry.io/docs/SWC-128)
**Location:** `/Users/hik/Documents/GitHub/ctc/snowball/packages/contracts-liquity/contracts/core/TroveManager.sol:280-283`
**Contract:** `TroveManager`
**Function:** `batchLiquidateTroves`

**Description:**
Unbounded loop over '_troveIds' in TroveManager.batchLiquidateTroves(). If this array grows large, the function will exceed the block gas limit.

**Code:**
```solidity
  280 |         for (uint256 i = 0; i < _troveIds.length; i++) {
  281 |             Trove storage trove = troves[_troveIds[i]];
  282 |             if (trove.status != Status.active) continue;
  283 | 
  284 |             (uint256 price, ) = priceFeed.fetchPrice();
  285 |             uint256 icr = _computeICR(trove.coll, trove.debt, price);
```

**Recommendation:**
Implement pagination or batch processing. Set a maximum iteration count. Use the pull-over-push pattern for distributions.

**Related Real-World Incidents:**
- GovernMental (2016) - Contract frozen due to unbounded loop
- Akutars (2022) - $34M locked (DoS in refund loop)

---

### 30. Tainted Arithmetic

**Detector:** `tainted-arithmetic`
**Confidence:** LOW
**SWC:** [SWC-101](https://swcregistry.io/docs/SWC-101)
**Location:** `/Users/hik/Documents/GitHub/ctc/snowball/packages/contracts-liquity/contracts/core/ActivePool.sol:69`
**Contract:** `ActivePool`
**Function:** `receiveColl`

**Description:**
User input (collBalance) is used in arithmetic without validation.

**Code:**
```solidity
Tainted variable: collBalance
```

**Recommendation:**
Validate user inputs with require() before using them in arithmetic. Consider SafeMath or Solidity ≥0.8 checked arithmetic.

---

### 31. Tainted Arithmetic

**Detector:** `tainted-arithmetic`
**Confidence:** LOW
**SWC:** [SWC-101](https://swcregistry.io/docs/SWC-101)
**Location:** `/Users/hik/Documents/GitHub/ctc/snowball/packages/contracts-liquity/contracts/core/ActivePool.sol:74`
**Contract:** `ActivePool`
**Function:** `increaseCollBalance`

**Description:**
User input (collBalance) is used in arithmetic without validation.

**Code:**
```solidity
Tainted variable: collBalance
```

**Recommendation:**
Validate user inputs with require() before using them in arithmetic. Consider SafeMath or Solidity ≥0.8 checked arithmetic.

---

### 32. Tainted Arithmetic

**Detector:** `tainted-arithmetic`
**Confidence:** LOW
**SWC:** [SWC-101](https://swcregistry.io/docs/SWC-101)
**Location:** `/Users/hik/Documents/GitHub/ctc/snowball/packages/contracts-liquity/contracts/core/ActivePool.sol:78`
**Contract:** `ActivePool`
**Function:** `sendColl`

**Description:**
User input (collBalance) is used in arithmetic without validation.

**Code:**
```solidity
Tainted variable: collBalance
```

**Recommendation:**
Validate user inputs with require() before using them in arithmetic. Consider SafeMath or Solidity ≥0.8 checked arithmetic.

---

### 33. Tainted Arithmetic

**Detector:** `tainted-arithmetic`
**Confidence:** LOW
**SWC:** [SWC-101](https://swcregistry.io/docs/SWC-101)
**Location:** `/Users/hik/Documents/GitHub/ctc/snowball/packages/contracts-liquity/contracts/core/ActivePool.sol:83`
**Contract:** `ActivePool`
**Function:** `increaseBoldDebt`

**Description:**
User input (boldDebt) is used in arithmetic without validation.

**Code:**
```solidity
Tainted variable: boldDebt
```

**Recommendation:**
Validate user inputs with require() before using them in arithmetic. Consider SafeMath or Solidity ≥0.8 checked arithmetic.

---

### 34. Tainted Arithmetic

**Detector:** `tainted-arithmetic`
**Confidence:** LOW
**SWC:** [SWC-101](https://swcregistry.io/docs/SWC-101)
**Location:** `/Users/hik/Documents/GitHub/ctc/snowball/packages/contracts-liquity/contracts/core/ActivePool.sol:87`
**Contract:** `ActivePool`
**Function:** `decreaseBoldDebt`

**Description:**
User input (boldDebt) is used in arithmetic without validation.

**Code:**
```solidity
Tainted variable: boldDebt
```

**Recommendation:**
Validate user inputs with require() before using them in arithmetic. Consider SafeMath or Solidity ≥0.8 checked arithmetic.

---

### 35. Tainted Arithmetic

**Detector:** `tainted-arithmetic`
**Confidence:** LOW
**SWC:** [SWC-101](https://swcregistry.io/docs/SWC-101)
**Location:** `/Users/hik/Documents/GitHub/ctc/snowball/packages/contracts-liquity/contracts/core/ActivePool.sol:91`
**Contract:** `ActivePool`
**Function:** `increaseAggWeightedDebtSum`

**Description:**
User input (_aggWeightedDebtSum) is used in arithmetic without validation.

**Code:**
```solidity
Tainted variable: _aggWeightedDebtSum
```

**Recommendation:**
Validate user inputs with require() before using them in arithmetic. Consider SafeMath or Solidity ≥0.8 checked arithmetic.

---

### 36. Tainted Arithmetic

**Detector:** `tainted-arithmetic`
**Confidence:** LOW
**SWC:** [SWC-101](https://swcregistry.io/docs/SWC-101)
**Location:** `/Users/hik/Documents/GitHub/ctc/snowball/packages/contracts-liquity/contracts/core/ActivePool.sol:95`
**Contract:** `ActivePool`
**Function:** `decreaseAggWeightedDebtSum`

**Description:**
User input (_aggWeightedDebtSum) is used in arithmetic without validation.

**Code:**
```solidity
Tainted variable: _aggWeightedDebtSum
```

**Recommendation:**
Validate user inputs with require() before using them in arithmetic. Consider SafeMath or Solidity ≥0.8 checked arithmetic.

---

### 37. Tainted Arithmetic

**Detector:** `tainted-arithmetic`
**Confidence:** LOW
**SWC:** [SWC-101](https://swcregistry.io/docs/SWC-101)
**Location:** `/Users/hik/Documents/GitHub/ctc/snowball/packages/contracts-liquity/contracts/core/AgentVault.sol:170`
**Contract:** `AgentVault`
**Function:** `_containsAddress`

**Description:**
User input (item) is used in arithmetic without validation.

**Code:**
```solidity
Tainted variable: item
```

**Recommendation:**
Validate user inputs with require() before using them in arithmetic. Consider SafeMath or Solidity ≥0.8 checked arithmetic.

---

### 38. Tainted Arithmetic

**Detector:** `tainted-arithmetic`
**Confidence:** LOW
**SWC:** [SWC-101](https://swcregistry.io/docs/SWC-101)
**Location:** `/Users/hik/Documents/GitHub/ctc/snowball/packages/contracts-liquity/contracts/core/AgentVault.sol:177`
**Contract:** `AgentVault`
**Function:** `_containsSelector`

**Description:**
User input (item) is used in arithmetic without validation.

**Code:**
```solidity
Tainted variable: item
```

**Recommendation:**
Validate user inputs with require() before using them in arithmetic. Consider SafeMath or Solidity ≥0.8 checked arithmetic.

---

### 39. Tainted Arithmetic

**Detector:** `tainted-arithmetic`
**Confidence:** LOW
**SWC:** [SWC-101](https://swcregistry.io/docs/SWC-101)
**Location:** `/Users/hik/Documents/GitHub/ctc/snowball/packages/contracts-liquity/contracts/core/BorrowerOperations.sol:226`
**Contract:** `BorrowerOperations`
**Function:** `_applyTroveInterest`

**Description:**
User input (timeDelta) is used in arithmetic without validation.

**Code:**
```solidity
Tainted variable: timeDelta
```

**Recommendation:**
Validate user inputs with require() before using them in arithmetic. Consider SafeMath or Solidity ≥0.8 checked arithmetic.

---

### 40. Tainted Arithmetic

**Detector:** `tainted-arithmetic`
**Confidence:** LOW
**SWC:** [SWC-101](https://swcregistry.io/docs/SWC-101)
**Location:** `/Users/hik/Documents/GitHub/ctc/snowball/packages/contracts-liquity/contracts/core/BorrowerOperations.sol:270`
**Contract:** `BorrowerOperations`
**Function:** `_adjustTroveInternal`

**Description:**
User input (newDebt) is used in arithmetic without validation.

**Code:**
```solidity
Tainted variable: newDebt
```

**Recommendation:**
Validate user inputs with require() before using them in arithmetic. Consider SafeMath or Solidity ≥0.8 checked arithmetic.

---

### 41. Tainted Arithmetic

**Detector:** `tainted-arithmetic`
**Confidence:** LOW
**SWC:** [SWC-101](https://swcregistry.io/docs/SWC-101)
**Location:** `/Users/hik/Documents/GitHub/ctc/snowball/packages/contracts-liquity/contracts/core/BorrowerOperations.sol:285`
**Contract:** `BorrowerOperations`
**Function:** `_calcUpfrontFee`

**Description:**
User input (_debtAmount) is used in arithmetic without validation.

**Code:**
```solidity
Tainted variable: _debtAmount
```

**Recommendation:**
Validate user inputs with require() before using them in arithmetic. Consider SafeMath or Solidity ≥0.8 checked arithmetic.

---

### 42. State Inconsistency

**Detector:** `state-inconsistency`
**Confidence:** LOW
**Location:** `/Users/hik/Documents/GitHub/ctc/snowball/packages/contracts-liquity/contracts/core/BorrowerOperations.sol:59-0`
**Contract:** `BorrowerOperations`
**Function:** `setAddressesRegistry`

**Description:**
Function `setAddressesRegistry` updates priceFeed but not correlated variable(s) lastUpdate.

**Code:**
```solidity
Updates {'priceFeed'} but not {'lastUpdate'}
```

**Recommendation:**
Ensure correlated state variables are always updated atomically within the same function or use a single struct to group them.

---

### 43. State Inconsistency

**Detector:** `state-inconsistency`
**Confidence:** LOW
**Location:** `/Users/hik/Documents/GitHub/ctc/snowball/packages/contracts-liquity/contracts/core/BorrowerOperations.sol:226-0`
**Contract:** `BorrowerOperations`
**Function:** `_applyTroveInterest`

**Description:**
Function `_applyTroveInterest` updates lastUpdate but not correlated variable(s) priceFeed.

**Code:**
```solidity
Updates {'lastUpdate'} but not {'priceFeed'}
```

**Recommendation:**
Ensure correlated state variables are always updated atomically within the same function or use a single struct to group them.

---

### 44. Tainted Arithmetic

**Detector:** `tainted-arithmetic`
**Confidence:** LOW
**SWC:** [SWC-101](https://swcregistry.io/docs/SWC-101)
**Location:** `/Users/hik/Documents/GitHub/ctc/snowball/packages/contracts-liquity/contracts/core/CollSurplusPool.sol:42`
**Contract:** `CollSurplusPool`
**Function:** `accountSurplus`

**Description:**
User input (balances) is used in arithmetic without validation.

**Code:**
```solidity
Tainted variable: balances
```

**Recommendation:**
Validate user inputs with require() before using them in arithmetic. Consider SafeMath or Solidity ≥0.8 checked arithmetic.

---

### 45. Tainted Arithmetic

**Detector:** `tainted-arithmetic`
**Confidence:** LOW
**SWC:** [SWC-101](https://swcregistry.io/docs/SWC-101)
**Location:** `/Users/hik/Documents/GitHub/ctc/snowball/packages/contracts-liquity/contracts/core/CollateralRegistry.sol:38`
**Contract:** `CollateralRegistry`
**Function:** `addBranch`

**Description:**
User input (_token) is used in arithmetic without validation.

**Code:**
```solidity
Tainted variable: _token
```

**Recommendation:**
Validate user inputs with require() before using them in arithmetic. Consider SafeMath or Solidity ≥0.8 checked arithmetic.

---

### 46. Tainted Arithmetic

**Detector:** `tainted-arithmetic`
**Confidence:** LOW
**SWC:** [SWC-101](https://swcregistry.io/docs/SWC-101)
**Location:** `/Users/hik/Documents/GitHub/ctc/snowball/packages/contracts-liquity/contracts/core/DefaultPool.sol:47`
**Contract:** `DefaultPool`
**Function:** `increaseBoldDebt`

**Description:**
User input (boldDebt) is used in arithmetic without validation.

**Code:**
```solidity
Tainted variable: boldDebt
```

**Recommendation:**
Validate user inputs with require() before using them in arithmetic. Consider SafeMath or Solidity ≥0.8 checked arithmetic.

---

### 47. Tainted Arithmetic

**Detector:** `tainted-arithmetic`
**Confidence:** LOW
**SWC:** [SWC-101](https://swcregistry.io/docs/SWC-101)
**Location:** `/Users/hik/Documents/GitHub/ctc/snowball/packages/contracts-liquity/contracts/core/DefaultPool.sol:51`
**Contract:** `DefaultPool`
**Function:** `decreaseBoldDebt`

**Description:**
User input (boldDebt) is used in arithmetic without validation.

**Code:**
```solidity
Tainted variable: boldDebt
```

**Recommendation:**
Validate user inputs with require() before using them in arithmetic. Consider SafeMath or Solidity ≥0.8 checked arithmetic.

---

### 48. Tainted Arithmetic

**Detector:** `tainted-arithmetic`
**Confidence:** LOW
**SWC:** [SWC-101](https://swcregistry.io/docs/SWC-101)
**Location:** `/Users/hik/Documents/GitHub/ctc/snowball/packages/contracts-liquity/contracts/core/DefaultPool.sol:55`
**Contract:** `DefaultPool`
**Function:** `sendCollToActivePool`

**Description:**
User input (collBalance) is used in arithmetic without validation.

**Code:**
```solidity
Tainted variable: collBalance
```

**Recommendation:**
Validate user inputs with require() before using them in arithmetic. Consider SafeMath or Solidity ≥0.8 checked arithmetic.

---

### 49. Tainted Arithmetic

**Detector:** `tainted-arithmetic`
**Confidence:** LOW
**SWC:** [SWC-101](https://swcregistry.io/docs/SWC-101)
**Location:** `/Users/hik/Documents/GitHub/ctc/snowball/packages/contracts-liquity/contracts/core/HintHelpers.sol:28`
**Contract:** `HintHelpers`
**Function:** `getApproxHint`

**Description:**
User input (i) is used in arithmetic without validation.

**Code:**
```solidity
Tainted variable: i
```

**Recommendation:**
Validate user inputs with require() before using them in arithmetic. Consider SafeMath or Solidity ≥0.8 checked arithmetic.

---

### 50. Tainted Arithmetic

**Detector:** `tainted-arithmetic`
**Confidence:** LOW
**SWC:** [SWC-101](https://swcregistry.io/docs/SWC-101)
**Location:** `/Users/hik/Documents/GitHub/ctc/snowball/packages/contracts-liquity/contracts/core/HintHelpers.sol:46`
**Contract:** `HintHelpers`
**Function:** `_absDiff`

**Description:**
User input (a) is used in arithmetic without validation.

**Code:**
```solidity
Tainted variable: a
```

**Recommendation:**
Validate user inputs with require() before using them in arithmetic. Consider SafeMath or Solidity ≥0.8 checked arithmetic.

---

### 51. Tainted Arithmetic

**Detector:** `tainted-arithmetic`
**Confidence:** LOW
**SWC:** [SWC-101](https://swcregistry.io/docs/SWC-101)
**Location:** `/Users/hik/Documents/GitHub/ctc/snowball/packages/contracts-liquity/contracts/core/MultiTroveGetter.sol:32`
**Contract:** `MultiTroveGetter`
**Function:** `getMultipleSortedTroves`

**Description:**
User input (startIdx) is used in arithmetic without validation.

**Code:**
```solidity
Tainted variable: startIdx
```

**Recommendation:**
Validate user inputs with require() before using them in arithmetic. Consider SafeMath or Solidity ≥0.8 checked arithmetic.

---

### 52. Tainted Arithmetic

**Detector:** `tainted-arithmetic`
**Confidence:** LOW
**SWC:** [SWC-101](https://swcregistry.io/docs/SWC-101)
**Location:** `/Users/hik/Documents/GitHub/ctc/snowball/packages/contracts-liquity/contracts/core/StabilityPool.sol:145`
**Contract:** `StabilityPool`
**Function:** `offset`

**Description:**
User input (i) is used in arithmetic without validation.

**Code:**
```solidity
Tainted variable: i
```

**Recommendation:**
Validate user inputs with require() before using them in arithmetic. Consider SafeMath or Solidity ≥0.8 checked arithmetic.

---

### 53. Tainted Arithmetic

**Detector:** `tainted-arithmetic`
**Confidence:** LOW
**SWC:** [SWC-101](https://swcregistry.io/docs/SWC-101)
**Location:** `/Users/hik/Documents/GitHub/ctc/snowball/packages/contracts-liquity/contracts/core/TroveManager.sol:279`
**Contract:** `TroveManager`
**Function:** `batchLiquidateTroves`

**Description:**
User input (_troveIds) is used in arithmetic without validation.

**Code:**
```solidity
Tainted variable: _troveIds
```

**Recommendation:**
Validate user inputs with require() before using them in arithmetic. Consider SafeMath or Solidity ≥0.8 checked arithmetic.

---

### 54. Tainted Arithmetic

**Detector:** `tainted-arithmetic`
**Confidence:** LOW
**SWC:** [SWC-101](https://swcregistry.io/docs/SWC-101)
**Location:** `/Users/hik/Documents/GitHub/ctc/snowball/packages/contracts-liquity/contracts/core/TroveManager.sol:393`
**Contract:** `TroveManager`
**Function:** `_computeICR`

**Description:**
User input (_price) is used in arithmetic without validation.

**Code:**
```solidity
Tainted variable: _price
```

**Recommendation:**
Validate user inputs with require() before using them in arithmetic. Consider SafeMath or Solidity ≥0.8 checked arithmetic.

---

## Detector Coverage

| Detector | Findings |
|----------|----------|
| Reentrancy via ETH Transfer (`reentrancy-eth`) | 0 |
| Read-Only Reentrancy Risk (`reentrancy-read-only`) | 0 |
| Cross-Function Reentrancy (`reentrancy-cross-function`) | 0 |
| Transient Storage Reentrancy Risk (`transient-storage-reentrancy`) | 0 |
| Unprotected Sensitive Function (`unprotected-sensitive`) | 1 |
| tx.origin Used for Authentication (`tx-origin-auth`) | 0 |
| Missing Bridge Message Source Validation (`bridge-message-validation`) | 0 |
| Cross-Chain Replay Risk (`cross-chain-replay`) | 0 |
| Tainted External Call Target (`tainted-call-target`) | 1 |
| Tainted Delegatecall Target (`tainted-delegatecall-target`) | 0 |
| Cross-Contract Reentrancy (`cross-contract-reentrancy`) | 0 |
| Delegatecall to User-Controlled Address (`dangerous-delegatecall`) | 0 |
| Potentially Uninitialized Proxy (`uninitialized-proxy`) | 0 |
| Potential Storage Collision (`storage-collision`) | 0 |
| Unchecked Arithmetic Operation (`unchecked-math`) | 0 |
| Unsafe Integer Downcast (`unsafe-downcast`) | 0 |
| AMM Spot Price Used as Oracle (`spot-price-oracle`) | 0 |
| Stale Oracle Data (`stale-oracle`) | 0 |
| Unvalidated Oracle Data (`unvalidated-oracle-data`) | 0 |
| Unprotected Flash Loan Callback (`flash-loan-callback`) | 0 |
| Balance-Dependent Logic (`balance-dependency`) | 0 |
| ERC4626 Share Inflation Attack (`erc4626-inflation`) | 3 |
| Missing Reward Checkpoint Before State Change (`missing-reward-checkpoint`) | 0 |
| Governance Flash Loan Attack Risk (`governance-flashloan`) | 0 |
| Centralization Risk - Privileged Functions (`centralization-risk`) | 0 |
| Unprotected Inherited Function (`unprotected-inherited-function`) | 0 |
| Missing Modifier in Override (`missing-modifier-in-override`) | 21 |
| Unchecked Return Value in Critical Path (`unchecked-return-critical-path`) | 0 |
| Unchecked External Call Return Value (`unchecked-return`) | 0 |
| Selfdestruct Usage (`selfdestruct`) | 0 |
| Weak Randomness Source (`weak-randomness`) | 0 |
| msg.value Used in Loop (`msg-value-loop`) | 0 |
| Potential Signature Replay (`signature-replay`) | 0 |
| Tainted Arithmetic (`tainted-arithmetic`) | 23 |
| State Inconsistency (`state-inconsistency`) | 2 |
| Division Before Multiplication (`divide-before-multiply`) | 0 |
| Potential Rounding Direction Error (`rounding-direction`) | 0 |
| Fee Calculation Precision Loss (`fee-precision-loss`) | 0 |
| Division Result Can Round to Zero (`rounding-to-zero`) | 0 |
| Missing Slippage Protection (`missing-slippage`) | 0 |
| ERC-20 Approval Vulnerability (`approval-vuln`) | 0 |
| Fee-on-Transfer Token Incompatibility (`fee-on-transfer`) | 0 |
| Self-Transfer Balance Manipulation (`self-transfer`) | 0 |
| Token Decimal Mismatch Risk (`decimal-mismatch`) | 0 |
| Unbounded Loop Over Dynamic Data (`unbounded-loop`) | 3 |
| External Call in Loop (`external-call-loop`) | 0 |
| Locked Ether (`locked-ether`) | 0 |
| Missing Timelock on Critical Operation (`missing-timelock`) | 0 |
| Potentially Unsafe Assembly (`unsafe-assembly`) | 0 |
| Missing Zero-Address Validation (`missing-zero-check`) | 0 |
| Floating Pragma Version (`floating-pragma`) | 0 |
| Deprecated Solidity Function Usage (`deprecated-functions`) | 0 |

## Analysis Errors

- `/Users/hik/Documents/GitHub/ctc/snowball/packages/contracts-liquity/contracts/core/AddressesRegistry.sol:unchecked-return`: look-behind requires fixed-width pattern
- `/Users/hik/Documents/GitHub/ctc/snowball/packages/contracts-liquity/contracts/core/CollateralRegistry.sol:unchecked-return`: look-behind requires fixed-width pattern
- `/Users/hik/Documents/GitHub/ctc/snowball/packages/contracts-liquity/contracts/core/HintHelpers.sol:unchecked-return`: look-behind requires fixed-width pattern
- `/Users/hik/Documents/GitHub/ctc/snowball/packages/contracts-liquity/contracts/core/MultiTroveGetter.sol:unchecked-return`: look-behind requires fixed-width pattern
- `/Users/hik/Documents/GitHub/ctc/snowball/packages/contracts-liquity/contracts/core/SbUSDToken.sol:unchecked-return`: look-behind requires fixed-width pattern
- `/Users/hik/Documents/GitHub/ctc/snowball/packages/contracts-liquity/contracts/core/SortedTroves.sol:unchecked-return`: look-behind requires fixed-width pattern
- `/Users/hik/Documents/GitHub/ctc/snowball/packages/contracts-liquity/contracts/core/TroveNFT.sol:unchecked-return`: look-behind requires fixed-width pattern

---
*Generated by SC Audit Agent v1.0 - Based on analysis of 314+ real-world incidents (2010-2026)*