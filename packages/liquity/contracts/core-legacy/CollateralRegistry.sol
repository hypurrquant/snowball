// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "./Dependencies/Ownable.sol";
import "../interfaces/ITroveManager.sol";
import "../interfaces/ISbUSDToken.sol";
import "../interfaces/IPriceFeed.sol";

/// @title CollateralRegistry — Tracks collateral branches + redemption fee logic
/// @dev Ports base rate decay and redemption fee from Liquity V2 src/
contract CollateralRegistry is Ownable {
    // --- Constants ---

    uint256 public constant DECIMAL_PRECISION = 1e18;
    uint256 public constant _100PCT = 1e18;
    uint256 public constant ONE_MINUTE = 1 minutes;

    // Redemption fee floor: 0.5%
    uint256 public constant REDEMPTION_FEE_FLOOR = 5e15;
    // Half-life of 6h. (1/2) = d^360 => d = (1/2)^(1/360)
    uint256 public constant REDEMPTION_MINUTE_DECAY_FACTOR = 998076443575628800;
    // Beta = 1 (divisor for redeemed fraction in base rate calc)
    uint256 public constant REDEMPTION_BETA = 1;
    // 100% initial base rate to prevent redemptions until Bold depegs
    uint256 public constant INITIAL_BASE_RATE = 1e18;
    uint256 public constant MAX_BRANCHES = 10;

    // --- Branch data ---

    struct Branch {
        address token;
        address troveManager;
        address borrowerOperations;
        address stabilityPool;
        address activePool;
        address priceFeed;
        bool isActive;
    }

    Branch[] public branches;
    ISbUSDToken public sbUSDToken;

    // --- Base rate state ---

    uint256 public baseRate;
    uint256 public lastFeeOperationTime;

    // --- Events ---

    event BranchAdded(uint256 indexed index, address token);
    event BaseRateUpdated(uint256 _baseRate);
    event LastFeeOpTimeUpdated(uint256 _lastFeeOpTime);

    constructor(address _sbUSDToken) Ownable(msg.sender) {
        sbUSDToken = ISbUSDToken(_sbUSDToken);
        baseRate = INITIAL_BASE_RATE;
        lastFeeOperationTime = block.timestamp;
        emit BaseRateUpdated(INITIAL_BASE_RATE);
    }

    function addBranch(
        address _token,
        address _troveManager,
        address _borrowerOperations,
        address _stabilityPool,
        address _activePool,
        address _priceFeed
    ) external onlyOwner {
        require(branches.length < MAX_BRANCHES, "CollateralRegistry: max branches reached");
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

    // --- Getters ---

    function totalCollaterals() external view returns (uint256) {
        return branches.length;
    }

    function getToken(uint256 _index) external view returns (address) {
        return branches[_index].token;
    }

    function getTroveManager(uint256 _index) public view returns (ITroveManager) {
        return ITroveManager(branches[_index].troveManager);
    }

    function getBorrowerOperations(uint256 _index) external view returns (address) {
        return branches[_index].borrowerOperations;
    }

    function getStabilityPool(uint256 _index) external view returns (address) {
        return branches[_index].stabilityPool;
    }

    function getActivePool(uint256 _index) external view returns (address) {
        return branches[_index].activePool;
    }

    function getPriceFeed(uint256 _index) external view returns (address) {
        return branches[_index].priceFeed;
    }

    // --- Redemption fee getters ---

    function getRedemptionRate() external view returns (uint256) {
        return _calcRedemptionRate(baseRate);
    }

    function getRedemptionRateWithDecay() public view returns (uint256) {
        return _calcRedemptionRate(_calcDecayedBaseRate());
    }

    function getRedemptionRateForRedeemedAmount(uint256 _redeemAmount) external view returns (uint256) {
        uint256 totalBoldSupply = sbUSDToken.totalSupply();
        uint256 newBaseRate = _getUpdatedBaseRateFromRedemption(_redeemAmount, totalBoldSupply);
        return _calcRedemptionRate(newBaseRate);
    }

    function getRedemptionFeeWithDecay(uint256 _collDrawn) external view returns (uint256) {
        return _calcRedemptionFee(getRedemptionRateWithDecay(), _collDrawn);
    }

    function getEffectiveRedemptionFeeInBold(uint256 _redeemAmount) external view returns (uint256) {
        uint256 totalBoldSupply = sbUSDToken.totalSupply();
        uint256 newBaseRate = _getUpdatedBaseRateFromRedemption(_redeemAmount, totalBoldSupply);
        return _calcRedemptionFee(_calcRedemptionRate(newBaseRate), _redeemAmount);
    }

    // --- Redemption ---

    struct RedemptionTotals {
        uint256 numCollaterals;
        uint256 boldSupplyAtStart;
        uint256 unbacked;
        uint256 redeemedAmount;
    }

    function redeemCollateral(
        uint256 _sbUSDAmount,
        uint256 _maxIterationsPerCollateral,
        uint256 _maxFeePercentage
    ) external {
        _requireValidMaxFeePercentage(_maxFeePercentage);
        _requireAmountGreaterThanZero(_sbUSDAmount);

        RedemptionTotals memory totals;
        totals.numCollaterals = branches.length;
        require(totals.numCollaterals > 0, "No branches");

        uint256[] memory unbackedPortions = new uint256[](totals.numCollaterals);
        uint256[] memory prices = new uint256[](totals.numCollaterals);

        // Gather unbacked portions
        for (uint256 i = 0; i < totals.numCollaterals; i++) {
            if (!branches[i].isActive) continue;
            ITroveManager tm = getTroveManager(i);
            (uint256 unbackedPortion, uint256 price, bool redeemable) = tm.getUnbackedPortionPriceAndRedeemability();
            prices[i] = price;
            if (redeemable) {
                totals.unbacked += unbackedPortion;
                unbackedPortions[i] = unbackedPortion;
            }
        }

        // Fallback: if all redeemable branches are fully backed, distribute by branch debt
        if (totals.unbacked == 0) {
            unbackedPortions = new uint256[](totals.numCollaterals);
            for (uint256 i = 0; i < totals.numCollaterals; i++) {
                if (!branches[i].isActive) continue;
                ITroveManager tm = getTroveManager(i);
                (,, bool redeemable) = tm.getUnbackedPortionPriceAndRedeemability();
                if (redeemable) {
                    uint256 branchDebt = tm.getEntireBranchDebt();
                    totals.unbacked += branchDebt;
                    unbackedPortions[i] = branchDebt;
                }
            }
        } else {
            // Cap redemption at total unbacked
            if (_sbUSDAmount > totals.unbacked) {
                _sbUSDAmount = totals.unbacked;
            }
        }

        totals.boldSupplyAtStart = sbUSDToken.totalSupply();

        // Calculate redemption rate from base rate + redeemed fraction
        uint256 redemptionRate = _calcRedemptionRate(
            _getUpdatedBaseRateFromRedemption(_sbUSDAmount, totals.boldSupplyAtStart)
        );
        require(redemptionRate <= _maxFeePercentage, "CR: Fee exceeded provided maximum");

        // Redeem proportionally across branches
        for (uint256 i = 0; i < totals.numCollaterals; i++) {
            if (unbackedPortions[i] == 0) continue;

            uint256 redeemAmount = _sbUSDAmount * unbackedPortions[i] / totals.unbacked;
            if (redeemAmount > 0) {
                ITroveManager tm = getTroveManager(i);
                uint256 redeemedAmount = tm.redeemCollateral(
                    msg.sender,
                    redeemAmount,
                    prices[i],
                    redemptionRate,
                    _maxIterationsPerCollateral
                );
                totals.redeemedAmount += redeemedAmount;
            }

            _sbUSDAmount -= redeemAmount;
            totals.unbacked -= unbackedPortions[i];
        }

        // Update base rate
        _updateBaseRateAndGetRedemptionRate(totals.redeemedAmount, totals.boldSupplyAtStart);

        // Burn redeemed sbUSD
        if (totals.redeemedAmount > 0) {
            sbUSDToken.burn(msg.sender, totals.redeemedAmount);
        }
    }

    // --- Internal fee functions ---

    function _updateLastFeeOpTime() internal {
        uint256 minutesPassed = _minutesPassedSinceLastFeeOp();
        if (minutesPassed > 0) {
            lastFeeOperationTime += ONE_MINUTE * minutesPassed;
            emit LastFeeOpTimeUpdated(lastFeeOperationTime);
        }
    }

    function _minutesPassedSinceLastFeeOp() internal view returns (uint256) {
        return (block.timestamp - lastFeeOperationTime) / ONE_MINUTE;
    }

    function _updateBaseRateAndGetRedemptionRate(uint256 _sbUSDAmount, uint256 _totalBoldSupplyAtStart) internal {
        uint256 newBaseRate = _getUpdatedBaseRateFromRedemption(_sbUSDAmount, _totalBoldSupplyAtStart);
        baseRate = newBaseRate;
        emit BaseRateUpdated(newBaseRate);
        _updateLastFeeOpTime();
    }

    function _getUpdatedBaseRateFromRedemption(uint256 _redeemAmount, uint256 _totalBoldSupply)
        internal
        view
        returns (uint256)
    {
        uint256 decayedBaseRate = _calcDecayedBaseRate();
        uint256 redeemedBoldFraction = _redeemAmount * DECIMAL_PRECISION / _totalBoldSupply;
        uint256 newBaseRate = decayedBaseRate + redeemedBoldFraction / REDEMPTION_BETA;
        newBaseRate = _min(newBaseRate, DECIMAL_PRECISION);
        return newBaseRate;
    }

    function _calcDecayedBaseRate() internal view returns (uint256) {
        uint256 minutesPassed = _minutesPassedSinceLastFeeOp();
        uint256 decayFactor = _decPow(REDEMPTION_MINUTE_DECAY_FACTOR, minutesPassed);
        return baseRate * decayFactor / DECIMAL_PRECISION;
    }

    function _calcRedemptionRate(uint256 _baseRate) internal pure returns (uint256) {
        return _min(REDEMPTION_FEE_FLOOR + _baseRate, DECIMAL_PRECISION);
    }

    function _calcRedemptionFee(uint256 _redemptionRate, uint256 _amount) internal pure returns (uint256) {
        return _redemptionRate * _amount / DECIMAL_PRECISION;
    }

    // --- Math helpers ---

    /// @dev Exponentiation by squaring for 18-digit decimal base, integer exponent.
    function _decPow(uint256 _base, uint256 _minutes) internal pure returns (uint256) {
        if (_minutes > 525600000) _minutes = 525600000;
        if (_minutes == 0) return DECIMAL_PRECISION;

        uint256 y = DECIMAL_PRECISION;
        uint256 x = _base;
        uint256 n = _minutes;

        while (n > 1) {
            if (n % 2 == 0) {
                x = _decMul(x, x);
                n = n / 2;
            } else {
                y = _decMul(x, y);
                x = _decMul(x, x);
                n = (n - 1) / 2;
            }
        }

        return _decMul(x, y);
    }

    function _decMul(uint256 x, uint256 y) internal pure returns (uint256) {
        uint256 prod_xy = x * y;
        return (prod_xy + DECIMAL_PRECISION / 2) / DECIMAL_PRECISION;
    }

    function _min(uint256 _a, uint256 _b) internal pure returns (uint256) {
        return (_a < _b) ? _a : _b;
    }

    // --- Require functions ---

    function _requireValidMaxFeePercentage(uint256 _maxFeePercentage) internal pure {
        require(
            _maxFeePercentage >= REDEMPTION_FEE_FLOOR && _maxFeePercentage <= DECIMAL_PRECISION,
            "Max fee percentage must be between 0.5% and 100%"
        );
    }

    function _requireAmountGreaterThanZero(uint256 _amount) internal pure {
        require(_amount > 0, "CollateralRegistry: Amount must be greater than zero");
    }
}
