// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../interfaces/ITroveManager.sol";
import "../interfaces/IAddressesRegistry.sol";
import "../interfaces/ISbUSDToken.sol";
import "../interfaces/IPriceFeed.sol";
import "../interfaces/IStabilityPool.sol";
import "../interfaces/IActivePool.sol";
import "../interfaces/ISortedTroves.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

interface ITroveNFTOwner {
    function ownerOf(uint256 tokenId) external view returns (address);
}

interface ICollSurplusPool {
    function accountSurplus(address _account, uint256 _amount) external;
}

/// @title TroveManager — Core trove state + liquidation logic (Liquity V2 fork)
contract TroveManager is ITroveManager {
    using SafeERC20 for IERC20;

    uint256 public constant DECIMAL_PRECISION = 1e18;
    uint256 public constant _100PCT = 1e18;
    uint256 public constant MIN_DEBT = 200e18; // 200 sbUSD minimum

    // Addresses
    IAddressesRegistry public addressesRegistry;
    address public borrowerOperations;
    ISbUSDToken public sbUSDToken;
    IPriceFeed public priceFeed;
    IStabilityPool public stabilityPool;
    IActivePool public activePool;
    ISortedTroves public sortedTroves;
    address public collSurplusPool;
    address public defaultPool;
    IERC20 public collToken;
    address public troveNFT;

    uint256 public MCR;
    uint256 public CCR;

    // Trove data
    mapping(uint256 => Trove) public troves;
    uint256[] public troveIds;
    uint256 public troveIdsCount;

    // System totals
    uint256 public totalStakes;
    uint256 public totalStakesSnapshot;
    uint256 public totalCollateralSnapshot;
    uint256 public L_Coll;
    uint256 public L_BoldDebt;

    bool public isInitialized;

    event TroveOpened(uint256 indexed troveId, address indexed owner, uint256 coll, uint256 debt);
    event TroveClosed(uint256 indexed troveId);
    event TroveAdjusted(uint256 indexed troveId, uint256 coll, uint256 debt);
    event TroveLiquidated(uint256 indexed troveId, uint256 coll, uint256 debt);
    event TroveInterestRateAdjusted(uint256 indexed troveId, uint256 newRate);
    event TroveRedeemed(uint256 indexed troveId, uint256 collDrawn, uint256 debtRedeemed);
    event Redemption(uint256 boldRedeemed, uint256 totalCollDrawn);

    modifier onlyBorrowerOperations() {
        require(msg.sender == borrowerOperations, "TroveManager: not BorrowerOps");
        _;
    }

    function setAddressesRegistry(address _addressesRegistry) external override {
        require(!isInitialized, "Already initialized");
        isInitialized = true;

        addressesRegistry = IAddressesRegistry(_addressesRegistry);
        borrowerOperations = addressesRegistry.borrowerOperations();
        sbUSDToken = ISbUSDToken(addressesRegistry.sbUSDToken());
        priceFeed = IPriceFeed(addressesRegistry.priceFeed());
        stabilityPool = IStabilityPool(addressesRegistry.stabilityPool());
        activePool = IActivePool(addressesRegistry.activePool());
        sortedTroves = ISortedTroves(addressesRegistry.sortedTroves());
        collSurplusPool = addressesRegistry.collSurplusPool();
        defaultPool = addressesRegistry.defaultPool();
        collToken = IERC20(addressesRegistry.collToken());
        troveNFT = addressesRegistry.troveNFT();
        MCR = addressesRegistry.MCR();
        CCR = addressesRegistry.CCR();
    }

    // ==================== Trove Operations ====================

    function openTrove(
        address _owner,
        uint256 _troveId,
        uint256 _collAmount,
        uint256 _debtAmount,
        uint256 _annualInterestRate
    ) external override onlyBorrowerOperations {
        require(troves[_troveId].status == Status.nonExistent, "Trove exists");
        require(_debtAmount >= MIN_DEBT, "Debt below minimum");

        troves[_troveId] = Trove({
            debt: _debtAmount,
            coll: _collAmount,
            stake: _collAmount,
            status: Status.active,
            arrayIndex: uint64(troveIds.length),
            lastDebtUpdateTime: uint64(block.timestamp),
            lastInterestRateAdjTime: uint64(block.timestamp),
            annualInterestRate: _annualInterestRate
        });

        troveIds.push(_troveId);
        troveIdsCount++;
        totalStakes += _collAmount;

        emit TroveOpened(_troveId, _owner, _collAmount, _debtAmount);
    }

    function closeTrove(uint256 _troveId) external override onlyBorrowerOperations {
        require(troves[_troveId].status == Status.active, "Trove not active");

        totalStakes -= troves[_troveId].stake;

        troves[_troveId].status = Status.closedByOwner;
        troves[_troveId].coll = 0;
        troves[_troveId].debt = 0;
        troves[_troveId].stake = 0;

        troveIdsCount--;

        emit TroveClosed(_troveId);
    }

    function adjustTrove(
        uint256 _troveId,
        uint256 _collChange,
        bool _isCollIncrease,
        uint256 _debtChange,
        bool _isDebtIncrease
    ) external override onlyBorrowerOperations {
        Trove storage trove = troves[_troveId];
        require(trove.status == Status.active, "Trove not active");

        if (_isCollIncrease) {
            trove.coll += _collChange;
            totalStakes += _collChange;
        } else {
            trove.coll -= _collChange;
            totalStakes -= _collChange;
        }

        if (_isDebtIncrease) {
            trove.debt += _debtChange;
        } else {
            trove.debt -= _debtChange;
        }

        trove.stake = trove.coll;
        trove.lastDebtUpdateTime = uint64(block.timestamp);

        require(trove.debt >= MIN_DEBT || trove.debt == 0, "Debt below minimum");

        emit TroveAdjusted(_troveId, trove.coll, trove.debt);
    }

    function adjustTroveInterestRate(
        uint256 _troveId,
        uint256 _newAnnualInterestRate
    ) external override onlyBorrowerOperations {
        Trove storage trove = troves[_troveId];
        require(trove.status == Status.active, "Trove not active");

        trove.annualInterestRate = _newAnnualInterestRate;
        trove.lastInterestRateAdjTime = uint64(block.timestamp);

        emit TroveInterestRateAdjusted(_troveId, _newAnnualInterestRate);
    }

    function redeemCollateral(
        address _redeemer,
        uint256 _boldAmount,
        uint256 _price,
        uint256 _maxIterations
    ) external override returns (uint256 collDrawn) {
        require(_boldAmount > 0, "Amount must be > 0");

        uint256 remainingBold = _boldAmount;
        uint256 totalCollDrawn;
        uint256 iterations;

        uint256 currentTroveId = sortedTroves.getLast(); // lowest interest rate first

        while (currentTroveId != 0 && remainingBold > 0 && iterations < _maxIterations) {
            iterations++;
            uint256 nextTroveId = sortedTroves.getPrev(currentTroveId);

            Trove storage trove = troves[currentTroveId];
            if (trove.status != Status.active) {
                currentTroveId = nextTroveId;
                continue;
            }

            uint256 troveDebt = trove.debt;
            uint256 troveColl = trove.coll;

            uint256 debtToRedeem;
            if (remainingBold >= troveDebt) {
                // Full redemption of this trove
                debtToRedeem = troveDebt;
            } else if (troveDebt - remainingBold < MIN_DEBT) {
                // Would leave trove below MIN_DEBT, redeem entire trove
                debtToRedeem = troveDebt;
            } else {
                // Partial redemption
                debtToRedeem = remainingBold;
            }

            uint256 collToRedeem = (debtToRedeem * DECIMAL_PRECISION) / _price;
            if (collToRedeem > troveColl) {
                collToRedeem = troveColl;
            }

            if (debtToRedeem == troveDebt) {
                // Close trove by redemption
                // Record owner before closing (NFT not burned on redemption — owner claims surplus later)
                address troveOwner = ITroveNFTOwner(troveNFT).ownerOf(currentTroveId);

                totalStakes -= trove.stake;
                trove.status = Status.closedByRedemption;
                trove.coll = 0;
                trove.debt = 0;
                trove.stake = 0;
                troveIdsCount--;

                sortedTroves.remove(currentTroveId);

                // Send any surplus to CollSurplusPool and register it for the trove owner
                uint256 surplus = troveColl - collToRedeem;
                if (surplus > 0) {
                    ICollSurplusPool(collSurplusPool).accountSurplus(troveOwner, surplus);
                    activePool.sendColl(collSurplusPool, surplus);
                }
            } else {
                // Partial redemption
                trove.coll -= collToRedeem;
                trove.debt -= debtToRedeem;
                trove.stake = trove.coll;
            }

            totalCollDrawn += collToRedeem;
            remainingBold -= debtToRedeem;

            activePool.decreaseBoldDebt(debtToRedeem);

            emit TroveRedeemed(currentTroveId, collToRedeem, debtToRedeem);

            currentTroveId = nextTroveId;
        }

        // Send redeemed collateral to redeemer
        if (totalCollDrawn > 0) {
            activePool.sendColl(_redeemer, totalCollDrawn);
        }

        // Burn the redeemed sbUSD
        uint256 actualRedeemed = _boldAmount - remainingBold;
        if (actualRedeemed > 0) {
            sbUSDToken.burn(_redeemer, actualRedeemed);
        }

        emit Redemption(actualRedeemed, totalCollDrawn);

        return totalCollDrawn;
    }

    function batchLiquidateTroves(uint256[] calldata _troveIds) external override {
        for (uint256 i = 0; i < _troveIds.length; i++) {
            Trove storage trove = troves[_troveIds[i]];
            if (trove.status != Status.active) continue;

            (uint256 price, ) = priceFeed.fetchPrice();
            uint256 icr = _computeICR(trove.coll, trove.debt, price);
            if (icr >= MCR) continue;

            uint256 troveColl = trove.coll;
            uint256 troveDebt = trove.debt;

            totalStakes -= trove.stake;
            trove.status = Status.closedByLiquidation;
            trove.coll = 0;
            trove.debt = 0;
            trove.stake = 0;
            troveIdsCount--;

            stabilityPool.offset(troveDebt, troveColl);
            activePool.decreaseBoldDebt(troveDebt);
            activePool.sendColl(address(stabilityPool), troveColl);
            sortedTroves.remove(_troveIds[i]);

            emit TroveLiquidated(_troveIds[i], troveColl, troveDebt);
        }
    }

    // ==================== Liquidation ====================

    function liquidate(uint256 _troveId) external override {
        Trove storage trove = troves[_troveId];
        require(trove.status == Status.active, "Trove not active");

        (uint256 price, ) = priceFeed.fetchPrice();
        uint256 icr = _computeICR(trove.coll, trove.debt, price);
        require(icr < MCR, "ICR >= MCR");

        uint256 troveColl = trove.coll;
        uint256 troveDebt = trove.debt;

        totalStakes -= trove.stake;

        trove.status = Status.closedByLiquidation;
        trove.coll = 0;
        trove.debt = 0;
        trove.stake = 0;
        troveIdsCount--;

        // Offset debt against stability pool
        stabilityPool.offset(troveDebt, troveColl);
        activePool.decreaseBoldDebt(troveDebt);
        activePool.sendColl(address(stabilityPool), troveColl);

        sortedTroves.remove(_troveId);

        emit TroveLiquidated(_troveId, troveColl, troveDebt);
    }

    // ==================== View Functions ====================

    function getTroveStatus(uint256 _troveId) external view override returns (uint8) {
        return uint8(troves[_troveId].status);
    }

    function getTroveDebt(uint256 _troveId) external view override returns (uint256) {
        return troves[_troveId].debt;
    }

    function getTroveColl(uint256 _troveId) external view override returns (uint256) {
        return troves[_troveId].coll;
    }

    function getTroveAnnualInterestRate(uint256 _troveId) external view override returns (uint256) {
        return troves[_troveId].annualInterestRate;
    }

    function getTroveLastDebtUpdateTime(uint256 _troveId) external view override returns (uint256) {
        return troves[_troveId].lastDebtUpdateTime;
    }

    function getTroveIdsCount() external view override returns (uint256) {
        return troveIdsCount;
    }

    function getTroveFromTroveIdsArray(uint256 _index) external view override returns (uint256) {
        return troveIds[_index];
    }

    function getLatestTroveData(uint256 _troveId) external view override returns (
        uint256 debt,
        uint256 coll,
        uint256 stake,
        uint256 annualInterestRate,
        uint256 lastDebtUpdateTime
    ) {
        Trove memory trove = troves[_troveId];
        return (trove.debt, trove.coll, trove.stake, trove.annualInterestRate, trove.lastDebtUpdateTime);
    }

    function getEntireDebtAndColl(uint256 _troveId) external view override returns (
        uint256 debt,
        uint256 coll
    ) {
        Trove memory trove = troves[_troveId];
        return (trove.debt, trove.coll);
    }

    function getCurrentICR(uint256 _troveId, uint256 _price) external view override returns (uint256) {
        Trove memory trove = troves[_troveId];
        if (trove.debt == 0) return type(uint256).max;
        return _computeICR(trove.coll, trove.debt, _price);
    }

    function _computeICR(uint256 _coll, uint256 _debt, uint256 _price) internal pure returns (uint256) {
        if (_debt == 0) return type(uint256).max;
        return (_coll * _price) / _debt;
    }
}
