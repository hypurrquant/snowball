// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ISnowballRouter} from "../interfaces/ISnowballRouter.sol";

// ─── Local interface definitions (no cross-package imports) ──────

interface IBorrowerOps {
    function openTrove(
        address _owner,
        uint256 _ownerIndex,
        uint256 _collAmount,
        uint256 _boldAmount,
        uint256 _upperHint,
        uint256 _lowerHint,
        uint256 _annualInterestRate,
        uint256 _maxUpfrontFee,
        address _addManager,
        address _removeManager,
        address _receiver
    ) external returns (uint256);
}

interface IMorphoBlue {
    struct MarketParams {
        address loanToken;
        address collateralToken;
        address oracle;
        address irm;
        uint256 lltv;
    }

    function supply(
        MarketParams memory marketParams,
        uint256 assets,
        uint256 shares,
        address onBehalf,
        bytes memory data
    ) external returns (uint256, uint256);
}

interface ISwapRouter {
    struct ExactInputSingleParams {
        address tokenIn;
        address tokenOut;
        uint24 fee;
        address recipient;
        uint256 deadline;
        uint256 amountIn;
        uint256 amountOutMinimum;
        uint160 sqrtPriceLimitX96;
    }

    function exactInputSingle(
        ExactInputSingleParams calldata params
    ) external payable returns (uint256 amountOut);
}

interface IERC4626 {
    function deposit(uint256 assets, address receiver) external returns (uint256 shares);
    function asset() external view returns (address);
}

