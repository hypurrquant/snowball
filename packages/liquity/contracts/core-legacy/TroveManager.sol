// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

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

interface IDefaultPool {
    function increaseBoldDebt(uint256 _amount) external;
    function decreaseBoldDebt(uint256 _amount) external;
    function increaseCollBalance(uint256 _amount) external;
    function sendCollToActivePool(uint256 _amount) external;
    function getCollBalance() external view returns (uint256);
    function getBoldDebt() external view returns (uint256);
}

/// @title TroveManager — Core trove state + liquidation logic (Liquity V2 fork)
/// @dev Includes access control, redistribution, TCR/shutdown, and redemption fee support.
contract TroveManager is ITroveManager {
    using SafeERC20 for IERC20;

    uint256 public constant DECIMAL_PRECISION = 1e18;
    uint256 public constant _100PCT = 1e18;
    uint256 public constant MIN_DEBT = 200e18;
    uint256 public constant MAX_BATCH_LIQUIDATION = 50;

    // --- Connected contracts ---

    IAddressesRegistry public addressesRegistry;
    address public borrowerOperations;
    ISbUSDToken public sbUSDToken;
    IPriceFeed public priceFeed;
    IStabilityPool public stabilityPool;
    IActivePool public activePool;
    ISortedTroves public sortedTroves;
    address public collSurplusPool;
    IDefaultPool public defaultPool;
    IERC20 public collToken;
    address public troveNFT;
    address public collateralRegistry;

    uint256 public MCR;
    uint256 public CCR;
    uint256 public SCR;

    // --- Trove data ---

    mapping(uint256 => Trove) public troves;
    uint256[] public troveIds;
    uint256 public troveIdsCount;

    // --- System totals ---

    uint256 public totalStakes;
    uint256 public totalStakesSnapshot;
    uint256 public totalCollateralSnapshot;

    // --- Redistribution accumulators ---

    uint256 public L_Coll;
    uint256 public L_BoldDebt;
    uint256 public lastCollError_Redistribution;
    uint256 public lastBoldDebtError_Redistribution;

    struct RewardSnapshot {
        uint256 coll;
        uint256 debt;
    }
    mapping(uint256 => RewardSnapshot) public rewardSnapshots;

    // --- Shutdown ---

    uint256 public shutdownTime;

    // --- Initialization ---

    address public immutable deployer;
    bool public isInitialized;

    constructor() {
        deployer = msg.sender;
    }

    // --- Events ---

    event TroveOpened(uint256 indexed troveId, address indexed owner, uint256 coll, uint256 debt);
    event TroveClosed(uint256 indexed troveId);
    event TroveAdjusted(uint256 indexed troveId, uint256 coll, uint256 debt);
    event TroveLiquidated(uint256 indexed troveId, uint256 coll, uint256 debt);
    event TroveInterestRateAdjusted(uint256 indexed troveId, uint256 newRate);
    event TroveRedeemed(uint256 indexed troveId, uint256 collDrawn, uint256 debtRedeemed);
    event Redemption(uint256 boldRedeemed, uint256 totalCollDrawn, uint256 feeCollDrawn);
    event Redistribution(uint256 debt, uint256 coll);
    event SystemShutdown(uint256 timestamp);

    // --- Modifiers ---

    modifier onlyBorrowerOperations() {
        require(msg.sender == borrowerOperations, "TroveManager: not BorrowerOps");
        _;
    }

    // --- Initialization ---

    function setAddressesRegistry(address _addressesRegistry) external override {
        require(msg.sender == deployer, "TroveManager: not deployer");
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
        defaultPool = IDefaultPool(addressesRegistry.defaultPool());
        collToken = IERC20(addressesRegistry.collToken());
        troveNFT = addressesRegistry.troveNFT();
        collateralRegistry = addressesRegistry.collateralRegistry();
        MCR = addressesRegistry.MCR();
        CCR = addressesRegistry.CCR();
        SCR = addressesRegistry.SCR();
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

        // Save redistribution snapshot so new trove doesn't claim pre-existing gains
        rewardSnapshots[_troveId] = RewardSnapshot({coll: L_Coll, debt: L_BoldDebt});

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

        // Apply pending redistribution gains before adjustment
        _applyPendingRewards(_troveId);

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

    // ==================== Redemption ====================

    function redeemCollateral(
        address _redeemer,
        uint256 _boldAmount,
        uint256 _price,
        uint256 _redemptionRate,
        uint256 _maxIterations
    ) external override returns (uint256 collDrawn) {
        _requireCallerIsCollateralRegistry();
        require(_boldAmount > 0, "Amount must be > 0");

        uint256 remainingBold = _boldAmount;
        uint256 totalCollDrawn;
        uint256 totalCollFee;
        uint256 iterations;

        uint256 currentTroveId = sortedTroves.getLast();

        while (currentTroveId != 0 && remainingBold > 0 && iterations < _maxIterations) {
            iterations++;
            uint256 nextTroveId = sortedTroves.getPrev(currentTroveId);

            Trove storage trove = troves[currentTroveId];
            if (trove.status != Status.active) {
                currentTroveId = nextTroveId;
                continue;
            }

            // Apply pending redistribution gains
            _applyPendingRewards(currentTroveId);

            uint256 troveDebt = trove.debt;
            uint256 troveColl = trove.coll;

            uint256 debtToRedeem;
            if (remainingBold >= troveDebt) {
                debtToRedeem = troveDebt;
            } else if (troveDebt - remainingBold < MIN_DEBT) {
                debtToRedeem = troveDebt;
            } else {
                debtToRedeem = remainingBold;
            }

            // Calculate collateral at face value, then deduct redemption fee
            uint256 collAtFaceValue = (debtToRedeem * DECIMAL_PRECISION) / _price;
            uint256 redemptionFee = (collAtFaceValue * _redemptionRate) / DECIMAL_PRECISION;
            uint256 collToRedeem = collAtFaceValue - redemptionFee;
            if (collToRedeem > troveColl) {
                collToRedeem = troveColl;
            }

            if (debtToRedeem == troveDebt) {
                address troveOwner = ITroveNFTOwner(troveNFT).ownerOf(currentTroveId);

                totalStakes -= trove.stake;
                trove.status = Status.closedByRedemption;
                trove.coll = 0;
                trove.debt = 0;
                trove.stake = 0;
                troveIdsCount--;

                sortedTroves.remove(currentTroveId);

                // surplus = troveColl - collToRedeem (fee stays in surplus for owner)
                uint256 surplus = troveColl - collToRedeem;
                if (surplus > 0) {
                    ICollSurplusPool(collSurplusPool).accountSurplus(troveOwner, surplus);
                    activePool.sendColl(collSurplusPool, surplus);
                }
            } else {
                trove.coll -= collToRedeem;
                trove.debt -= debtToRedeem;
                trove.stake = trove.coll;
            }

            totalCollDrawn += collToRedeem;
            totalCollFee += redemptionFee;
            remainingBold -= debtToRedeem;

            activePool.decreaseBoldDebt(debtToRedeem);

            emit TroveRedeemed(currentTroveId, collToRedeem, debtToRedeem);

            currentTroveId = nextTroveId;
        }

        if (totalCollDrawn > 0) {
            activePool.sendColl(_redeemer, totalCollDrawn);
        }

        uint256 actualRedeemed = _boldAmount - remainingBold;

        emit Redemption(actualRedeemed, totalCollDrawn, totalCollFee);

        return actualRedeemed;
    }

    // ==================== Liquidation ====================

    function liquidate(uint256 _troveId) external override {
        Trove storage trove = troves[_troveId];
        require(trove.status == Status.active, "Trove not active");

        // Apply pending redistribution gains
        _applyPendingRewards(_troveId);

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

        // Determine how much can be offset by SP
        uint256 spDeposits = stabilityPool.getTotalBoldDeposits();
        uint256 debtToOffset;
        uint256 collToOffset;
        uint256 debtToRedistribute;
        uint256 collToRedistribute;

        if (spDeposits >= troveDebt) {
            debtToOffset = troveDebt;
            collToOffset = troveColl;
        } else {
            debtToOffset = spDeposits;
            collToOffset = troveDebt > 0 ? (troveColl * spDeposits) / troveDebt : 0;
            debtToRedistribute = troveDebt - spDeposits;
            collToRedistribute = troveColl - collToOffset;
        }

        // Offset against SP
        if (debtToOffset > 0) {
            stabilityPool.offset(debtToOffset, collToOffset);
            activePool.decreaseBoldDebt(debtToOffset);
            activePool.sendColl(address(stabilityPool), collToOffset);
        }

        // Redistribute remainder
        if (debtToRedistribute > 0) {
            _redistributeDebtAndColl(debtToRedistribute, collToRedistribute);
        }

        sortedTroves.remove(_troveId);

        emit TroveLiquidated(_troveId, troveColl, troveDebt);
    }

    function batchLiquidateTroves(uint256[] calldata _troveIds) external override {
        require(_troveIds.length <= MAX_BATCH_LIQUIDATION, "TroveManager: batch too large");
        for (uint256 i = 0; i < _troveIds.length; i++) {
            Trove storage trove = troves[_troveIds[i]];
            if (trove.status != Status.active) continue;

            // Apply pending redistribution gains
            _applyPendingRewards(_troveIds[i]);

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

            uint256 spDeposits = stabilityPool.getTotalBoldDeposits();
            uint256 debtToOffset;
            uint256 collToOffset;

            if (spDeposits >= troveDebt) {
                debtToOffset = troveDebt;
                collToOffset = troveColl;
            } else {
                debtToOffset = spDeposits;
                collToOffset = troveDebt > 0 ? (troveColl * spDeposits) / troveDebt : 0;
                uint256 debtToRedistribute = troveDebt - spDeposits;
                uint256 collToRedistribute = troveColl - collToOffset;
                if (debtToRedistribute > 0) {
                    _redistributeDebtAndColl(debtToRedistribute, collToRedistribute);
                }
            }

            if (debtToOffset > 0) {
                stabilityPool.offset(debtToOffset, collToOffset);
                activePool.decreaseBoldDebt(debtToOffset);
                activePool.sendColl(address(stabilityPool), collToOffset);
            }

            sortedTroves.remove(_troveIds[i]);

            emit TroveLiquidated(_troveIds[i], troveColl, troveDebt);
        }
    }

    // ==================== Redistribution ====================

    function _redistributeDebtAndColl(uint256 _debt, uint256 _coll) internal {
        if (_debt == 0) return;

        if (totalStakes == 0) {
            activePool.decreaseBoldDebt(_debt);
            defaultPool.increaseBoldDebt(_debt);
            activePool.sendColl(address(defaultPool), _coll);
            defaultPool.increaseCollBalance(_coll);
            return;
        }

        uint256 collNumerator = _coll * DECIMAL_PRECISION + lastCollError_Redistribution;
        uint256 debtNumerator = _debt * DECIMAL_PRECISION + lastBoldDebtError_Redistribution;

        uint256 collPerUnitStaked = collNumerator / totalStakes;
        uint256 debtPerUnitStaked = debtNumerator / totalStakes;

        lastCollError_Redistribution = collNumerator - (collPerUnitStaked * totalStakes);
        lastBoldDebtError_Redistribution = debtNumerator - (debtPerUnitStaked * totalStakes);

        L_Coll += collPerUnitStaked;
        L_BoldDebt += debtPerUnitStaked;

        activePool.decreaseBoldDebt(_debt);
        defaultPool.increaseBoldDebt(_debt);

        activePool.sendColl(address(defaultPool), _coll);
        defaultPool.increaseCollBalance(_coll);

        emit Redistribution(_debt, _coll);
    }

    function _applyPendingRewards(uint256 _troveId) internal {
        (uint256 pendingColl, uint256 pendingDebt) = _getPendingRedistributionGains(_troveId);

        if (pendingColl > 0 || pendingDebt > 0) {
            Trove storage trove = troves[_troveId];
            trove.coll += pendingColl;
            trove.debt += pendingDebt;
            trove.stake = trove.coll;

            if (pendingDebt > 0) {
                defaultPool.decreaseBoldDebt(pendingDebt);
                activePool.increaseBoldDebt(pendingDebt);
            }
            if (pendingColl > 0) {
                defaultPool.sendCollToActivePool(pendingColl);
                activePool.increaseCollBalance(pendingColl);
            }
        }

        rewardSnapshots[_troveId] = RewardSnapshot({coll: L_Coll, debt: L_BoldDebt});
    }

    function _getPendingRedistributionGains(uint256 _troveId) internal view returns (uint256 pendingColl, uint256 pendingDebt) {
        Trove storage trove = troves[_troveId];
        if (trove.status != Status.active) return (0, 0);

        RewardSnapshot storage snapshot = rewardSnapshots[_troveId];
        uint256 stake = trove.stake;

        pendingColl = (stake * (L_Coll - snapshot.coll)) / DECIMAL_PRECISION;
        pendingDebt = (stake * (L_BoldDebt - snapshot.debt)) / DECIMAL_PRECISION;
    }

    // ==================== Shutdown ====================

    function shutdown() external override {
        require(shutdownTime == 0, "Already shut down");
        require(msg.sender == borrowerOperations, "TroveManager: not BorrowerOps");

        shutdownTime = block.timestamp;
        emit SystemShutdown(block.timestamp);
    }

    // ==================== TCR / Branch Totals ====================

    function getEntireBranchColl() public view override returns (uint256) {
        return activePool.getCollBalance() + defaultPool.getCollBalance();
    }

    function getEntireBranchDebt() public view override returns (uint256) {
        return activePool.getBoldDebt() + defaultPool.getBoldDebt();
    }

    function getTCR(uint256 _price) public view returns (uint256) {
        uint256 entireColl = getEntireBranchColl();
        uint256 entireDebt = getEntireBranchDebt();
        return _computeICR(entireColl, entireDebt, _price);
    }

    function getUnbackedPortionPriceAndRedeemability() external override returns (uint256 unbacked, uint256 price, bool redeemable) {
        (price, ) = priceFeed.fetchPrice();
        uint256 tcr = getTCR(price);

        redeemable = (tcr > SCR && shutdownTime == 0);

        uint256 entireDebt = getEntireBranchDebt();
        uint256 entireCollValue = (getEntireBranchColl() * price) / DECIMAL_PRECISION;

        if (entireDebt > entireCollValue) {
            unbacked = entireDebt - entireCollValue;
        } else {
            unbacked = entireDebt;
        }
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

    function getTroveLastInterestRateAdjTime(uint256 _troveId) external view override returns (uint256) {
        return troves[_troveId].lastInterestRateAdjTime;
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
        (uint256 pendingColl, uint256 pendingDebt) = _getPendingRedistributionGains(_troveId);
        return (trove.debt + pendingDebt, trove.coll + pendingColl, trove.stake, trove.annualInterestRate, trove.lastDebtUpdateTime);
    }

    function getEntireDebtAndColl(uint256 _troveId) external view override returns (
        uint256 debt,
        uint256 coll
    ) {
        Trove memory trove = troves[_troveId];
        (uint256 pendingColl, uint256 pendingDebt) = _getPendingRedistributionGains(_troveId);
        return (trove.debt + pendingDebt, trove.coll + pendingColl);
    }

    function getCurrentICR(uint256 _troveId, uint256 _price) external view override returns (uint256) {
        Trove memory trove = troves[_troveId];
        (uint256 pendingColl, uint256 pendingDebt) = _getPendingRedistributionGains(_troveId);
        uint256 entireColl = trove.coll + pendingColl;
        uint256 entireDebt = trove.debt + pendingDebt;
        if (entireDebt == 0) return type(uint256).max;
        return _computeICR(entireColl, entireDebt, _price);
    }

    // ==================== Internal helpers ====================

    function _computeICR(uint256 _coll, uint256 _debt, uint256 _price) internal pure returns (uint256) {
        if (_debt == 0) return type(uint256).max;
        return (_coll * _price) / _debt;
    }

    function _requireCallerIsCollateralRegistry() internal view {
        require(msg.sender == collateralRegistry, "TroveManager: Caller is not CollateralRegistry");
    }
}
