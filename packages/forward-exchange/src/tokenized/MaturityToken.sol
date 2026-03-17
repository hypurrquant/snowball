// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {IMaturityToken} from "./interfaces/IMaturityToken.sol";
import {IEscrowVault} from "./interfaces/IEscrowVault.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title MaturityToken
/// @notice ERC-20 maturity token representing one side of a forward (fToken or sfToken)
/// @dev 18 decimals. Settlement: fKRW = S_T/F_0, sfKRW = 2 - S_T/F_0 (in USDC)
contract MaturityToken is IMaturityToken, ERC20, AccessControl, ReentrancyGuard {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant SETTLER_ROLE = keccak256("SETTLER_ROLE");

    /// @notice Market identifier (e.g., keccak256("USD/KRW"))
    bytes32 public immutable MARKET_ID;
    /// @notice Unix timestamp of maturity
    uint256 public immutable MATURITY_TIME;
    /// @notice Forward rate locked at series creation (18 decimals)
    int256 public immutable FORWARD_RATE;
    /// @notice True = fToken (Long), False = sfToken (Short)
    bool public immutable IS_LONG;
    /// @notice Series ID for escrow tracking
    bytes32 public immutable SERIES_ID;

    IEscrowVault public immutable ESCROW_VAULT;

    /// @notice Paired counterpart token address
    address public counterpart;
    /// @notice Whether this token has been settled
    bool public isSettled;
    /// @notice USDC per token after settlement (6 decimals)
    uint256 public redemptionRate;

    constructor(
        string memory name_,
        string memory symbol_,
        bytes32 marketId_,
        uint256 maturityTime_,
        int256 forwardRate_,
        bool isLong_,
        bytes32 seriesId_,
        address escrowVault_,
        address factory_
    ) ERC20(name_, symbol_) {
        MARKET_ID = marketId_;
        MATURITY_TIME = maturityTime_;
        FORWARD_RATE = forwardRate_;
        IS_LONG = isLong_;
        SERIES_ID = seriesId_;
        ESCROW_VAULT = IEscrowVault(escrowVault_);

        _grantRole(DEFAULT_ADMIN_ROLE, factory_);
        _grantRole(MINTER_ROLE, factory_);
        _grantRole(SETTLER_ROLE, factory_);
    }

    /// @inheritdoc IMaturityToken
    function mint(address to, uint256 amount) external override onlyRole(MINTER_ROLE) {
        if (to == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();
        _mint(to, amount);
    }

    /// @inheritdoc IMaturityToken
    function settle(int256 settlementRate) external override onlyRole(SETTLER_ROLE) {
        if (isSettled) revert AlreadySettled();

        // Calculate redemption rate in USDC (6 decimals) per token (18 decimals)
        // fToken: redemptionRate = S_T / F_0 (in USDC per token)  — linear payoff
        // sfToken: redemptionRate = 2 - S_T / F_0
        // Both rates are WAD-scaled (18 dec), then converted to 6 dec USDC
        //
        // F_0 and S_T are both 18 decimals.
        // ratio = S_T * 1e18 / F_0 (WAD-scaled ratio)
        // fToken redemption = ratio * 1e6 / 1e18 (convert WAD to USDC 6dec)
        // sfToken redemption = (2e18 - ratio) * 1e6 / 1e18

        uint256 absForward = FORWARD_RATE > 0 ? uint256(FORWARD_RATE) : uint256(-FORWARD_RATE);
        uint256 absSettlement = settlementRate > 0 ? uint256(settlementRate) : uint256(-settlementRate);

        // ratio = S_T / F_0 in WAD (flipped: linear payoff)
        uint256 ratio = absSettlement * 1e18 / absForward;

        // Sanity check: settlement rate must be positive and ratio must be within 10x the forward rate
        require(absSettlement > 0 && ratio <= 10e18, "implausible rate");

        if (IS_LONG) {
            // fToken redemption rate = ratio (WAD) → USDC 6dec
            // Cap at 2 USDC (when S_T > 2 × F_0)
            if (ratio >= 2e18) {
                redemptionRate = 2e6;
            } else {
                redemptionRate = ratio * 1e6 / 1e18;
            }
        } else {
            // sfToken redemption rate = (2 - ratio) (WAD) → USDC 6dec
            // If ratio >= 2e18, sfToken is worthless (capped at 0)
            if (ratio >= 2e18) {
                redemptionRate = 0;
            } else {
                redemptionRate = (2e18 - ratio) * 1e6 / 1e18;
            }
        }

        isSettled = true;
        emit Settled(settlementRate, redemptionRate);
    }

    /// @inheritdoc IMaturityToken
    function redeem(uint256 amount) external override nonReentrant {
        if (!isSettled) revert NotSettled();
        if (amount == 0) revert ZeroAmount();
        if (balanceOf(msg.sender) < amount) revert NothingToRedeem();

        // Calculate USDC payout: amount (18dec) * redemptionRate (6dec) / 1e18
        uint256 usdcPayout = amount * redemptionRate / 1e18;
        require(usdcPayout > 0, "Payout rounds to zero");

        // Burn tokens first
        _burn(msg.sender, amount);

        // Release from escrow if payout > 0
        if (usdcPayout > 0) {
            ESCROW_VAULT.releaseToUser(SERIES_ID, msg.sender, usdcPayout);
        }

        emit Redeemed(msg.sender, amount, usdcPayout);
    }

    /// @inheritdoc IMaturityToken
    function setCounterpart(address counterpart_) external override onlyRole(MINTER_ROLE) {
        require(counterpart == address(0), "counterpart already set");
        if (counterpart_ == address(0)) revert ZeroAddress();
        counterpart = counterpart_;
        emit CounterpartSet(counterpart_);
    }
}
