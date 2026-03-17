// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity 0.8.24;

// Snowball Lend — Morpho Blue fork on Creditcoin
// Original: https://github.com/morpho-org/morpho-blue (GPL-2.0)
// Modifications: Rebranded as Snowball Lend; deployed on Creditcoin testnet

import {ISnowballLend} from "./interfaces/ISnowballLend.sol";

// ─── External Interfaces ───

interface IAdaptiveCurveIRM {
    function borrowRate(bytes32 id, uint256 totalSupplyAssets, uint256 totalBorrowAssets, uint256 lastUpdate) external returns (uint256);
}

interface IOracle {
    function getPrice() external view returns (uint256);
}

// ─── Callback Interfaces (flash-loan style) ───

interface ISnowballLendSupplyCallback {
    function onSnowballLendSupply(uint256 assets, bytes calldata data) external;
}

interface ISnowballLendRepayCallback {
    function onSnowballLendRepay(uint256 assets, bytes calldata data) external;
}

interface ISnowballLendSupplyCollateralCallback {
    function onSnowballLendSupplyCollateral(uint256 assets, bytes calldata data) external;
}

interface ISnowballLendLiquidateCallback {
    function onSnowballLendLiquidate(uint256 repaidAssets, bytes calldata data) external;
}

/**
 * @title SnowballLend
 * @notice Permissionless lending protocol (Morpho Blue fork) on Creditcoin.
 *         Each market is defined by (loanToken, collateralToken, oracle, irm, lltv).
 *         Markets are immutable and trustless — no governance can modify them.
 * @dev Fork of Morpho Blue. License: GPL-2.0-or-later (inherited from Morpho Blue).
 */
