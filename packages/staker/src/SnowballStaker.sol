// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity =0.7.6;
pragma abicoder v2;

import './interfaces/ISnowballStaker.sol';
import './libraries/IncentiveId.sol';
import './libraries/RewardMath.sol';
import './libraries/NFTPositionInfo.sol';
import './libraries/TransferHelperExtended.sol';

import '@uniswap/v3-core/contracts/interfaces/IUniswapV3Factory.sol';
import '@uniswap/v3-core/contracts/interfaces/IUniswapV3Pool.sol';
import '@uniswap/v3-core/contracts/interfaces/IERC20Minimal.sol';

import '@uniswap/v3-periphery/contracts/interfaces/INonfungiblePositionManager.sol';
import '@uniswap/v3-periphery/contracts/base/Multicall.sol';

/// @title SnowballStaker
/// @notice UniswapV3Staker fork — adds collectFee() so staked LPs can claim swap fees
contract SnowballStaker is ISnowballStaker, Multicall {

    struct Incentive {
        uint256 totalRewardUnclaimed;
        uint160 totalSecondsClaimedX128;
        uint96 numberOfStakes;
    }

    struct Deposit {
        address owner;
        uint48 numberOfStakes;
        int24 tickLower;
        int24 tickUpper;
    }

    struct Stake {
        uint160 secondsPerLiquidityInsideInitialX128;
        uint96 liquidityNoOverflow;
        uint128 liquidityIfOverflow;
    }

    /// @inheritdoc ISnowballStaker
    IUniswapV3Factory public immutable override factory;
    /// @inheritdoc ISnowballStaker
    INonfungiblePositionManager public immutable override nonfungiblePositionManager;
    /// @inheritdoc ISnowballStaker
    uint256 public immutable override maxIncentiveStartLeadTime;
    /// @inheritdoc ISnowballStaker
    uint256 public immutable override maxIncentiveDuration;

    mapping(bytes32 => Incentive) public override incentives;
    mapping(uint256 => Deposit) public override deposits;
    mapping(uint256 => mapping(bytes32 => Stake)) private _stakes;
    mapping(IERC20Minimal => mapping(address => uint256)) public override rewards;

    /// @inheritdoc ISnowballStaker
    function stakes(uint256 tokenId, bytes32 incentiveId)
        public view override
        returns (uint160 secondsPerLiquidityInsideInitialX128, uint128 liquidity)
    {
        Stake storage stake = _stakes[tokenId][incentiveId];
        secondsPerLiquidityInsideInitialX128 = stake.secondsPerLiquidityInsideInitialX128;
        liquidity = stake.liquidityNoOverflow;
        if (liquidity == type(uint96).max) {
            liquidity = stake.liquidityIfOverflow;
        }
    }

    constructor(
        IUniswapV3Factory _factory,
        INonfungiblePositionManager _nonfungiblePositionManager,
        uint256 _maxIncentiveStartLeadTime,
        uint256 _maxIncentiveDuration
    ) {
        factory = _factory;
        nonfungiblePositionManager = _nonfungiblePositionManager;
        maxIncentiveStartLeadTime = _maxIncentiveStartLeadTime;
        maxIncentiveDuration = _maxIncentiveDuration;
    }

    // ═══════════════════════════════════════════════════════════════
    //  Incentive lifecycle
    // ═══════════════════════════════════════════════════════════════

    /// @inheritdoc ISnowballStaker
    function createIncentive(IncentiveKey memory key, uint256 reward) external override {
        require(reward > 0, 'reward must be positive');
        require(block.timestamp <= key.startTime, 'start time must be now or in the future');
        require(key.startTime - block.timestamp <= maxIncentiveStartLeadTime, 'start time too far into future');
        require(key.startTime < key.endTime, 'start must be before end');
        require(key.endTime - key.startTime <= maxIncentiveDuration, 'incentive duration too long');

        bytes32 incentiveId = IncentiveId.compute(key);
        incentives[incentiveId].totalRewardUnclaimed += reward;

        TransferHelperExtended.safeTransferFrom(address(key.rewardToken), msg.sender, address(this), reward);
        emit IncentiveCreated(key.rewardToken, key.pool, key.startTime, key.endTime, key.refundee, reward);
    }

    /// @inheritdoc ISnowballStaker
    function endIncentive(IncentiveKey memory key) external override returns (uint256 refund) {
        require(block.timestamp >= key.endTime, 'cannot end before end time');

        bytes32 incentiveId = IncentiveId.compute(key);
        Incentive storage incentive = incentives[incentiveId];

        refund = incentive.totalRewardUnclaimed;
        require(refund > 0, 'no refund available');
        require(incentive.numberOfStakes == 0, 'cannot end while deposits staked');

        incentive.totalRewardUnclaimed = 0;
        TransferHelperExtended.safeTransfer(address(key.rewardToken), key.refundee, refund);

        emit IncentiveEnded(incentiveId, refund);
    }

    // ═══════════════════════════════════════════════════════════════
    //  Deposit / Withdraw
    // ═══════════════════════════════════════════════════════════════

    /// @inheritdoc IERC721Receiver
    function onERC721Received(
        address,
        address from,
        uint256 tokenId,
        bytes calldata data
    ) external override returns (bytes4) {
        require(msg.sender == address(nonfungiblePositionManager), 'not a univ3 nft');

        (, , , , , int24 tickLower, int24 tickUpper, , , , , ) = nonfungiblePositionManager.positions(tokenId);
        deposits[tokenId] = Deposit({owner: from, numberOfStakes: 0, tickLower: tickLower, tickUpper: tickUpper});
        emit DepositTransferred(tokenId, address(0), from);

        if (data.length > 0) {
            if (data.length == 160) {
                _stakeToken(abi.decode(data, (IncentiveKey)), tokenId);
            } else {
                IncentiveKey[] memory keys = abi.decode(data, (IncentiveKey[]));
                for (uint256 i = 0; i < keys.length; i++) {
                    _stakeToken(keys[i], tokenId);
                }
            }
        }
        return this.onERC721Received.selector;
    }

    /// @inheritdoc ISnowballStaker
    function transferDeposit(uint256 tokenId, address to) external override {
        require(to != address(0), 'invalid transfer recipient');
        address owner = deposits[tokenId].owner;
        require(owner == msg.sender, 'only deposit owner');
        deposits[tokenId].owner = to;
        emit DepositTransferred(tokenId, owner, to);
    }

    /// @inheritdoc ISnowballStaker
    function withdrawToken(uint256 tokenId, address to, bytes memory data) external override {
        require(to != address(this), 'cannot withdraw to staker');
        Deposit memory deposit = deposits[tokenId];
        require(deposit.numberOfStakes == 0, 'cannot withdraw while staked');
        require(deposit.owner == msg.sender, 'only owner can withdraw');

        delete deposits[tokenId];
        emit DepositTransferred(tokenId, deposit.owner, address(0));

        nonfungiblePositionManager.safeTransferFrom(address(this), to, tokenId, data);
    }

    // ═══════════════════════════════════════════════════════════════
    //  Stake / Unstake / Claim
    // ═══════════════════════════════════════════════════════════════

    /// @inheritdoc ISnowballStaker
    function stakeToken(IncentiveKey memory key, uint256 tokenId) external override {
        require(deposits[tokenId].owner == msg.sender, 'only owner can stake');
        _stakeToken(key, tokenId);
    }

    /// @inheritdoc ISnowballStaker
    function unstakeToken(IncentiveKey memory key, uint256 tokenId) external override {
        Deposit memory deposit = deposits[tokenId];
        if (block.timestamp < key.endTime) {
            require(deposit.owner == msg.sender, 'only owner can unstake before end');
        }

        bytes32 incentiveId = IncentiveId.compute(key);
        (uint160 secondsPerLiquidityInsideInitialX128, uint128 liquidity) = stakes(tokenId, incentiveId);
        require(liquidity != 0, 'stake does not exist');

        Incentive storage incentive = incentives[incentiveId];

        deposits[tokenId].numberOfStakes--;
        incentive.numberOfStakes--;

        (, uint160 secondsPerLiquidityInsideX128, ) =
            key.pool.snapshotCumulativesInside(deposit.tickLower, deposit.tickUpper);

        (uint256 reward, uint160 secondsInsideX128) = RewardMath.computeRewardAmount(
            incentive.totalRewardUnclaimed,
            incentive.totalSecondsClaimedX128,
            key.startTime,
            key.endTime,
            liquidity,
            secondsPerLiquidityInsideInitialX128,
            secondsPerLiquidityInsideX128,
            block.timestamp
        );

        incentive.totalSecondsClaimedX128 += secondsInsideX128;
        incentive.totalRewardUnclaimed -= reward;
        rewards[key.rewardToken][deposit.owner] += reward;

        Stake storage stake = _stakes[tokenId][incentiveId];
        delete stake.secondsPerLiquidityInsideInitialX128;
        delete stake.liquidityNoOverflow;
        if (liquidity >= type(uint96).max) delete stake.liquidityIfOverflow;

        emit TokenUnstaked(tokenId, incentiveId);
    }

    /// @inheritdoc ISnowballStaker
    function claimReward(
        IERC20Minimal rewardToken,
        address to,
        uint256 amountRequested
    ) external override returns (uint256 reward) {
        reward = rewards[rewardToken][msg.sender];
        if (amountRequested != 0 && amountRequested < reward) {
            reward = amountRequested;
        }

        rewards[rewardToken][msg.sender] -= reward;
        TransferHelperExtended.safeTransfer(address(rewardToken), to, reward);

        emit RewardClaimed(to, reward);
    }

    /// @inheritdoc ISnowballStaker
    function getRewardInfo(IncentiveKey memory key, uint256 tokenId)
        external view override
        returns (uint256 reward, uint160 secondsInsideX128)
    {
        bytes32 incentiveId = IncentiveId.compute(key);
        (uint160 secondsPerLiquidityInsideInitialX128, uint128 liquidity) = stakes(tokenId, incentiveId);
        require(liquidity > 0, 'stake does not exist');

        Deposit memory deposit = deposits[tokenId];
        Incentive memory incentive = incentives[incentiveId];

        (, uint160 secondsPerLiquidityInsideX128, ) =
            key.pool.snapshotCumulativesInside(deposit.tickLower, deposit.tickUpper);

        (reward, secondsInsideX128) = RewardMath.computeRewardAmount(
            incentive.totalRewardUnclaimed,
            incentive.totalSecondsClaimedX128,
            key.startTime,
            key.endTime,
            liquidity,
            secondsPerLiquidityInsideInitialX128,
            secondsPerLiquidityInsideX128,
            block.timestamp
        );
    }

    // ═══════════════════════════════════════════════════════════════
    //  Fee collection (Snowball addition)
    // ═══════════════════════════════════════════════════════════════

    /// @inheritdoc ISnowballStaker
    /// @notice Collect accumulated swap fees for a staked LP position
    /// @dev Only the deposit owner can collect fees. Fees are sent directly to `recipient`.
    function collectFee(uint256 tokenId, address recipient)
        external override
        returns (uint256 amount0, uint256 amount1)
    {
        Deposit memory deposit = deposits[tokenId];
        require(deposit.owner == msg.sender, 'only deposit owner');
        require(recipient != address(0), 'invalid recipient');

        // NPM.collect() sends accrued fees to the specified recipient.
        // Since this contract is the NFT owner, only it can call collect().
        INonfungiblePositionManager.CollectParams memory params = INonfungiblePositionManager.CollectParams({
            tokenId: tokenId,
            recipient: recipient,
            amount0Max: type(uint128).max,
            amount1Max: type(uint128).max
        });

        (amount0, amount1) = nonfungiblePositionManager.collect(params);

        emit FeeCollected(tokenId, recipient, amount0, amount1);
    }

    // ═══════════════════════════════════════════════════════════════
    //  Internal
    // ═══════════════════════════════════════════════════════════════

    function _stakeToken(IncentiveKey memory key, uint256 tokenId) private {
        require(block.timestamp >= key.startTime, 'incentive not started');
        require(block.timestamp < key.endTime, 'incentive ended');

        bytes32 incentiveId = IncentiveId.compute(key);
        require(incentives[incentiveId].totalRewardUnclaimed > 0, 'non-existent incentive');
        require(_stakes[tokenId][incentiveId].liquidityNoOverflow == 0, 'already staked');

        (IUniswapV3Pool pool, int24 tickLower, int24 tickUpper, uint128 liquidity) =
            NFTPositionInfo.getPositionInfo(factory, nonfungiblePositionManager, tokenId);

        require(pool == key.pool, 'token pool is not the incentive pool');
        require(liquidity > 0, 'cannot stake token with 0 liquidity');

        deposits[tokenId].numberOfStakes++;
        incentives[incentiveId].numberOfStakes++;

        (, uint160 secondsPerLiquidityInsideX128, ) = pool.snapshotCumulativesInside(tickLower, tickUpper);

        if (liquidity >= type(uint96).max) {
            _stakes[tokenId][incentiveId] = Stake({
                secondsPerLiquidityInsideInitialX128: secondsPerLiquidityInsideX128,
                liquidityNoOverflow: type(uint96).max,
                liquidityIfOverflow: liquidity
            });
        } else {
            Stake storage stake = _stakes[tokenId][incentiveId];
            stake.secondsPerLiquidityInsideInitialX128 = secondsPerLiquidityInsideX128;
            stake.liquidityNoOverflow = uint96(liquidity);
        }

        emit TokenStaked(tokenId, incentiveId, liquidity);
    }
}
