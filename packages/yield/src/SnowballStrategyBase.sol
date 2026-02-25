// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {ISnowballStrategy} from "./interfaces/ISnowballStrategy.sol";
import {ISwapRouter} from "./interfaces/ISwapRouter.sol";

/// @title SnowballStrategyBase
/// @notice Abstract base for Beefy-style strategies.
///         Based on BaseAllToNativeFactoryStrat (non-upgradeable adaptation).
///         Concrete strategies implement _deposit, _withdraw, _emergencyWithdraw,
///         _claim, _verifyRewardToken, and balanceOfPool.
abstract contract SnowballStrategyBase is ISnowballStrategy, Ownable, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ─── Fee constants (basis points, denominator = 1000) ───
    uint256 public constant FEE_DIVISOR = 1000;
    uint256 public constant CALL_FEE   = 5;   // 0.5 % → harvest caller
    uint256 public constant STRAT_FEE  = 5;   // 0.5 % → strategist
    uint256 public constant TREASURY_FEE = 35; // 3.5 % → treasury
    // Total fee on profit = 4.5 %

    uint256 public constant WITHDRAWAL_FEE_CAP = 50;  // max 0.5 %
    uint256 public constant WITHDRAWAL_MAX = 10000;
    uint256 public withdrawalFee;

    // ─── Locked-profit anti-sandwich ────────────────────────
    uint256 public totalLocked;
    uint256 public lastHarvest;
    uint256 public lockDuration;
    bool public harvestOnDeposit;

    // ─── Multi-reward handling ──────────────────────────────
    address[] public rewards;
    mapping(address => uint256) public minAmounts;

    // ─── Addresses ──────────────────────────────────────────
    address public immutable override vault;
    IERC20  public immutable wantToken;
    IERC20  public immutable native; // wCTC
    ISwapRouter public immutable swapRouter;
    address public immutable poolDeployer; // Algebra pool deployer

    address public depositToken; // optional intermediate token for 2-hop swap
    address public strategist;
    address public treasury;
    address public keeper;

    event StratHarvest(address indexed harvester, uint256 wantHarvested, uint256 tvl);
    event Deposit(uint256 tvl);
    event Withdraw(uint256 tvl);
    event ChargedFees(uint256 callFees, uint256 treasuryFees, uint256 strategistFees);
    event SetVault(address vault);
    event SetStrategist(address strategist);
    event SetKeeper(address keeper);

    modifier onlyVault() {
        _checkVault();
        _;
    }

    function _checkVault() internal view {
        require(msg.sender == vault, "!vault");
    }

    modifier onlyManager() {
        _checkManager();
        _;
    }

    function _checkManager() internal view {
        require(msg.sender == owner() || msg.sender == keeper, "!manager");
    }

    constructor(
        address _vault,
        address _want,
        address _native,
        address _swapRouter,
        address _poolDeployer,
        address _strategist,
        address _treasury
    ) Ownable(msg.sender) {
        vault = _vault;
        wantToken = IERC20(_want);
        native = IERC20(_native);
        swapRouter = ISwapRouter(_swapRouter);
        poolDeployer = _poolDeployer;
        strategist = _strategist;
        treasury = _treasury;
        keeper = msg.sender;

        withdrawalFee = 10; // 0.1 % default
        lockDuration = 1 days;
    }

    // ─── ISnowballStrategy views ────────────────────────────

    function want() external view override returns (address) {
        return address(wantToken);
    }

    /// @notice Total strategy balance = idle want + pool balance - locked profit.
    function balanceOf() public view override returns (uint256) {
        return balanceOfWant() + balanceOfPool() - lockedProfit();
    }

    function balanceOfWant() public view override returns (uint256) {
        return wantToken.balanceOf(address(this));
    }

    /// @notice Locked profit decays linearly over lockDuration.
    function lockedProfit() public view returns (uint256) {
        if (lockDuration == 0) return 0;
        uint256 elapsed = block.timestamp - lastHarvest;
        uint256 remaining = elapsed < lockDuration ? lockDuration - elapsed : 0;
        return totalLocked * remaining / lockDuration;
    }

    function rewardsAvailable() external view virtual override returns (uint256) {
        return 0;
    }

    function callReward() external view virtual override returns (uint256) {
        return 0;
    }

    function depositFee() public view virtual override returns (uint256) {
        return 0;
    }

    function withdrawFee() public view virtual override returns (uint256) {
        return paused() ? 0 : withdrawalFee;
    }

    // ─── ISnowballStrategy mutators ─────────────────────────

    /// @notice Called by vault before user deposit. Optionally auto-harvests.
    function beforeDeposit() external virtual override {
        if (harvestOnDeposit) {
            require(msg.sender == vault, "!vault");
            _harvest(tx.origin, true);
        }
    }

    function deposit() external override whenNotPaused {
        uint256 wantBal = balanceOfWant();
        if (wantBal > 0) {
            _deposit(wantBal);
            emit Deposit(balanceOf());
        }
    }

    function withdraw(uint256 _amount) external override onlyVault {
        uint256 wantBal = balanceOfWant();

        if (wantBal < _amount) {
            _withdraw(_amount - wantBal);
            wantBal = balanceOfWant();
        }

        if (wantBal > _amount) {
            wantBal = _amount;
        }

        wantToken.safeTransfer(vault, wantBal);

        emit Withdraw(balanceOf());
    }

    /// @notice Harvest rewards, charge fees, compound.
    function harvest() external override {
        _harvest(tx.origin, false);
    }

    /// @notice Harvest with explicit fee recipient.
    function harvest(address callFeeRecipient) external {
        _harvest(callFeeRecipient, false);
    }

    function _harvest(address callFeeRecipient, bool onDeposit) internal whenNotPaused {
        uint256 beforeBal = balanceOfWant();
        _claim();
        _swapRewardsToNative();
        uint256 nativeBal = IERC20(native).balanceOf(address(this));

        if (nativeBal > minAmounts[address(native)]) {
            _chargeFees(callFeeRecipient);
            _swapNativeToWant();

            uint256 wantHarvested = balanceOfWant() - beforeBal;
            totalLocked = wantHarvested + lockedProfit();
            lastHarvest = block.timestamp;

            if (!onDeposit) {
                _deposit(balanceOfWant());
            }

            emit StratHarvest(msg.sender, wantHarvested, balanceOf());
        }
    }

    /// @notice Retire this strategy: send all funds back to vault.
    function retireStrat() external override onlyVault {
        _emergencyWithdraw();
        uint256 bal = balanceOfWant();
        if (bal > 0) {
            wantToken.safeTransfer(vault, bal);
        }
    }

    /// @notice Emergency: withdraw all, pause.
    function panic() external override onlyManager {
        _pause();
        _emergencyWithdraw();
    }

    function pause() external override onlyManager {
        _pause();
    }

    function unpause() external override onlyManager {
        _unpause();
        _deposit(balanceOfWant());
    }

    // ─── Multi-reward handling ──────────────────────────────

    function _swapRewardsToNative() internal virtual {
        for (uint256 i; i < rewards.length; ++i) {
            address token = rewards[i];
            uint256 amount = IERC20(token).balanceOf(address(this));
            if (amount > minAmounts[token]) {
                _swap(token, address(native), amount);
            }
        }
    }

    function rewardsLength() external view returns (uint256) {
        return rewards.length;
    }

    function addReward(address _token) public onlyManager {
        require(_token != address(wantToken), "!want");
        require(_token != address(native), "!native");
        _verifyRewardToken(_token);
        rewards.push(_token);
    }

    function removeReward(uint256 i) external onlyManager {
        rewards[i] = rewards[rewards.length - 1];
        rewards.pop();
    }

    function resetRewards() external onlyManager {
        delete rewards;
    }

    function setRewardMinAmount(address _token, uint256 _minAmount) external onlyManager {
        minAmounts[_token] = _minAmount;
    }

    // ─── Fee logic ──────────────────────────────────────────

    function _chargeFees(address callFeeRecipient) internal {
        uint256 totalFee = CALL_FEE + STRAT_FEE + TREASURY_FEE; // 45
        uint256 nativeBal = IERC20(native).balanceOf(address(this));
        uint256 feeAmount = (nativeBal * totalFee) / FEE_DIVISOR;

        uint256 callAmt      = (feeAmount * CALL_FEE) / totalFee;
        uint256 stratAmt     = (feeAmount * STRAT_FEE) / totalFee;
        uint256 treasuryAmt  = feeAmount - callAmt - stratAmt;

        if (callAmt > 0)     IERC20(native).safeTransfer(callFeeRecipient, callAmt);
        if (stratAmt > 0)    IERC20(native).safeTransfer(strategist, stratAmt);
        if (treasuryAmt > 0) IERC20(native).safeTransfer(treasury, treasuryAmt);

        emit ChargedFees(callAmt, treasuryAmt, stratAmt);
    }

    // ─── Swap helpers ───────────────────────────────────────

    /// @notice Convert remaining native → want, optionally via depositToken (2-hop).
    function _swapNativeToWant() internal virtual {
        if (depositToken == address(0)) {
            _swap(address(native), address(wantToken));
        } else {
            if (depositToken != address(native)) {
                _swap(address(native), depositToken);
            }
            _swap(depositToken, address(wantToken));
        }
    }

    function _swap(address _from, address _to) internal {
        uint256 bal = IERC20(_from).balanceOf(address(this));
        _swap(_from, _to, bal);
    }

    function _swap(address _from, address _to, uint256 _amount) internal {
        if (_amount > 0 && _from != _to) {
            IERC20(_from).forceApprove(address(swapRouter), _amount);
            swapRouter.exactInputSingle(
                ISwapRouter.ExactInputSingleParams({
                    tokenIn: _from,
                    tokenOut: _to,
                    deployer: poolDeployer,
                    recipient: address(this),
                    deadline: block.timestamp,
                    amountIn: _amount,
                    amountOutMinimum: 0,
                    limitSqrtPrice: 0
                })
            );
        }
    }

    // ─── Admin ──────────────────────────────────────────────

    function setDepositToken(address _token) public onlyManager {
        if (_token == address(0)) {
            depositToken = address(0);
            return;
        }
        require(_token != address(wantToken), "!want");
        depositToken = _token;
    }

    function setHarvestOnDeposit(bool _harvestOnDeposit) public onlyManager {
        harvestOnDeposit = _harvestOnDeposit;
        if (harvestOnDeposit) {
            lockDuration = 0;
        } else {
            lockDuration = 1 days;
        }
    }

    function setLockDuration(uint256 _duration) external onlyManager {
        lockDuration = _duration;
    }

    function setWithdrawalFee(uint256 _fee) external onlyManager {
        require(_fee <= WITHDRAWAL_FEE_CAP, "!cap");
        withdrawalFee = _fee;
    }

    function setStrategist(address _strategist) external {
        require(msg.sender == strategist, "!strategist");
        strategist = _strategist;
        emit SetStrategist(_strategist);
    }

    function setTreasury(address _treasury) external onlyOwner {
        treasury = _treasury;
    }

    function setKeeper(address _keeper) external onlyManager {
        keeper = _keeper;
        emit SetKeeper(_keeper);
    }

    // ─── Overrides ────────────────────────────────────────────

    /// @dev Resolve paused() conflict between Pausable and ISnowballStrategy.
    function paused() public view virtual override(Pausable, ISnowballStrategy) returns (bool) {
        return super.paused();
    }

    // ─── Abstract hooks (implemented by concrete strategies) ─

    function _deposit(uint256 _amount) internal virtual;
    function _withdraw(uint256 _amount) internal virtual;
    function _emergencyWithdraw() internal virtual;
    function _claim() internal virtual;
    function _verifyRewardToken(address token) internal view virtual;
    function balanceOfPool() public view virtual override returns (uint256);
}
