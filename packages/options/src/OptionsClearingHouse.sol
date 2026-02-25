// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Initializable} from "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts/proxy/utils/UUPSUpgradeable.sol";
import {IOptionsClearingHouse} from "./interfaces/IOptionsClearingHouse.sol";

/// @title OptionsClearingHouse
/// @notice Manages user CDP balances and escrow for the options protocol (native CTC)
contract OptionsClearingHouse is
    Initializable,
    UUPSUpgradeable,
    IOptionsClearingHouse
{
    bytes32 public constant PRODUCT_ROLE = keccak256("PRODUCT_ROLE");
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    mapping(address => uint256) private _balances;
    mapping(address => uint256) private _escrows;
    uint256 public accumulatedFees;

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
        require(_roles[role][msg.sender], "ClearingHouse: unauthorized");
        _;
    }

    modifier onlyAdmin() {
        require(msg.sender == _admin, "ClearingHouse: not admin");
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

    // ─── User Operations ───

    function deposit() external payable {
        require(msg.value > 0, "ClearingHouse: zero deposit");
        _balances[msg.sender] += msg.value;
        emit Deposited(msg.sender, msg.value);
    }

    function withdraw(uint256 amount) external {
        require(_balances[msg.sender] >= amount, "ClearingHouse: insufficient balance");
        _balances[msg.sender] -= amount;
        (bool ok, ) = msg.sender.call{value: amount}("");
        require(ok, "ClearingHouse: transfer failed");
        emit Withdrawn(msg.sender, amount);
    }

    function balanceOf(address user) external view returns (uint256) {
        return _balances[user];
    }

    function escrowOf(address user) external view returns (uint256) {
        return _escrows[user];
    }

    // ─── Product Operations (SnowballOptions only) ───

    function lockInEscrow(address user, uint256 amount) external onlyRole(PRODUCT_ROLE) {
        require(_balances[user] >= amount, "ClearingHouse: insufficient balance for escrow");
        _balances[user] -= amount;
        _escrows[user] += amount;
        emit EscrowLocked(user, amount);
    }

    function releaseFromEscrow(address user, uint256 amount) external onlyRole(PRODUCT_ROLE) {
        require(_escrows[user] >= amount, "ClearingHouse: insufficient escrow");
        _escrows[user] -= amount;
        _balances[user] += amount;
        emit EscrowReleased(user, amount);
    }

    function settleEscrow(address from, address to, uint256 amount) external onlyRole(PRODUCT_ROLE) {
        require(_escrows[from] >= amount, "ClearingHouse: insufficient escrow");
        _escrows[from] -= amount;
        _balances[to] += amount;
        emit EscrowSettled(from, amount, to);
    }

    function collectFee(address from, uint256 amount) external onlyRole(PRODUCT_ROLE) {
        require(_escrows[from] >= amount, "ClearingHouse: insufficient escrow for fee");
        _escrows[from] -= amount;
        accumulatedFees += amount;
        emit FeesCollected(amount);
    }

    function flushFeesToRevenue(address recipient) external onlyAdmin {
        uint256 fees = accumulatedFees;
        require(fees > 0, "ClearingHouse: no fees");
        accumulatedFees = 0;
        (bool ok, ) = recipient.call{value: fees}("");
        require(ok, "ClearingHouse: transfer failed");
    }

    // ─── UUPS ───

    function _authorizeUpgrade(address) internal view override {
        require(msg.sender == _admin, "ClearingHouse: not admin");
    }
}
