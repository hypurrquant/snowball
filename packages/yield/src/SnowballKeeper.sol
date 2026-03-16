// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ISnowballStrategy} from "./interfaces/ISnowballStrategy.sol";

/// @title SnowballKeeper
/// @notice Automated harvesting keeper for Snowball yield strategies.
///         Keepers (bot EOAs or AgentVault) call harvestAll/harvest to trigger
///         strategy compounding. harvestInterval prevents overly frequent calls.
contract SnowballKeeper is Ownable {
    address[] public strategies;
    mapping(address => bool) public isStrategy;
    mapping(address => bool) public isKeeper;
    uint256 public harvestInterval;
    mapping(address => uint256) public lastHarvest;

    event StrategyAdded(address indexed strategy);
    event StrategyRemoved(address indexed strategy);
    event KeeperUpdated(address indexed keeper, bool status);
    event HarvestIntervalUpdated(uint256 interval);
    event Harvested(address indexed strategy, address indexed keeper);

    modifier onlyKeeper() {
        require(isKeeper[msg.sender], "!keeper");
        _;
    }

    constructor(uint256 _harvestInterval) Ownable(msg.sender) {
        harvestInterval = _harvestInterval;
        isKeeper[msg.sender] = true;
        emit KeeperUpdated(msg.sender, true);
    }

    /// @notice Harvest a range of registered strategies that are ready.
    /// @param _start Inclusive start index.
    /// @param _end   Exclusive end index (clamped to strategies.length).
    function harvestAll(uint256 _start, uint256 _end) public onlyKeeper {
        uint256 len = strategies.length;
        if (_end > len) _end = len;
        for (uint256 i = _start; i < _end; ++i) {
            address strat = strategies[i];
            if (_canHarvest(strat)) {
                _doHarvest(strat);
            }
        }
    }

    /// @notice Harvest all registered strategies that are ready (backward-compatible).
    function harvestAll() external onlyKeeper {
        harvestAll(0, strategies.length);
    }

    /// @notice Harvest a single strategy.
    function harvest(address _strategy) external onlyKeeper {
        require(isStrategy[_strategy], "!registered");
        require(_canHarvest(_strategy), "!ready");
        _doHarvest(_strategy);
    }

    /// @notice Check if a strategy is ready for harvest.
    function canHarvest(address _strategy) external view returns (bool) {
        return isStrategy[_strategy] && _canHarvest(_strategy);
    }

    /// @notice Number of registered strategies.
    function strategiesLength() external view returns (uint256) {
        return strategies.length;
    }

    // --- Admin ---

    function addStrategy(address _strategy) external onlyOwner {
        require(_strategy != address(0), "!zero");
        require(!isStrategy[_strategy], "!duplicate");
        strategies.push(_strategy);
        isStrategy[_strategy] = true;
        emit StrategyAdded(_strategy);
    }

    function removeStrategy(uint256 _index) external onlyOwner {
        require(_index < strategies.length, "!index");
        address strat = strategies[_index];
        strategies[_index] = strategies[strategies.length - 1];
        strategies.pop();
        isStrategy[strat] = false;
        emit StrategyRemoved(strat);
    }

    function setKeeper(address _keeper, bool _status) external onlyOwner {
        require(_keeper != address(0), "!zero");
        isKeeper[_keeper] = _status;
        emit KeeperUpdated(_keeper, _status);
    }

    function setHarvestInterval(uint256 _interval) external onlyOwner {
        harvestInterval = _interval;
        emit HarvestIntervalUpdated(_interval);
    }

    // --- Internal ---

    function _canHarvest(address _strategy) internal view returns (bool) {
        if (ISnowballStrategy(_strategy).paused()) return false;
        return block.timestamp >= lastHarvest[_strategy] + harvestInterval;
    }

    function _doHarvest(address _strategy) internal {
        lastHarvest[_strategy] = block.timestamp;
        ISnowballStrategy(_strategy).harvest();
        emit Harvested(_strategy, msg.sender);
    }
}
