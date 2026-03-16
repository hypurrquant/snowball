// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {ERC4626} from "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {ISnowballStrategy} from "./interfaces/ISnowballStrategy.sol";

/// @title SnowballYieldVaultV2
/// @notice ERC-4626 compatible vault with strategy integration.
///         Preserves V1 features: strategy timelock, token recovery, earn().
///         Uses OZ ERC4626 virtual shares for inflation attack defense.
/// @dev beforeDeposit() is called in deposit/mint overrides (before share calculation)
///      to prevent value extraction when harvestOnDeposit is enabled.
contract SnowballYieldVaultV2 is ERC4626, Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;
    using Math for uint256;

    ISnowballStrategy public strategy;

    // --- Strategy upgrade timelock (48 h) ---
    struct StratCandidate {
        address implementation;
        uint256 proposedTime;
    }
    StratCandidate public stratCandidate;
    uint256 public constant UPGRADE_DELAY = 48 hours;

    event NewStratCandidate(address indexed implementation);
    event UpgradeStrat(address indexed implementation);

    constructor(
        IERC20 _asset,
        string memory _name,
        string memory _symbol
    ) ERC4626(_asset) ERC20(_name, _symbol) Ownable(msg.sender) {}

    // ─── ERC-4626 overrides ──────────────────────────────

    /// @notice Total assets = idle in vault + deployed in strategy.
    function totalAssets() public view override returns (uint256) {
        return IERC20(asset()).balanceOf(address(this)) + _strategyBalance();
    }

    /// @notice Deposit assets. Calls beforeDeposit() BEFORE share calculation
    ///         to prevent value extraction from harvest-on-deposit.
    function deposit(uint256 assets, address receiver)
        public
        override
        nonReentrant
        returns (uint256)
    {
        _beforeDepositHook();
        uint256 shares = super.deposit(assets, receiver);
        _earn();
        return shares;
    }

    /// @notice Mint shares. Calls beforeDeposit() BEFORE share calculation.
    function mint(uint256 shares, address receiver)
        public
        override
        nonReentrant
        returns (uint256)
    {
        _beforeDepositHook();
        uint256 assets = super.mint(shares, receiver);
        _earn();
        return assets;
    }

    /// @notice Withdraw assets. Ensures sufficient idle funds first.
    function withdraw(uint256 assets, address receiver, address owner_)
        public
        override
        nonReentrant
        returns (uint256)
    {
        _ensureFunds(assets);
        return super.withdraw(assets, receiver, owner_);
    }

    /// @notice Redeem shares. Ensures sufficient idle funds first.
    function redeem(uint256 shares, address receiver, address owner_)
        public
        override
        nonReentrant
        returns (uint256)
    {
        uint256 assets = previewRedeem(shares);
        _ensureFunds(assets);
        return super.redeem(shares, receiver, owner_);
    }

    function _beforeDepositHook() internal {
        if (address(strategy) != address(0)) {
            strategy.beforeDeposit();
        }
    }

    // ─── Strategy interaction ────────────────────────────

    /// @notice Push idle assets into the strategy.
    function earn() external {
        _earn();
    }

    function _earn() internal {
        if (address(strategy) == address(0)) return;
        uint256 idle = IERC20(asset()).balanceOf(address(this));
        if (idle > 0) {
            IERC20(asset()).safeTransfer(address(strategy), idle);
            strategy.deposit();
        }
    }

    /// @notice Pull assets from strategy if vault balance is insufficient.
    function _ensureFunds(uint256 needed) internal {
        uint256 idle = IERC20(asset()).balanceOf(address(this));
        if (idle < needed && address(strategy) != address(0)) {
            strategy.withdraw(needed - idle);
        }
    }

    function _strategyBalance() internal view returns (uint256) {
        return address(strategy) != address(0) ? strategy.balanceOf() : 0;
    }

    // ─── ERC-4626 max* overrides ─────────────────────────

    /// @notice Caps maxWithdraw at liquid assets: idle vault balance + strategy liquid balance.
    function maxWithdraw(address owner_) public view override returns (uint256) {
        uint256 vaultMax = super.maxWithdraw(owner_);
        if (address(strategy) == address(0)) return vaultMax;
        // Include idle assets held directly by the vault so withdrawals up to totalAssets()
        // are not artificially capped when funds have not yet been deployed to the strategy.
        uint256 liquidAssets = IERC20(asset()).balanceOf(address(this)) + strategy.balanceOf();
        return Math.min(vaultMax, liquidAssets);
    }

    /// @notice Caps maxRedeem so the corresponding assets never exceed liquid assets.
    function maxRedeem(address owner_) public view override returns (uint256) {
        uint256 vaultMax = super.maxRedeem(owner_);
        if (address(strategy) == address(0)) return vaultMax;
        // Mirror maxWithdraw: include idle vault balance alongside strategy liquid balance.
        uint256 liquidAssets = IERC20(asset()).balanceOf(address(this)) + strategy.balanceOf();
        uint256 liquidShares = _convertToShares(liquidAssets, Math.Rounding.Floor);
        return Math.min(vaultMax, liquidShares);
    }

    // ─── V1 compatibility ────────────────────────────────

    /// @notice Price per full share (1e18 unit), matches V1 interface.
    function getPricePerFullShare() external view returns (uint256) {
        uint256 supply = totalSupply();
        return supply == 0 ? 1e18 : (totalAssets() * 1e18) / supply;
    }

    // ─── Strategy management ────────────────────────────

    /// @notice Propose a new strategy (starts 48h timelock).
    function proposeStrat(address _implementation) external onlyOwner {
        require(
            address(this) == ISnowballStrategy(_implementation).vault(),
            "!vault"
        );
        require(
            ISnowballStrategy(_implementation).want() == asset(),
            "!want"
        );
        stratCandidate = StratCandidate({
            implementation: _implementation,
            proposedTime: block.timestamp
        });
        emit NewStratCandidate(_implementation);
    }

    /// @notice Complete strategy upgrade after timelock expires.
    function upgradeStrat() external onlyOwner {
        require(stratCandidate.implementation != address(0), "!candidate");
        require(
            stratCandidate.proposedTime + UPGRADE_DELAY <= block.timestamp,
            "!delay"
        );

        emit UpgradeStrat(stratCandidate.implementation);

        strategy.retireStrat();
        strategy = ISnowballStrategy(stratCandidate.implementation);
        stratCandidate.implementation = address(0);
        stratCandidate.proposedTime = 5000000000; // far future

        _earn();
    }

    /// @notice Set the initial strategy (only when none is set).
    function setStrategy(address _strategy) external onlyOwner {
        require(address(strategy) == address(0), "!already");
        require(_strategy != address(0), "!zero");
        require(
            address(this) == ISnowballStrategy(_strategy).vault(),
            "!vault"
        );
        require(
            ISnowballStrategy(_strategy).want() == asset(),
            "!want"
        );
        strategy = ISnowballStrategy(_strategy);
        emit UpgradeStrat(_strategy);
    }

    // ─── Recovery ───────────────────────────────────────

    /// @notice Rescue tokens accidentally sent to the vault (not the asset).
    function inCaseTokensGetStuck(address _token) external onlyOwner {
        require(_token != asset(), "!token");
        uint256 amount = IERC20(_token).balanceOf(address(this));
        IERC20(_token).safeTransfer(msg.sender, amount);
    }
}
