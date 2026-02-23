// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../interfaces/IBorrowerOperations.sol";
import "../interfaces/IAddressesRegistry.sol";
import "../interfaces/ISbUSDToken.sol";
import "../interfaces/ITroveManager.sol";
import "../interfaces/IPriceFeed.sol";
import "../interfaces/IActivePool.sol";
import "../interfaces/IStabilityPool.sol";
import "../interfaces/ISortedTroves.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

interface ITroveNFT {
    function mint(address _owner, uint256 _troveId) external;
    function burn(uint256 _troveId) external;
    function ownerOf(uint256 _troveId) external view returns (address);
}

interface ICollSurplusPool {
    function claimColl(address _account) external;
}

/// @title BorrowerOperations — User-facing entry point for trove operations (Liquity V2 fork)
contract BorrowerOperations is IBorrowerOperations {
    using SafeERC20 for IERC20;

    uint256 public constant DECIMAL_PRECISION = 1e18;
    uint256 public constant MIN_ANNUAL_INTEREST_RATE = 5e15; // 0.5%
    uint256 public constant MAX_ANNUAL_INTEREST_RATE = 25e16; // 25%
    uint256 public constant UPFRONT_FEE_PERIOD = 7 days;

    IAddressesRegistry public addressesRegistry;
    ITroveManager public troveManager;
    ISbUSDToken public sbUSDToken;
    IPriceFeed public priceFeed;
    IActivePool public activePool;
    IStabilityPool public stabilityPool;
    ISortedTroves public sortedTroves;
    IERC20 public collToken;
    ITroveNFT public troveNFT;
    address public collateralRegistry;
    address public gasPool;
    address public collSurplusPool;

    uint256 public MCR;
    uint256 public CCR;

    uint256 private _troveIdCounter;

    bool public isInitialized;

    modifier onlyTroveOwner(uint256 _troveId) {
        require(troveNFT.ownerOf(_troveId) == msg.sender, "BorrowerOps: not owner");
        _;
    }

    function setAddressesRegistry(address _addressesRegistry) external override {
        require(!isInitialized, "Already initialized");
        isInitialized = true;

        addressesRegistry = IAddressesRegistry(_addressesRegistry);
        troveManager = ITroveManager(addressesRegistry.troveManager());
        sbUSDToken = ISbUSDToken(addressesRegistry.sbUSDToken());
        priceFeed = IPriceFeed(addressesRegistry.priceFeed());
        activePool = IActivePool(addressesRegistry.activePool());
        stabilityPool = IStabilityPool(addressesRegistry.stabilityPool());
        sortedTroves = ISortedTroves(addressesRegistry.sortedTroves());
        collToken = IERC20(addressesRegistry.collToken());
        troveNFT = ITroveNFT(addressesRegistry.troveNFT());
        gasPool = addressesRegistry.gasPool();
        collSurplusPool = addressesRegistry.collSurplusPool();
        MCR = addressesRegistry.MCR();
        CCR = addressesRegistry.CCR();
    }

    function setCollateralRegistry(address _collateralRegistry) external override {
        require(collateralRegistry == address(0), "Already set");
        collateralRegistry = _collateralRegistry;
    }

    function openTrove(
        address _owner,
        uint256 _ownerIndex,
        uint256 _collAmount,
        uint256 _boldAmount,
        uint256 _upperHint,
        uint256 _lowerHint,
        uint256 _annualInterestRate,
        uint256 _maxUpfrontFee
    ) external override returns (uint256 troveId) {
        require(_annualInterestRate >= MIN_ANNUAL_INTEREST_RATE, "Interest rate too low");
        require(_annualInterestRate <= MAX_ANNUAL_INTEREST_RATE, "Interest rate too high");

        // Generate trove ID
        _troveIdCounter++;
        troveId = _troveIdCounter;

        // Check collateral ratio
        (uint256 price, ) = priceFeed.fetchPrice();
        uint256 icr = (_collAmount * price) / _boldAmount;
        require(icr >= MCR, "ICR below MCR");

        // Calculate upfront fee
        uint256 upfrontFee = _calcUpfrontFee(_boldAmount, _annualInterestRate);
        require(upfrontFee <= _maxUpfrontFee, "Upfront fee exceeds max");
        uint256 totalDebt = _boldAmount + upfrontFee;

        // Transfer collateral from user to ActivePool
        collToken.safeTransferFrom(msg.sender, address(activePool), _collAmount);
        activePool.increaseCollBalance(_collAmount);

        // Open trove in TroveManager
        troveManager.openTrove(_owner, troveId, _collAmount, totalDebt, _annualInterestRate);

        // Mint trove NFT
        troveNFT.mint(_owner, troveId);

        // Update active pool debt
        activePool.increaseBoldDebt(totalDebt);

        // Mint sbUSD to borrower
        sbUSDToken.mint(_owner, _boldAmount);

        // Distribute upfront fee to Stability Pool as yield (instead of gas pool)
        if (upfrontFee > 0) {
            sbUSDToken.mint(gasPool, upfrontFee);
            stabilityPool.triggerBoldRewards(upfrontFee);
        }

        // Insert into sorted troves
        sortedTroves.insert(troveId, _annualInterestRate, _upperHint, _lowerHint);
    }

    function closeTrove(uint256 _troveId) external override onlyTroveOwner(_troveId) {
        // Apply accrued interest before closing
        _applyTroveInterest(_troveId);

        uint256 debt = troveManager.getTroveDebt(_troveId);
        uint256 coll = troveManager.getTroveColl(_troveId);

        // Burn debt sbUSD from user
        sbUSDToken.burn(msg.sender, debt);

        // Close trove
        troveManager.closeTrove(_troveId);

        // Return collateral
        activePool.sendColl(msg.sender, coll);
        activePool.decreaseBoldDebt(debt);

        // Remove from sorted list
        sortedTroves.remove(_troveId);

        // Burn NFT
        troveNFT.burn(_troveId);
    }

    function adjustTrove(
        uint256 _troveId,
        uint256 _collChange,
        bool _isCollIncrease,
        uint256 _boldChange,
        bool _isDebtIncrease,
        uint256 _upperHint,
        uint256 _lowerHint,
        uint256 _maxUpfrontFee
    ) external override onlyTroveOwner(_troveId) {
        _adjustTroveInternal(_troveId, _collChange, _isCollIncrease, _boldChange, _isDebtIncrease);
    }

    function addColl(uint256 _troveId, uint256 _collAmount) external override onlyTroveOwner(_troveId) {
        _adjustTroveInternal(_troveId, _collAmount, true, 0, false);
    }

    function withdrawColl(uint256 _troveId, uint256 _collAmount) external override onlyTroveOwner(_troveId) {
        _adjustTroveInternal(_troveId, _collAmount, false, 0, false);
    }

    function withdrawBold(uint256 _troveId, uint256 _boldAmount, uint256 _maxUpfrontFee) external override onlyTroveOwner(_troveId) {
        _adjustTroveInternal(_troveId, 0, false, _boldAmount, true);
    }

    function repayBold(uint256 _troveId, uint256 _boldAmount) external override onlyTroveOwner(_troveId) {
        _adjustTroveInternal(_troveId, 0, false, _boldAmount, false);
    }

    function adjustTroveInterestRate(
        uint256 _troveId,
        uint256 _newAnnualInterestRate,
        uint256 _upperHint,
        uint256 _lowerHint,
        uint256 _maxUpfrontFee
    ) external override onlyTroveOwner(_troveId) {
        require(_newAnnualInterestRate >= MIN_ANNUAL_INTEREST_RATE, "Interest rate too low");
        require(_newAnnualInterestRate <= MAX_ANNUAL_INTEREST_RATE, "Interest rate too high");

        // Apply accrued interest at old rate before changing
        _applyTroveInterest(_troveId);

        uint256 currentDebt = troveManager.getTroveDebt(_troveId);
        uint256 upfrontFee = _calcUpfrontFee(currentDebt, _newAnnualInterestRate);
        require(upfrontFee <= _maxUpfrontFee, "Upfront fee exceeds max");

        // Update interest rate in TroveManager
        troveManager.adjustTroveInterestRate(_troveId, _newAnnualInterestRate);

        // Re-insert into sorted list at new position
        sortedTroves.reInsert(_troveId, _newAnnualInterestRate, _upperHint, _lowerHint);

        // Distribute upfront fee to Stability Pool
        if (upfrontFee > 0) {
            sbUSDToken.mint(gasPool, upfrontFee);
            activePool.increaseBoldDebt(upfrontFee);
            troveManager.adjustTrove(_troveId, 0, false, upfrontFee, true);
            stabilityPool.triggerBoldRewards(upfrontFee);
        }
    }

    function claimCollateral() external override {
        ICollSurplusPool(collSurplusPool).claimColl(msg.sender);
    }

    /// @dev Calculates and applies accrued interest to a trove, distributing yield to the Stability Pool
    function _applyTroveInterest(uint256 _troveId) internal {
        uint256 lastUpdate = troveManager.getTroveLastDebtUpdateTime(_troveId);
        uint256 timeDelta = block.timestamp - lastUpdate;
        if (timeDelta == 0) return;

        uint256 debt = troveManager.getTroveDebt(_troveId);
        uint256 rate = troveManager.getTroveAnnualInterestRate(_troveId);

        // accrued = debt * rate * timeDelta / (365 days)
        uint256 accrued = (debt * rate * timeDelta) / (365 days * DECIMAL_PRECISION);
        if (accrued == 0) return;

        // Add interest to trove debt
        troveManager.adjustTrove(_troveId, 0, false, accrued, true);
        activePool.increaseBoldDebt(accrued);

        // Distribute accrued interest to Stability Pool depositors
        stabilityPool.triggerBoldRewards(accrued);
    }

    function _adjustTroveInternal(
        uint256 _troveId,
        uint256 _collChange,
        bool _isCollIncrease,
        uint256 _boldChange,
        bool _isDebtIncrease
    ) internal {
        // Apply accrued interest before any adjustment
        _applyTroveInterest(_troveId);

        if (_isCollIncrease && _collChange > 0) {
            collToken.safeTransferFrom(msg.sender, address(activePool), _collChange);
            activePool.increaseCollBalance(_collChange);
        }

        troveManager.adjustTrove(_troveId, _collChange, _isCollIncrease, _boldChange, _isDebtIncrease);

        if (!_isCollIncrease && _collChange > 0) {
            activePool.sendColl(msg.sender, _collChange); // sendColl already decreases collBalance
        }

        if (_isDebtIncrease && _boldChange > 0) {
            activePool.increaseBoldDebt(_boldChange);
            sbUSDToken.mint(msg.sender, _boldChange);
        } else if (!_isDebtIncrease && _boldChange > 0) {
            sbUSDToken.burn(msg.sender, _boldChange);
            activePool.decreaseBoldDebt(_boldChange);
        }

        // Check resulting ICR
        (uint256 price, ) = priceFeed.fetchPrice();
        uint256 newColl = troveManager.getTroveColl(_troveId);
        uint256 newDebt = troveManager.getTroveDebt(_troveId);
        if (newDebt > 0) {
            uint256 newICR = (newColl * price) / newDebt;
            require(newICR >= MCR, "ICR below MCR");
        }
    }

    function _calcUpfrontFee(uint256 _debtAmount, uint256 _annualInterestRate) internal pure returns (uint256) {
        // 7-day upfront fee = debt * annualRate * 7/365
        return (_debtAmount * _annualInterestRate * UPFRONT_FEE_PERIOD) / (365 days * DECIMAL_PRECISION);
    }
}