contract SnowballLend is ISnowballLend {
    // ─── Constants ───

    uint256 internal constant WAD = 1e18;
    uint256 internal constant ORACLE_PRICE_SCALE = 1e36;
    uint256 internal constant VIRTUAL_SHARES = 1e6;
    uint256 internal constant VIRTUAL_ASSETS = 1;
    uint256 internal constant MAX_FEE = 0.25e18;
    uint256 internal constant LIQUIDATION_CURSOR = 0.3e18;
    uint256 internal constant MAX_LIQUIDATION_INCENTIVE_FACTOR = 1.15e18;

    // ─── Storage ───

    /// @notice Owner (fee recipient setter)
    address public owner;

    /// @notice Fee recipient for protocol fees
    address public feeRecipient;

    /// @notice Authorized interest rate models
    mapping(address => bool) public isIrmEnabled;

    /// @notice Authorized LLTVs
    mapping(uint256 => bool) public isLltvEnabled;

    /// @notice Authorization: authorizer => authorized => bool
    mapping(address => mapping(address => bool)) public isAuthorized;

    /// @notice Market supply shares per user: id => user => shares
    mapping(bytes32 => mapping(address => uint256)) public supplyShares;

    /// @notice Market borrow shares per user: id => user => shares
    mapping(bytes32 => mapping(address => uint256)) public borrowShares;

    /// @notice Market collateral per user: id => user => amount
    mapping(bytes32 => mapping(address => uint256)) public collateral;

    /// @notice Market state: id => MarketState
    mapping(bytes32 => MarketState) public market;

    /// @notice Market params: id => MarketParams
    mapping(bytes32 => MarketParams) public idToMarketParams;

    // ─── Types ───

    struct MarketParams {
        address loanToken;
        address collateralToken;
        address oracle;
        address irm;
        uint256 lltv;
    }

    struct MarketState {
        uint128 totalSupplyAssets;
        uint128 totalSupplyShares;
        uint128 totalBorrowAssets;
        uint128 totalBorrowShares;
        uint128 lastUpdate;
        uint128 fee;
    }

    // ─── Events ───

    event CreateMarket(bytes32 indexed id, MarketParams marketParams);
    event Supply(bytes32 indexed id, address indexed caller, address indexed onBehalf, uint256 assets, uint256 shares);
    event Withdraw(bytes32 indexed id, address caller, address indexed onBehalf, address indexed receiver, uint256 assets, uint256 shares);
    event Borrow(bytes32 indexed id, address caller, address indexed onBehalf, address indexed receiver, uint256 assets, uint256 shares);
    event Repay(bytes32 indexed id, address indexed caller, address indexed onBehalf, uint256 assets, uint256 shares);
    event SupplyCollateral(bytes32 indexed id, address indexed caller, address indexed onBehalf, uint256 assets);
    event WithdrawCollateral(bytes32 indexed id, address caller, address indexed onBehalf, address indexed receiver, uint256 assets);
    event Liquidate(bytes32 indexed id, address indexed caller, address indexed borrower, uint256 repaidAssets, uint256 repaidShares, uint256 seizedAssets, uint256 badDebtAssets, uint256 badDebtShares);
    event SetOwner(address indexed newOwner);
    event SetFeeRecipient(address indexed newFeeRecipient);
    event EnableIrm(address indexed irm);
    event EnableLltv(uint256 lltv);
    event SetFee(bytes32 indexed id, uint256 newFee);
    event SetAuthorization(address indexed caller, address indexed authorized, bool newIsAuthorized);
    event AccrueInterest(bytes32 indexed id, uint256 prevBorrowRate, uint256 interest, uint256 feeShares);

    // ─── Constructor ───

    constructor(address _owner) {
        owner = _owner;
        emit SetOwner(_owner);
    }

    // ─── Inline Math Library (internal pure) ───

    function _mulDivDown(uint256 x, uint256 y, uint256 d) internal pure returns (uint256) {
        return (x * y) / d;
    }

    function _mulDivUp(uint256 x, uint256 y, uint256 d) internal pure returns (uint256) {
        return (x * y + (d - 1)) / d;
    }

    function _wMulDown(uint256 x, uint256 y) internal pure returns (uint256) {
        return _mulDivDown(x, y, WAD);
    }

    function _wDivDown(uint256 x, uint256 y) internal pure returns (uint256) {
        return _mulDivDown(x, WAD, y);
    }

    function _wDivUp(uint256 x, uint256 y) internal pure returns (uint256) {
        return _mulDivUp(x, WAD, y);
    }

    /// @dev Taylor expansion of e^x - 1 ≈ x + x²/2 + x³/6
    function _wTaylorCompounded(uint256 x, uint256 n) internal pure returns (uint256) {
        uint256 firstTerm = x * n;
        uint256 secondTerm = _mulDivDown(firstTerm, firstTerm, 2 * WAD);
        uint256 thirdTerm = _mulDivDown(secondTerm, firstTerm, 3 * WAD);
        return firstTerm + secondTerm + thirdTerm;
    }

    // ─── Inline SharesMath Library ───

    function _toSharesDown(uint256 assets, uint256 totalAssets, uint256 totalShares) internal pure returns (uint256) {
        return _mulDivDown(assets, totalShares + VIRTUAL_SHARES, totalAssets + VIRTUAL_ASSETS);
    }

    function _toSharesUp(uint256 assets, uint256 totalAssets, uint256 totalShares) internal pure returns (uint256) {
        return _mulDivUp(assets, totalShares + VIRTUAL_SHARES, totalAssets + VIRTUAL_ASSETS);
    }

    function _toAssetsDown(uint256 shares, uint256 totalAssets, uint256 totalShares) internal pure returns (uint256) {
        return _mulDivDown(shares, totalAssets + VIRTUAL_ASSETS, totalShares + VIRTUAL_SHARES);
    }

    function _toAssetsUp(uint256 shares, uint256 totalAssets, uint256 totalShares) internal pure returns (uint256) {
        return _mulDivUp(shares, totalAssets + VIRTUAL_ASSETS, totalShares + VIRTUAL_SHARES);
    }

    // ─── Inline Utils Library ───

    function _exactlyOneZero(uint256 a, uint256 b) internal pure returns (bool) {
        return (a == 0) != (b == 0);
    }

    function _min(uint256 a, uint256 b) internal pure returns (uint256) {
        return a < b ? a : b;
    }

    function _toUint128(uint256 x) internal pure returns (uint128) {
        require(x <= type(uint128).max, "SnowballLend: uint128 overflow");
        return uint128(x);
    }

    function _zeroFloorSub(uint256 a, uint256 b) internal pure returns (uint256) {
        return a > b ? a - b : 0;
    }

    // ─── Inline SafeTransfer Library ───

    function _safeTransfer(address token, address to, uint256 value) internal {
        (bool success, bytes memory data) = token.call(abi.encodeWithSelector(0xa9059cbb, to, value));
        require(success && (data.length == 0 || abi.decode(data, (bool))), "SnowballLend: transfer failed");
    }

    function _safeTransferFrom(address token, address from, address to, uint256 value) internal {
        (bool success, bytes memory data) = token.call(abi.encodeWithSelector(0x23b872dd, from, to, value));
        require(success && (data.length == 0 || abi.decode(data, (bool))), "SnowballLend: transferFrom failed");
    }

    // ─── Internal Helpers ───

    function _isSenderAuthorized(address onBehalf) internal view returns (bool) {
        return msg.sender == onBehalf || isAuthorized[onBehalf][msg.sender];
    }

    function _accrueInterest(bytes32 id) internal {
        MarketState storage m = market[id];
        uint256 elapsed = block.timestamp - m.lastUpdate;
        if (elapsed == 0) return;

        MarketParams storage params = idToMarketParams[id];

        uint256 borrowRate;
        if (m.totalBorrowAssets > 0) {
            borrowRate = IAdaptiveCurveIRM(params.irm).borrowRate(
                id, uint256(m.totalSupplyAssets), uint256(m.totalBorrowAssets), uint256(m.lastUpdate)
            );
        }

        uint256 interest = _wTaylorCompounded(borrowRate, elapsed);
        uint256 interestAmount = _wMulDown(uint256(m.totalBorrowAssets), interest);

        m.totalBorrowAssets += _toUint128(interestAmount);
        m.totalSupplyAssets += _toUint128(interestAmount);
        m.lastUpdate = _toUint128(block.timestamp);

        uint256 feeShares;
        if (m.fee > 0 && interestAmount > 0) {
            uint256 feeAmount = _wMulDown(interestAmount, uint256(m.fee));
            feeShares = _toSharesDown(feeAmount, uint256(m.totalSupplyAssets) - feeAmount, uint256(m.totalSupplyShares));
            m.totalSupplyShares += _toUint128(feeShares);
            supplyShares[id][feeRecipient] += feeShares;
        }

        emit AccrueInterest(id, borrowRate, interestAmount, feeShares);
    }

    function _isHealthy(bytes32 id, address user) internal view returns (bool) {
        MarketState storage m = market[id];
        MarketParams storage params = idToMarketParams[id];

        uint256 userBorrowShares = borrowShares[id][user];
        if (userBorrowShares == 0) return true;

        uint256 userCollateral = collateral[id][user];
        uint256 oraclePrice = IOracle(params.oracle).getPrice();

        uint256 maxBorrow = _wMulDown(
            _mulDivDown(userCollateral, oraclePrice, ORACLE_PRICE_SCALE),
            params.lltv
        );
        uint256 currentBorrow = _toAssetsUp(
            userBorrowShares,
            uint256(m.totalBorrowAssets),
            uint256(m.totalBorrowShares)
        );

        return maxBorrow >= currentBorrow;
    }

    // ─── Admin ───

    function setOwner(address newOwner) external {
        require(msg.sender == owner, "SnowballLend: not owner");
        owner = newOwner;
        emit SetOwner(newOwner);
    }

    function setFeeRecipient(address newFeeRecipient) external {
        require(msg.sender == owner, "SnowballLend: not owner");
        feeRecipient = newFeeRecipient;
        emit SetFeeRecipient(newFeeRecipient);
    }

    function enableIrm(address irm) external {
        require(msg.sender == owner, "SnowballLend: not owner");
        isIrmEnabled[irm] = true;
        emit EnableIrm(irm);
    }

    function enableLltv(uint256 lltv) external {
        require(msg.sender == owner, "SnowballLend: not owner");
        require(lltv < WAD, "SnowballLend: LLTV >= 1");
        isLltvEnabled[lltv] = true;
        emit EnableLltv(lltv);
    }

    function setFee(bytes32 id, uint256 newFee) external {
        require(msg.sender == owner, "SnowballLend: not owner");
        require(market[id].lastUpdate != 0, "SnowballLend: market not created");
        require(newFee <= MAX_FEE, "SnowballLend: fee > MAX_FEE");
        _accrueInterest(id);
        market[id].fee = uint128(newFee);
        emit SetFee(id, newFee);
    }

    function setAuthorization(address authorized, bool newIsAuthorized) external {
        isAuthorized[msg.sender][authorized] = newIsAuthorized;
        emit SetAuthorization(msg.sender, authorized, newIsAuthorized);
    }

    // ─── Public Interest Accrual ───

    function accrueInterest(bytes32 id) external {
        require(market[id].lastUpdate != 0, "SnowballLend: market not created");
        _accrueInterest(id);
    }

    // ─── Market ───

    function marketId(MarketParams memory params) public pure returns (bytes32) {
        return keccak256(abi.encode(params));
    }

    function marketId(
        address loanToken,
        address collateralToken,
        address oracle,
        address irm,
        uint256 lltv
    ) external pure returns (bytes32) {
        return keccak256(abi.encode(MarketParams(loanToken, collateralToken, oracle, irm, lltv)));
    }

    function createMarket(MarketParams calldata params) external returns (bytes32 id) {
        require(isIrmEnabled[params.irm], "SnowballLend: IRM not enabled");
        require(isLltvEnabled[params.lltv], "SnowballLend: LLTV not enabled");
        id = marketId(params);
        require(market[id].lastUpdate == 0, "SnowballLend: market already exists");
        market[id].lastUpdate = uint128(block.timestamp);
        idToMarketParams[id] = params;
        emit CreateMarket(id, params);
    }

    // ─── Supply ───

    function supply(bytes32 id, uint256 assets, uint256 shares, address onBehalf, bytes calldata data) external returns (uint256, uint256) {
        require(market[id].lastUpdate != 0, "SnowballLend: market not created");
        require(_exactlyOneZero(assets, shares), "SnowballLend: exactly one of assets/shares must be zero");
        require(onBehalf != address(0), "SnowballLend: zero address");

        _accrueInterest(id);

        MarketState storage m = market[id];

        if (assets > 0) {
            shares = _toSharesDown(assets, uint256(m.totalSupplyAssets), uint256(m.totalSupplyShares));
        } else {
            assets = _toAssetsUp(shares, uint256(m.totalSupplyAssets), uint256(m.totalSupplyShares));
        }

        m.totalSupplyShares += _toUint128(shares);
        m.totalSupplyAssets += _toUint128(assets);
        supplyShares[id][onBehalf] += shares;

        emit Supply(id, msg.sender, onBehalf, assets, shares);

        if (data.length > 0) {
            ISnowballLendSupplyCallback(msg.sender).onSnowballLendSupply(assets, data);
        }

        MarketParams storage params = idToMarketParams[id];
        _safeTransferFrom(params.loanToken, msg.sender, address(this), assets);

        return (assets, shares);
    }

    function withdraw(bytes32 id, uint256 assets, uint256 shares, address onBehalf, address receiver) external returns (uint256, uint256) {
        require(market[id].lastUpdate != 0, "SnowballLend: market not created");
        require(_exactlyOneZero(assets, shares), "SnowballLend: exactly one of assets/shares must be zero");
        require(receiver != address(0), "SnowballLend: zero address");
        require(_isSenderAuthorized(onBehalf), "SnowballLend: not authorized");

        _accrueInterest(id);

        MarketState storage m = market[id];

        if (assets > 0) {
            shares = _toSharesUp(assets, uint256(m.totalSupplyAssets), uint256(m.totalSupplyShares));
        } else {
            assets = _toAssetsDown(shares, uint256(m.totalSupplyAssets), uint256(m.totalSupplyShares));
        }

        supplyShares[id][onBehalf] -= shares;
        m.totalSupplyShares -= _toUint128(shares);
        m.totalSupplyAssets -= _toUint128(assets);

        require(uint256(m.totalSupplyAssets) >= uint256(m.totalBorrowAssets), "SnowballLend: insufficient liquidity");

        emit Withdraw(id, msg.sender, onBehalf, receiver, assets, shares);

        MarketParams storage params = idToMarketParams[id];
        _safeTransfer(params.loanToken, receiver, assets);

        return (assets, shares);
    }

    // ─── Borrow ───

    function borrow(bytes32 id, uint256 assets, uint256 shares, address onBehalf, address receiver) external returns (uint256, uint256) {
        require(market[id].lastUpdate != 0, "SnowballLend: market not created");
        require(_exactlyOneZero(assets, shares), "SnowballLend: exactly one of assets/shares must be zero");
        require(receiver != address(0), "SnowballLend: zero address");
        require(_isSenderAuthorized(onBehalf), "SnowballLend: not authorized");

        _accrueInterest(id);

        MarketState storage m = market[id];

        if (assets > 0) {
            shares = _toSharesUp(assets, uint256(m.totalBorrowAssets), uint256(m.totalBorrowShares));
        } else {
            assets = _toAssetsDown(shares, uint256(m.totalBorrowAssets), uint256(m.totalBorrowShares));
        }

        borrowShares[id][onBehalf] += shares;
        m.totalBorrowShares += _toUint128(shares);
        m.totalBorrowAssets += _toUint128(assets);

        require(_isHealthy(id, onBehalf), "SnowballLend: insufficient collateral");
        require(uint256(m.totalSupplyAssets) >= uint256(m.totalBorrowAssets), "SnowballLend: insufficient liquidity");

        emit Borrow(id, msg.sender, onBehalf, receiver, assets, shares);

        MarketParams storage params = idToMarketParams[id];
        _safeTransfer(params.loanToken, receiver, assets);

        return (assets, shares);
    }

    function repay(bytes32 id, uint256 assets, uint256 shares, address onBehalf, bytes calldata data) external returns (uint256, uint256) {
        require(market[id].lastUpdate != 0, "SnowballLend: market not created");
        require(_exactlyOneZero(assets, shares), "SnowballLend: exactly one of assets/shares must be zero");
        require(onBehalf != address(0), "SnowballLend: zero address");

        _accrueInterest(id);

        MarketState storage m = market[id];

        if (assets > 0) {
            shares = _toSharesDown(assets, uint256(m.totalBorrowAssets), uint256(m.totalBorrowShares));
        } else {
            assets = _toAssetsUp(shares, uint256(m.totalBorrowAssets), uint256(m.totalBorrowShares));
        }

        borrowShares[id][onBehalf] -= shares;
        m.totalBorrowShares -= _toUint128(shares);
        m.totalBorrowAssets -= _toUint128(assets);

        emit Repay(id, msg.sender, onBehalf, assets, shares);

        if (data.length > 0) {
            ISnowballLendRepayCallback(msg.sender).onSnowballLendRepay(assets, data);
        }

        MarketParams storage params = idToMarketParams[id];
        _safeTransferFrom(params.loanToken, msg.sender, address(this), assets);

        return (assets, shares);
    }

    // ─── Collateral ───

    function supplyCollateral(bytes32 id, uint256 assets, address onBehalf, bytes calldata data) external {
        require(market[id].lastUpdate != 0, "SnowballLend: market not created");
        require(assets > 0, "SnowballLend: zero assets");
        require(onBehalf != address(0), "SnowballLend: zero address");

        _accrueInterest(id);

        collateral[id][onBehalf] += assets;

        emit SupplyCollateral(id, msg.sender, onBehalf, assets);

        if (data.length > 0) {
            ISnowballLendSupplyCollateralCallback(msg.sender).onSnowballLendSupplyCollateral(assets, data);
        }

        MarketParams storage params = idToMarketParams[id];
        _safeTransferFrom(params.collateralToken, msg.sender, address(this), assets);
    }

    function withdrawCollateral(bytes32 id, uint256 assets, address onBehalf, address receiver) external {
        require(market[id].lastUpdate != 0, "SnowballLend: market not created");
        require(assets > 0, "SnowballLend: zero assets");
        require(receiver != address(0), "SnowballLend: zero address");
        require(_isSenderAuthorized(onBehalf), "SnowballLend: not authorized");

        _accrueInterest(id);

        collateral[id][onBehalf] -= assets;

        require(_isHealthy(id, onBehalf), "SnowballLend: insufficient collateral");

        emit WithdrawCollateral(id, msg.sender, onBehalf, receiver, assets);

        MarketParams storage params = idToMarketParams[id];
        _safeTransfer(params.collateralToken, receiver, assets);
    }

    // ─── Liquidate ───

    function liquidate(bytes32 id, address borrower, uint256 seizedAssets, uint256 repaidShares, bytes calldata data) external returns (uint256, uint256) {
        require(market[id].lastUpdate != 0, "SnowballLend: market not created");
        require(_exactlyOneZero(seizedAssets, repaidShares), "SnowballLend: exactly one of seizedAssets/repaidShares must be zero");

        _accrueInterest(id);

        require(!_isHealthy(id, borrower), "SnowballLend: borrower is healthy");

        uint256 repaidAssets;

        // Compute amounts in a scoping block to limit stack depth
        {
            MarketParams storage params = idToMarketParams[id];
            uint256 oraclePrice = IOracle(params.oracle).getPrice();
            uint256 incentiveFactor = _min(
                MAX_LIQUIDATION_INCENTIVE_FACTOR,
                _wDivDown(WAD, WAD - _wMulDown(LIQUIDATION_CURSOR, WAD - params.lltv))
            );

            MarketState storage m = market[id];
            if (seizedAssets > 0) {
                repaidAssets = _wDivUp(_mulDivUp(seizedAssets, oraclePrice, ORACLE_PRICE_SCALE), incentiveFactor);
                repaidShares = _toSharesDown(repaidAssets, uint256(m.totalBorrowAssets), uint256(m.totalBorrowShares));
            } else {
                repaidAssets = _toAssetsUp(repaidShares, uint256(m.totalBorrowAssets), uint256(m.totalBorrowShares));
                seizedAssets = _mulDivDown(_wMulDown(repaidAssets, incentiveFactor), ORACLE_PRICE_SCALE, oraclePrice);
            }
        }

        // Update borrower position
        {
            MarketState storage m = market[id];
            borrowShares[id][borrower] -= repaidShares;
            m.totalBorrowShares -= _toUint128(repaidShares);
            m.totalBorrowAssets = _toUint128(_zeroFloorSub(uint256(m.totalBorrowAssets), repaidAssets));
            collateral[id][borrower] -= seizedAssets;
        }

        // Bad debt handling
        uint256 badDebtAssets;
        uint256 badDebtShares;
        {
            MarketState storage m = market[id];
            if (collateral[id][borrower] == 0 && borrowShares[id][borrower] > 0) {
                badDebtShares = borrowShares[id][borrower];
                badDebtAssets = _toAssetsUp(badDebtShares, uint256(m.totalBorrowAssets), uint256(m.totalBorrowShares));
                m.totalBorrowAssets -= _toUint128(badDebtAssets);
                m.totalBorrowShares -= _toUint128(badDebtShares);
                m.totalSupplyAssets -= _toUint128(badDebtAssets);
                borrowShares[id][borrower] = 0;
            }
        }

        emit Liquidate(id, msg.sender, borrower, repaidAssets, repaidShares, seizedAssets, badDebtAssets, badDebtShares);

        if (data.length > 0) {
            ISnowballLendLiquidateCallback(msg.sender).onSnowballLendLiquidate(repaidAssets, data);
        }

        // Token transfers
        {
            MarketParams storage params = idToMarketParams[id];
            _safeTransfer(params.collateralToken, msg.sender, seizedAssets);
            _safeTransferFrom(params.loanToken, msg.sender, address(this), repaidAssets);
        }

        return (seizedAssets, repaidShares);
    }
}
