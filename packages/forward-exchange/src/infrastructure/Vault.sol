// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {IVault} from "../interfaces/IVault.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

/// @title Vault
/// @notice Manages USDC collateral for all financial primitives
/// @dev Uses internal bookkeeping with pull-payment pattern. UUPS upgradeable.
contract Vault is Initializable, AccessControlUpgradeable, ReentrancyGuard, PausableUpgradeable, UUPSUpgradeable, IVault {
    using SafeERC20 for IERC20;

    /// @notice Role for contracts that can lock/unlock/settle collateral
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant MARKETPLACE_ROLE = keccak256("MARKETPLACE_ROLE");

    /// @notice The collateral token (USDC)
    IERC20 public COLLATERAL_TOKEN;

    /// @notice Free (unlocked) balance per user
    mapping(address => uint256) private _freeBalance;

    /// @notice Total locked balance per user
    mapping(address => uint256) private _lockedBalance;

    /// @notice Collateral locked per position
    mapping(uint256 => uint256) private _positionCollateral;

    /// @notice Owner of collateral for each position
    mapping(uint256 => address) private _positionOwner;

    // Errors
    error ZeroAmount();
    error ZeroAddress();
    error InsufficientFreeBalance(address user, uint256 requested, uint256 available);
    error InsufficientPositionCollateral(uint256 positionId, uint256 requested, uint256 available);
    error PositionCollateralMismatch(uint256 positionId);
    error PnlExceedsCollateral(uint256 pnl, uint256 available);

    // Events
    event Deposited(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
    event CollateralLocked(address indexed user, uint256 indexed positionId, uint256 amount);
    event CollateralUnlocked(address indexed user, uint256 indexed positionId, uint256 amount);
    event PositionSettled(
        uint256 indexed positionId,
        address indexed winner,
        address indexed loser,
        uint256 pnl
    );

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /// @notice Initializes the vault (replaces constructor for upgradeable pattern)
    /// @param _collateralToken The address of the collateral token (USDC)
    /// @param _admin The address of the admin
    function initialize(address _collateralToken, address _admin) external initializer {
        if (_collateralToken == address(0) || _admin == address(0)) revert ZeroAddress();

        __AccessControl_init();

        __Pausable_init();

        COLLATERAL_TOKEN = IERC20(_collateralToken);
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(PAUSER_ROLE, _admin);
    }

    /// @dev Authorizes contract upgrades, restricted to admin
    function _authorizeUpgrade(address) internal override onlyRole(DEFAULT_ADMIN_ROLE) {}

    /// @inheritdoc IVault
    function deposit(uint256 amount) external override nonReentrant whenNotPaused {
        if (amount == 0) revert ZeroAmount();

        // CEI: update state before external call
        _freeBalance[msg.sender] += amount;

        // Transfer tokens in (defensive: check actual received amount)
        uint256 balanceBefore = COLLATERAL_TOKEN.balanceOf(address(this));
        COLLATERAL_TOKEN.safeTransferFrom(msg.sender, address(this), amount);
        uint256 received = COLLATERAL_TOKEN.balanceOf(address(this)) - balanceBefore;

        // Adjust if fee-on-transfer (USDC doesn't have this, but defensive coding)
        if (received < amount) {
            _freeBalance[msg.sender] -= (amount - received);
        }

        emit Deposited(msg.sender, received);
    }

    /// @inheritdoc IVault
    function withdraw(uint256 amount) external override nonReentrant whenNotPaused {
        if (amount == 0) revert ZeroAmount();

        uint256 free = _freeBalance[msg.sender];
        if (amount > free) revert InsufficientFreeBalance(msg.sender, amount, free);

        // CEI: update state before external call
        _freeBalance[msg.sender] = free - amount;

        COLLATERAL_TOKEN.safeTransfer(msg.sender, amount);

        emit Withdrawn(msg.sender, amount);
    }

    /// @inheritdoc IVault
    function lockCollateral(
        address user,
        uint256 positionId,
        uint256 amount
    ) external override onlyRole(OPERATOR_ROLE) whenNotPaused {
        if (amount == 0) revert ZeroAmount();
        if (user == address(0)) revert ZeroAddress();

        uint256 free = _freeBalance[user];
        if (amount > free) revert InsufficientFreeBalance(user, amount, free);

        _freeBalance[user] = free - amount;
        _lockedBalance[user] += amount;
        _positionCollateral[positionId] += amount;
        _positionOwner[positionId] = user;

        emit CollateralLocked(user, positionId, amount);
    }

    /// @inheritdoc IVault
    function unlockCollateral(
        address user,
        uint256 positionId,
        uint256 amount
    ) external override onlyRole(OPERATOR_ROLE) whenNotPaused {
        if (amount == 0) revert ZeroAmount();

        uint256 posCol = _positionCollateral[positionId];
        if (amount > posCol) revert InsufficientPositionCollateral(positionId, amount, posCol);

        _positionCollateral[positionId] = posCol - amount;
        _lockedBalance[user] -= amount;
        _freeBalance[user] += amount;

        emit CollateralUnlocked(user, positionId, amount);
    }

    /// @inheritdoc IVault
    function settlePosition(
        uint256 positionId,
        address winner,
        address loser,
        uint256 pnl
    ) external override onlyRole(OPERATOR_ROLE) nonReentrant whenNotPaused {
        if (winner == address(0) || loser == address(0)) revert ZeroAddress();

        uint256 loserCollateral = _positionCollateral[positionId];
        uint256 pairedId = _getPairedId(positionId);
        uint256 winnerCollateral = _positionCollateral[pairedId];

        if (pnl > loserCollateral) {
            pnl = loserCollateral;
        }

        // Fix #2: Use winner/loser (current NFT owners) directly for locked-balance accounting,
        // removing the stale _positionOwner dependency that breaks after NFT trades.
        // Clear position collateral
        _positionCollateral[pairedId] = 0;
        _positionCollateral[positionId] = 0;

        // Reduce locked balance of current position holders and credit settlement proceeds
        _lockedBalance[winner] -= winnerCollateral;
        _lockedBalance[loser] -= loserCollateral;

        _freeBalance[winner] += winnerCollateral + pnl;
        _freeBalance[loser] += loserCollateral - pnl;

        emit PositionSettled(positionId, winner, loser, pnl);
    }

    /// @inheritdoc IVault
    function internalTransfer(
        address from,
        address to,
        uint256 amount
    ) external override onlyRole(MARKETPLACE_ROLE) nonReentrant whenNotPaused {
        if (amount == 0) revert ZeroAmount();
        if (from == address(0) || to == address(0)) revert ZeroAddress();

        uint256 free = _freeBalance[from];
        if (amount > free) revert InsufficientFreeBalance(from, amount, free);

        _freeBalance[from] = free - amount;
        _freeBalance[to] += amount;

        emit InternalTransfer(from, to, amount);
    }

    // ─── Views ───────────────────────────────────────────────────────────

    /// @inheritdoc IVault
    function freeBalance(address user) external view override returns (uint256) {
        return _freeBalance[user];
    }

    /// @inheritdoc IVault
    function lockedBalance(address user) external view override returns (uint256) {
        return _lockedBalance[user];
    }

    /// @inheritdoc IVault
    function positionCollateral(uint256 positionId) external view override returns (uint256) {
        return _positionCollateral[positionId];
    }

    // ─── Admin ───────────────────────────────────────────────────────────

    /// @notice Pause the vault (emergency)
    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    /// @notice Unpause the vault
    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    // ─── Internal ────────────────────────────────────────────────────────

    /// @dev Get the paired position ID (Long ↔ Short)
    /// @dev Long = even IDs (2,4,6...), Short = odd IDs (3,5,7...)
    /// Pair: (2,3), (4,5), (6,7), etc.
    function _getPairedId(uint256 tokenId) internal pure returns (uint256) {
        if (tokenId % 2 == 0) {
            return tokenId + 1; // Long → Short
        } else {
            return tokenId - 1; // Short → Long
        }
    }
}