/// @title SnowballRouter - Cross-protocol 1-click execution
/// @notice Combines Liquity borrow → Morpho supply / Vault deposit / DEX swap
///         in single transactions. All output assets go to the user (msg.sender).
/// @dev Security: whitelisted external addresses, actual balance measurement,
///      explicit deadlines, approval cleanup, no arbitrary TRANSFER action.
contract SnowballRouter is ISnowballRouter, ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    /// @notice Whitelisted protocol addresses (BorrowerOps, Morpho, SwapRouter, Vault).
    mapping(address => bool) public whitelisted;
    /// @notice Whitelisted debt tokens that may be borrowed via _borrow().
    mapping(address => bool) public whitelistedTokens;

    event Whitelisted(address indexed addr, bool status);
    event TokenWhitelisted(address indexed token, bool status);
    event Borrowed(address indexed user, address collToken, uint256 collAmount, uint256 debtReceived);
    event SuppliedMorpho(address indexed user, address morpho, uint256 amount);
    event DepositedVault(address indexed user, address vault, uint256 amount, uint256 shares);
    event Swapped(address indexed user, address tokenIn, address tokenOut, uint256 amountIn, uint256 amountOut);

    constructor() Ownable(msg.sender) {}

    /// @notice Add/remove an address from the whitelist (BorrowerOps, Morpho, SwapRouter, Vault).
    function setWhitelist(address addr, bool status) external onlyOwner {
        whitelisted[addr] = status;
        emit Whitelisted(addr, status);
    }

    /// @notice Add/remove a token from the debt token whitelist.
    function setTokenWhitelist(address token, bool status) external onlyOwner {
        whitelistedTokens[token] = status;
        emit TokenWhitelisted(token, status);
    }

    modifier onlyWhitelisted(address addr) {
        require(whitelisted[addr], "Router: not whitelisted");
        _;
    }

    /// @notice Borrow sbUSD from Liquity, then supply to Morpho.
    function borrowAndSupply(
        BorrowParams calldata bp,
        MorphoSupplyParams calldata mp
    ) external nonReentrant {
        address user = msg.sender;
        uint256 balBeforeColl = IERC20(bp.collToken).balanceOf(address(this));
        uint256 balBeforeDebt = IERC20(bp.debtToken).balanceOf(address(this));
        uint256 debtReceived = _borrow(bp, user);
        _supplyMorpho(mp, debtReceived, user);
        _returnDust(bp, mp.loanToken, user, balBeforeColl, balBeforeDebt);
    }

    /// @notice Borrow sbUSD from Liquity, then deposit into ERC-4626 vault.
    function borrowAndDeposit(
        BorrowParams calldata bp,
        address vault
    ) external nonReentrant onlyWhitelisted(vault) {
        address user = msg.sender;
        uint256 balBeforeColl = IERC20(bp.collToken).balanceOf(address(this));
        uint256 balBeforeDebt = IERC20(bp.debtToken).balanceOf(address(this));
        uint256 debtReceived = _borrow(bp, user);
        _depositVault(vault, debtReceived, user);
        address vaultAsset = IERC4626(vault).asset();
        _returnDust(bp, vaultAsset, user, balBeforeColl, balBeforeDebt);
    }

    /// @notice Borrow sbUSD → swap → supply to Morpho.
    function borrowSwapAndSupply(
        BorrowParams calldata bp,
        SwapParams calldata sp,
        MorphoSupplyParams calldata mp
    ) external nonReentrant {
        address user = msg.sender;
        uint256 balBeforeColl = IERC20(bp.collToken).balanceOf(address(this));
        uint256 balBeforeDebt = IERC20(bp.debtToken).balanceOf(address(this));
        uint256 balBeforeTokenOut = IERC20(sp.tokenOut).balanceOf(address(this));
        uint256 debtReceived = _borrow(bp, user);
        uint256 swapped = _swap(sp, debtReceived);
        _supplyMorpho(mp, swapped, user);
        _returnDust(bp, mp.loanToken, user, balBeforeColl, balBeforeDebt);
        _returnDustToken(sp.tokenOut, user, balBeforeTokenOut);
    }

    /// @notice Generic batch execution of multiple actions.
    /// @dev TRANSFER action removed for security. All dust returns to msg.sender.
    function execute(
        ActionType[] calldata actions,
        bytes[] calldata data
    ) external nonReentrant {
        require(actions.length == data.length, "Router: length mismatch");
        address user = msg.sender;

        for (uint256 i; i < actions.length; ++i) {
            if (actions[i] == ActionType.BORROW) {
                BorrowParams memory bp = abi.decode(data[i], (BorrowParams));
                _borrow(bp, user);
            } else if (actions[i] == ActionType.SUPPLY_MORPHO) {
                (MorphoSupplyParams memory mp, uint256 amount) = abi.decode(
                    data[i], (MorphoSupplyParams, uint256)
                );
                _supplyMorpho(mp, amount, user);
            } else if (actions[i] == ActionType.DEPOSIT_VAULT) {
                (address vault, uint256 amount) = abi.decode(
                    data[i], (address, uint256)
                );
                _depositVault(vault, amount, user);
            } else if (actions[i] == ActionType.SWAP) {
                (SwapParams memory sp, uint256 amount) = abi.decode(
                    data[i], (SwapParams, uint256)
                );
                _swap(sp, amount);
            }
        }
    }

    // ─── Internal actions ────────────────────────────────

    function _borrow(BorrowParams memory bp, address user)
        internal
        onlyWhitelisted(bp.borrowerOps)
        returns (uint256)
    {
        require(whitelistedTokens[bp.debtToken], "Router: debtToken not whitelisted");

        // Pull collateral from user
        IERC20(bp.collToken).safeTransferFrom(user, address(this), bp.collAmount);
        IERC20(bp.collToken).forceApprove(bp.borrowerOps, bp.collAmount);

        // Measure actual debt token received (handles upfront fees)
        uint256 balBefore = IERC20(bp.debtToken).balanceOf(address(this));

        IBorrowerOps(bp.borrowerOps).openTrove(
            user,               // _owner
            bp.troveIndex,      // _ownerIndex
            bp.collAmount,      // _collAmount
            bp.debtAmount,      // _boldAmount
            bp.upperHint,       // _upperHint (uint256)
            bp.lowerHint,       // _lowerHint (uint256)
            bp.annualInterestRate,
            bp.maxUpfrontFee,
            address(0),         // _addManager
            address(0),         // _removeManager
            address(this)       // _receiver (sbUSD comes here)
        );

        // Clear residual approval
        IERC20(bp.collToken).forceApprove(bp.borrowerOps, 0);

        uint256 balAfter = IERC20(bp.debtToken).balanceOf(address(this));
        uint256 received = balAfter - balBefore;
        require(received > 0, "Router: no debt received");

        emit Borrowed(user, bp.collToken, bp.collAmount, received);
        return received;
    }

    function _supplyMorpho(MorphoSupplyParams memory mp, uint256 amount, address user)
        internal
        onlyWhitelisted(mp.morpho)
    {
        IERC20(mp.loanToken).forceApprove(mp.morpho, amount);

        IMorphoBlue.MarketParams memory marketParams = IMorphoBlue.MarketParams({
            loanToken: mp.loanToken,
            collateralToken: mp.collateralToken,
            oracle: mp.oracle,
            irm: mp.irm,
            lltv: mp.lltv
        });

        // Supply on behalf of user — shares go to user directly
        IMorphoBlue(mp.morpho).supply(marketParams, amount, 0, user, "");

        // Clear residual approval
        IERC20(mp.loanToken).forceApprove(mp.morpho, 0);

        emit SuppliedMorpho(user, mp.morpho, amount);
    }

    function _depositVault(address vault, uint256 amount, address user)
        internal
        onlyWhitelisted(vault)
    {
        address vaultAsset = IERC4626(vault).asset();
        IERC20(vaultAsset).forceApprove(vault, amount);

        uint256 shares = IERC4626(vault).deposit(amount, user);
        require(shares > 0, "Router: no vault shares");

        // Clear residual approval
        IERC20(vaultAsset).forceApprove(vault, 0);

        emit DepositedVault(user, vault, amount, shares);
    }

    function _swap(SwapParams memory sp, uint256 amount)
        internal
        onlyWhitelisted(sp.router)
        returns (uint256)
    {
        require(sp.deadline >= block.timestamp, "Router: expired deadline");

        IERC20(sp.tokenIn).forceApprove(sp.router, amount);
        uint256 amountOut = ISwapRouter(sp.router).exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: sp.tokenIn,
                tokenOut: sp.tokenOut,
                fee: sp.fee,
                recipient: address(this),
                deadline: sp.deadline,
                amountIn: amount,
                amountOutMinimum: sp.amountOutMinimum,
                sqrtPriceLimitX96: 0
            })
        );

        // Clear residual approval
        IERC20(sp.tokenIn).forceApprove(sp.router, 0);

        emit Swapped(msg.sender, sp.tokenIn, sp.tokenOut, amount, amountOut);
        return amountOut;
    }

    /// @dev Return any leftover collateral and debt tokens to user.
    ///      balBeforeColl / balBeforeDebt are snapshots taken before the borrow operation.
    function _returnDust(
        BorrowParams memory bp,
        address debtToken,
        address user,
        uint256 balBeforeColl,
        uint256 balBeforeDebt
    ) internal {
        _returnDustToken(bp.collToken, user, balBeforeColl);
        _returnDustToken(debtToken, user, balBeforeDebt);
    }

    /// @dev Transfer only the tokens received during this transaction (balance delta) back to user.
    function _returnDustToken(address token, address user, uint256 balBefore) internal {
        uint256 balAfter = IERC20(token).balanceOf(address(this));
        if (balAfter > balBefore) {
            IERC20(token).safeTransfer(user, balAfter - balBefore);
        }
    }
}
