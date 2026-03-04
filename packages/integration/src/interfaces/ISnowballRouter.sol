// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/// @title ISnowballRouter - Cross-protocol router interface
interface ISnowballRouter {
    struct BorrowParams {
        address borrowerOps;
        address collToken;
        address debtToken;      // sbUSD address for balance measurement
        uint256 collAmount;
        uint256 debtAmount;
        uint256 maxUpfrontFee;
        uint256 annualInterestRate;
        uint256 troveIndex;
        uint256 upperHint;      // uint256 (not address) to match Liquity V2
        uint256 lowerHint;
    }

    struct MorphoSupplyParams {
        address morpho;
        address loanToken;
        address collateralToken;
        address oracle;
        address irm;
        uint256 lltv;
        uint256 amount;
    }

    struct SwapParams {
        address router;
        address tokenIn;
        address tokenOut;
        uint24 fee;
        uint256 amountIn;
        uint256 amountOutMinimum;
        uint256 deadline;       // explicit deadline for MEV protection
    }

    enum ActionType {
        BORROW,
        SUPPLY_MORPHO,
        DEPOSIT_VAULT,
        SWAP
        // TRANSFER removed: was exploitable (arbitrary recipient)
    }

    function borrowAndSupply(BorrowParams calldata bp, MorphoSupplyParams calldata mp) external;
    function borrowAndDeposit(BorrowParams calldata bp, address vault) external;
    function borrowSwapAndSupply(BorrowParams calldata bp, SwapParams calldata sp, MorphoSupplyParams calldata mp) external;
    function execute(ActionType[] calldata actions, bytes[] calldata data) external;
}
