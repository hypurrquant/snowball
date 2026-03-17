// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity =0.7.6;
pragma abicoder v2;

import '@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol';
import '@uniswap/v3-core/contracts/interfaces/IUniswapV3Factory.sol';
import '@uniswap/v3-core/contracts/interfaces/IUniswapV3Pool.sol';
import '@uniswap/v3-core/contracts/interfaces/IERC20Minimal.sol';
import '@uniswap/v3-periphery/contracts/interfaces/INonfungiblePositionManager.sol';
import '@uniswap/v3-periphery/contracts/interfaces/IMulticall.sol';

/// @title Snowball Staker Interface
/// @notice UniswapV3Staker fork with LP fee collection support
interface ISnowballStaker is IERC721Receiver, IMulticall {
    struct IncentiveKey {
        IERC20Minimal rewardToken;
        IUniswapV3Pool pool;
        uint256 startTime;
        uint256 endTime;
        address refundee;
    }

    // ─── Views ───
    function factory() external view returns (IUniswapV3Factory);
    function nonfungiblePositionManager() external view returns (INonfungiblePositionManager);
    function maxIncentiveDuration() external view returns (uint256);
    function maxIncentiveStartLeadTime() external view returns (uint256);

    function incentives(bytes32 incentiveId)
        external view returns (uint256 totalRewardUnclaimed, uint160 totalSecondsClaimedX128, uint96 numberOfStakes);

    function deposits(uint256 tokenId)
        external view returns (address owner, uint48 numberOfStakes, int24 tickLower, int24 tickUpper);

    function stakes(uint256 tokenId, bytes32 incentiveId)
        external view returns (uint160 secondsPerLiquidityInsideInitialX128, uint128 liquidity);

    function rewards(IERC20Minimal rewardToken, address owner) external view returns (uint256 rewardsOwed);

    // ─── Incentive lifecycle ───
    function createIncentive(IncentiveKey memory key, uint256 reward) external;
    function endIncentive(IncentiveKey memory key) external returns (uint256 refund);

    // ─── Deposit / Withdraw ───
    function transferDeposit(uint256 tokenId, address to) external;
    function withdrawToken(uint256 tokenId, address to, bytes memory data) external;

    // ─── Stake / Unstake / Claim ───
    function stakeToken(IncentiveKey memory key, uint256 tokenId) external;
    function unstakeToken(IncentiveKey memory key, uint256 tokenId) external;
    function claimReward(IERC20Minimal rewardToken, address to, uint256 amountRequested) external returns (uint256 reward);
    function getRewardInfo(IncentiveKey memory key, uint256 tokenId) external returns (uint256 reward, uint160 secondsInsideX128);

    // ─── Fee collection (Snowball addition) ───
    function collectFee(uint256 tokenId, address recipient) external returns (uint256 amount0, uint256 amount1);

    // ─── Events ───
    event IncentiveCreated(IERC20Minimal indexed rewardToken, IUniswapV3Pool indexed pool, uint256 startTime, uint256 endTime, address refundee, uint256 reward);
    event IncentiveEnded(bytes32 indexed incentiveId, uint256 refund);
    event DepositTransferred(uint256 indexed tokenId, address indexed oldOwner, address indexed newOwner);
    event TokenStaked(uint256 indexed tokenId, bytes32 indexed incentiveId, uint128 liquidity);
    event TokenUnstaked(uint256 indexed tokenId, bytes32 indexed incentiveId);
    event RewardClaimed(address indexed to, uint256 reward);
    event FeeCollected(uint256 indexed tokenId, address indexed recipient, uint256 amount0, uint256 amount1);
}
