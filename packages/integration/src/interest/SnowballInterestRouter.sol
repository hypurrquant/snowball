// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title IInterestRouter - Liquity V2 interest router interface
/// @dev Empty interface — ActivePool sends sbUSD directly to this address.
interface IInterestRouter {}

/// @title SnowballInterestRouter - Distributes sbUSD interest from ActivePool
/// @notice ActivePool mints 25% of interest to this contract's address.
///         Anyone can call distribute() to split funds between Morpho and treasury.
contract SnowballInterestRouter is IInterestRouter, Ownable {
    using SafeERC20 for IERC20;

    IERC20 public immutable sbUSD;

    address public morphoTarget;
    address public treasury;
    uint256 public morphoSplitBps; // e.g. 7000 = 70%
    uint256 public minDistributeAmount;

    uint256 public constant BPS_DIVISOR = 10000;
    uint256 public constant MIN_DISTRIBUTE_FLOOR = 1e15; // 0.001 sbUSD minimum

    event Distributed(uint256 morphoAmount, uint256 treasuryAmount);
    event TargetsUpdated(address morphoTarget, address treasury, uint256 morphoSplitBps);
    event MinDistributeAmountUpdated(uint256 amount);
    event ETHWithdrawn(address to, uint256 amount);

    constructor(
        address _sbUSD,
        address _morphoTarget,
        address _treasury,
        uint256 _morphoSplitBps,
        uint256 _minDistributeAmount
    ) Ownable(msg.sender) {
        require(_sbUSD != address(0), "InterestRouter: zero sbUSD");
        require(_morphoTarget != address(0), "InterestRouter: zero morpho");
        require(_treasury != address(0), "InterestRouter: zero treasury");
        require(_morphoSplitBps <= BPS_DIVISOR, "InterestRouter: invalid split");
        require(_minDistributeAmount >= MIN_DISTRIBUTE_FLOOR, "InterestRouter: min too low");

        sbUSD = IERC20(_sbUSD);
        morphoTarget = _morphoTarget;
        treasury = _treasury;
        morphoSplitBps = _morphoSplitBps;
        minDistributeAmount = _minDistributeAmount;
    }

    /// @notice Distribute accumulated sbUSD between Morpho and treasury.
    ///         Anyone can call this — it's a public good function.
    function distribute() external {
        uint256 balance = sbUSD.balanceOf(address(this));
        require(balance >= minDistributeAmount, "InterestRouter: below min");

        uint256 morphoAmount = (balance * morphoSplitBps) / BPS_DIVISOR;
        uint256 treasuryAmount = balance - morphoAmount;

        if (morphoAmount > 0) {
            sbUSD.safeTransfer(morphoTarget, morphoAmount);
        }
        if (treasuryAmount > 0) {
            sbUSD.safeTransfer(treasury, treasuryAmount);
        }

        emit Distributed(morphoAmount, treasuryAmount);
    }

    /// @notice Update distribution targets and split ratio.
    function setTargets(
        address _morphoTarget,
        address _treasury,
        uint256 _morphoSplitBps
    ) external onlyOwner {
        require(_morphoTarget != address(0), "InterestRouter: zero morpho");
        require(_treasury != address(0), "InterestRouter: zero treasury");
        require(_morphoSplitBps <= BPS_DIVISOR, "InterestRouter: invalid split");

        morphoTarget = _morphoTarget;
        treasury = _treasury;
        morphoSplitBps = _morphoSplitBps;

        emit TargetsUpdated(_morphoTarget, _treasury, _morphoSplitBps);
    }

    /// @notice Update minimum distribute threshold.
    function setMinDistributeAmount(uint256 _amount) external onlyOwner {
        require(_amount >= MIN_DISTRIBUTE_FLOOR, "InterestRouter: min too low");
        minDistributeAmount = _amount;
        emit MinDistributeAmountUpdated(_amount);
    }

    /// @notice Withdraw ETH that was accidentally sent to this contract.
    function withdrawETH(address payable to, uint256 amount) external onlyOwner {
        require(to != address(0), "InterestRouter: zero address");
        (bool sent,) = to.call{value: amount}("");
        require(sent, "InterestRouter: ETH transfer failed");
        emit ETHWithdrawn(to, amount);
    }

    /// @notice Accept ETH (in case ActivePool sends native token).
    receive() external payable {}
}
