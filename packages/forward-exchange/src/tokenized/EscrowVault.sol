// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {IEscrowVault} from "./interfaces/IEscrowVault.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @title EscrowVault
/// @notice Holds USDC escrow for tokenized forward series. Only Factory can deposit/release.
contract EscrowVault is IEscrowVault, AccessControl, ReentrancyGuard {
    using SafeERC20 for IERC20;

    bytes32 public constant FACTORY_ROLE = keccak256("FACTORY_ROLE");

    IERC20 public immutable USDC;

    /// @notice USDC balance per series
    mapping(bytes32 => uint256) private _seriesBalance;
    uint256 private _totalEscrowed;

    /// @notice Tracks which FACTORY_ROLE addresses are authorized to release for a given series
    mapping(bytes32 => mapping(address => bool)) public seriesAuthorized;

    constructor(address _usdc, address _admin) {
        if (_usdc == address(0) || _admin == address(0)) revert ZeroAddress();
        USDC = IERC20(_usdc);
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
    }

    /// @notice Grant a FACTORY_ROLE address release rights for a specific series
    function authorizeForSeries(bytes32 seriesId, address token) external {
        require(
            hasRole(DEFAULT_ADMIN_ROLE, msg.sender) || hasRole(FACTORY_ROLE, msg.sender),
            "EscrowVault: caller is not admin or factory"
        );
        seriesAuthorized[seriesId][token] = true;
    }

    /// @inheritdoc IEscrowVault
    function depositFor(bytes32 seriesId, uint256 amount) external override onlyRole(FACTORY_ROLE) nonReentrant {
        if (amount == 0) revert ZeroAmount();

        _seriesBalance[seriesId] += amount;
        _totalEscrowed += amount;

        USDC.safeTransferFrom(msg.sender, address(this), amount);

        emit Deposited(seriesId, amount);
    }

    /// @inheritdoc IEscrowVault
    function releaseToUser(
        bytes32 seriesId,
        address user,
        uint256 amount
    ) external override onlyRole(FACTORY_ROLE) nonReentrant {
        require(seriesAuthorized[seriesId][msg.sender], "not authorized for series");
        if (amount == 0) revert ZeroAmount();
        if (user == address(0)) revert ZeroAddress();

        uint256 bal = _seriesBalance[seriesId];
        if (amount > bal) revert InsufficientBalance(seriesId, amount, bal);

        _seriesBalance[seriesId] = bal - amount;
        _totalEscrowed -= amount;

        USDC.safeTransfer(user, amount);

        emit ReleasedToUser(user, amount);
    }

    /// @inheritdoc IEscrowVault
    function releaseToFactory(bytes32 seriesId, uint256 amount) external override onlyRole(FACTORY_ROLE) nonReentrant {
        require(seriesAuthorized[seriesId][msg.sender], "not authorized for series");
        if (amount == 0) revert ZeroAmount();

        uint256 bal = _seriesBalance[seriesId];
        if (amount > bal) revert InsufficientBalance(seriesId, amount, bal);

        _seriesBalance[seriesId] = bal - amount;
        _totalEscrowed -= amount;

        USDC.safeTransfer(msg.sender, amount);

        emit ReleasedToFactory(amount);
    }

    /// @inheritdoc IEscrowVault
    function seriesBalance(bytes32 seriesId) external view override returns (uint256) {
        return _seriesBalance[seriesId];
    }

    /// @inheritdoc IEscrowVault
    function totalEscrowed() external view override returns (uint256) {
        return _totalEscrowed;
    }
}
