// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface ISmartAccount {
    // ─── Events ───
    event AgentAdded(address indexed agent);
    event AgentRemoved(address indexed agent);
    event Executed(address indexed target, bytes data, bytes result);
    event ETHReceived(address indexed sender, uint256 amount);

    // ─── Views ───
    function owner() external view returns (address);
    function authorized(address agent) external view returns (bool);

    // ─── Agent management (onlyOwner) ───
    function addAgent(address agent) external;
    function removeAgent(address agent) external;

    // ─── Execution (onlyAuthorized: owner or agent) ───
    function execute(address target, bytes calldata data) external payable returns (bytes memory);
    function executeBatch(address[] calldata targets, bytes[] calldata data) external payable returns (bytes[] memory);

    // ─── Withdrawals (onlyOwner) ───
    function withdrawETH(address payable to, uint256 amount) external;
    function withdrawERC20(address token, address to, uint256 amount) external;
}
