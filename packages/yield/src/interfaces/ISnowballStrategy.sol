// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

interface ISnowballStrategy {
    function vault() external view returns (address);
    function want() external view returns (address);
    function beforeDeposit() external;
    function deposit() external;
    function withdraw(uint256 amount) external;
    function balanceOf() external view returns (uint256);
    function balanceOfWant() external view returns (uint256);
    function balanceOfPool() external view returns (uint256);
    function harvest() external;
    function retireStrat() external;
    function panic() external;
    function pause() external;
    function unpause() external;
    function paused() external view returns (bool);
    function rewardsAvailable() external view returns (uint256);
    function callReward() external view returns (uint256);
    function depositFee() external view returns (uint256);
    function withdrawFee() external view returns (uint256);
}
