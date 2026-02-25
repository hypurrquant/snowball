// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {ISnowballStrategy} from "./interfaces/ISnowballStrategy.sol";

/// @title SnowballYieldVault
/// @notice Beefy-style vault that issues share tokens (mooTokens) proportional to deposits.
///         Idle funds are forwarded to a pluggable Strategy via earn().
///         Based on BeefyVaultV7 (non-upgradeable adaptation).
contract SnowballYieldVault is ERC20, Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    IERC20 public immutable want;
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
        IERC20 _want,
        string memory _name,
        string memory _symbol
    ) ERC20(_name, _symbol) Ownable(msg.sender) {
        want = _want;
    }

    // ─── Views ──────────────────────────────────────────────

    /// @notice Total want tokens managed by vault + strategy.
    function balance() public view returns (uint256) {
        return want.balanceOf(address(this)) + strategyBalance();
    }

    /// @notice Idle want tokens sitting in the vault.
    function available() public view returns (uint256) {
        return want.balanceOf(address(this));
    }

    /// @notice Balance held in the strategy.
    function strategyBalance() public view returns (uint256) {
        return address(strategy) != address(0) ? strategy.balanceOf() : 0;
    }

    /// @notice Price per full share (1e18 unit), useful for UIs.
    function getPricePerFullShare() external view returns (uint256) {
        return totalSupply() == 0 ? 1e18 : (balance() * 1e18) / totalSupply();
    }

    // ─── Core ───────────────────────────────────────────────

    /// @notice Deposit want tokens, receive proportional shares.
    ///         Calls strategy.beforeDeposit() then auto-earns into strategy.
    function deposit(uint256 _amount) public nonReentrant {
        strategy.beforeDeposit();

        uint256 poolBefore = balance();
        want.safeTransferFrom(msg.sender, address(this), _amount);
        earn();
        uint256 poolAfter = balance();
        _amount = poolAfter - poolBefore; // handle fee-on-transfer

        uint256 shares;
        if (totalSupply() == 0) {
            shares = _amount;
        } else {
            shares = (_amount * totalSupply()) / poolBefore;
        }

        _mint(msg.sender, shares);
    }

    /// @notice Deposit all want tokens held by the caller.
    function depositAll() external {
        deposit(want.balanceOf(msg.sender));
    }

    /// @notice Burn shares and withdraw proportional want tokens.
    function withdraw(uint256 _shares) public nonReentrant {
        uint256 r = (_shares * balance()) / totalSupply();
        _burn(msg.sender, _shares);

        uint256 b = want.balanceOf(address(this));
        if (b < r) {
            uint256 _withdraw = r - b;
            strategy.withdraw(_withdraw);
            uint256 _after = want.balanceOf(address(this));
            uint256 _diff = _after - b;
            if (_diff < _withdraw) {
                r = b + _diff;
            }
        }

        want.safeTransfer(msg.sender, r);
    }

    /// @notice Withdraw all shares held by the caller.
    function withdrawAll() external {
        withdraw(balanceOf(msg.sender));
    }

    /// @notice Push idle want tokens in the vault into the strategy.
    function earn() public {
        uint256 _bal = available();
        want.safeTransfer(address(strategy), _bal);
        strategy.deposit();
    }

    // ─── Strategy management ────────────────────────────────

    /// @notice Propose a new strategy (starts timelock).
    function proposeStrat(address _implementation) external onlyOwner {
        require(
            address(this) == ISnowballStrategy(_implementation).vault(),
            "!vault"
        );
        require(
            ISnowballStrategy(_implementation).want() == address(want),
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
            stratCandidate.proposedTime + UPGRADE_DELAY < block.timestamp,
            "!delay"
        );

        emit UpgradeStrat(stratCandidate.implementation);

        strategy.retireStrat();
        strategy = ISnowballStrategy(stratCandidate.implementation);
        stratCandidate.implementation = address(0);
        stratCandidate.proposedTime = 5000000000; // far future

        earn();
    }

    /// @notice Set the initial strategy (only when no strategy is set yet).
    function setStrategy(address _strategy) external onlyOwner {
        require(address(strategy) == address(0), "!already");
        require(_strategy != address(0), "!zero");
        require(
            ISnowballStrategy(_strategy).want() == address(want),
            "!want"
        );
        strategy = ISnowballStrategy(_strategy);
        emit UpgradeStrat(_strategy);
    }

    // ─── Recovery ───────────────────────────────────────────

    /// @notice Rescue tokens accidentally sent to the vault (not want).
    function inCaseTokensGetStuck(address _token) external onlyOwner {
        require(_token != address(want), "!token");
        uint256 amount = IERC20(_token).balanceOf(address(this));
        IERC20(_token).safeTransfer(msg.sender, amount);
    }
}
