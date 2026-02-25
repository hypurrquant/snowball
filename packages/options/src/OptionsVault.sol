// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Initializable} from "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts/proxy/utils/UUPSUpgradeable.sol";
import {IOptionsVault} from "./interfaces/IOptionsVault.sol";

/// @title OptionsVault
/// @notice LP pool that acts as counterparty for unmatched options orders (native CTC)
contract OptionsVault is
    Initializable,
    UUPSUpgradeable,
    IOptionsVault
{
    bytes32 public constant ENGINE_ROLE = keccak256("ENGINE_ROLE");
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    uint256 public constant WITHDRAW_DELAY = 24 hours;

    uint256 public totalShares;
    uint256 public totalDeposited;
    uint256 public lockedCollateral;

    mapping(address => uint256) private _shares;
    mapping(address => uint256) private _pendingWithdrawShares;
    mapping(address => uint256) private _withdrawUnlockTime;

    address private _admin;
    mapping(bytes32 => mapping(address => bool)) private _roles;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address admin) external initializer {
        _admin = admin;
        _roles[ADMIN_ROLE][admin] = true;
    }

    modifier onlyRole(bytes32 role) {
        require(_roles[role][msg.sender], "Vault: unauthorized");
        _;
    }

    modifier onlyAdmin() {
        require(msg.sender == _admin, "Vault: not admin");
        _;
    }

    function grantRole(bytes32 role, address account) external onlyAdmin {
        _roles[role][account] = true;
    }

    function revokeRole(bytes32 role, address account) external onlyAdmin {
        _roles[role][account] = false;
    }

    function hasRole(bytes32 role, address account) external view returns (bool) {
        return _roles[role][account];
    }

    // ─── LP Operations ───

    function deposit() external payable {
        require(msg.value > 0, "Vault: zero deposit");
        uint256 shares;
        if (totalShares == 0 || totalDeposited == 0) {
            shares = msg.value;
        } else {
            shares = (msg.value * totalShares) / totalDeposited;
        }
        _shares[msg.sender] += shares;
        totalShares += shares;
        totalDeposited += msg.value;
        emit LPDeposited(msg.sender, msg.value, shares);
    }

    function requestWithdraw(uint256 shares) external {
        require(_shares[msg.sender] >= shares, "Vault: insufficient shares");
        require(shares > 0, "Vault: zero shares");
        _pendingWithdrawShares[msg.sender] = shares;
        _withdrawUnlockTime[msg.sender] = block.timestamp + WITHDRAW_DELAY;
        emit WithdrawRequested(msg.sender, shares, _withdrawUnlockTime[msg.sender]);
    }

    function executeWithdraw() external {
        uint256 shares = _pendingWithdrawShares[msg.sender];
        require(shares > 0, "Vault: no pending withdrawal");
        require(block.timestamp >= _withdrawUnlockTime[msg.sender], "Vault: withdrawal locked");

        uint256 amount = (shares * totalDeposited) / totalShares;
        require(amount <= availableLiquidity(), "Vault: insufficient liquidity");

        _shares[msg.sender] -= shares;
        totalShares -= shares;
        totalDeposited -= amount;
        _pendingWithdrawShares[msg.sender] = 0;
        _withdrawUnlockTime[msg.sender] = 0;

        (bool ok, ) = msg.sender.call{value: amount}("");
        require(ok, "Vault: transfer failed");
        emit WithdrawExecuted(msg.sender, amount, shares);
    }

    function sharesOf(address lp) external view returns (uint256) {
        return _shares[lp];
    }

    function availableLiquidity() public view returns (uint256) {
        return totalDeposited - lockedCollateral;
    }

    function pendingWithdrawShares(address lp) external view returns (uint256) {
        return _pendingWithdrawShares[lp];
    }

    function withdrawUnlockTime(address lp) external view returns (uint256) {
        return _withdrawUnlockTime[lp];
    }

    // ─── Engine Operations (SnowballOptions only) ───

    function lockCollateral(uint256 amount) external onlyRole(ENGINE_ROLE) {
        require(amount <= availableLiquidity(), "Vault: insufficient liquidity");
        lockedCollateral += amount;
        emit CollateralLocked(amount);
    }

    function releaseCollateral(uint256 amount) external onlyRole(ENGINE_ROLE) {
        require(amount <= lockedCollateral, "Vault: insufficient locked collateral");
        lockedCollateral -= amount;
        emit CollateralReleased(amount);
    }

    function payWinner(address winner, uint256 amount) external onlyRole(ENGINE_ROLE) {
        require(amount <= lockedCollateral, "Vault: insufficient locked collateral");
        lockedCollateral -= amount;
        totalDeposited -= amount;
        (bool ok, ) = winner.call{value: amount}("");
        require(ok, "Vault: transfer failed");
        emit WinnerPaid(winner, amount);
    }

    function receiveWinnings() external payable onlyRole(ENGINE_ROLE) {
        totalDeposited += msg.value;
        emit WinningsReceived(msg.value);
    }

    // ─── UUPS ───

    function _authorizeUpgrade(address) internal view override {
        require(msg.sender == _admin, "Vault: not admin");
    }
}
