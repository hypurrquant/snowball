// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IOptionsVault {
    event LPDeposited(address indexed lp, uint256 amount, uint256 shares);
    event WithdrawRequested(address indexed lp, uint256 shares, uint256 unlockTime);
    event WithdrawExecuted(address indexed lp, uint256 amount, uint256 shares);
    event CollateralLocked(uint256 amount);
    event CollateralReleased(uint256 amount);
    event WinnerPaid(address indexed winner, uint256 amount);
    event WinningsReceived(uint256 amount);

    function deposit() external payable;
    function requestWithdraw(uint256 shares) external;
    function executeWithdraw() external;

    function sharesOf(address lp) external view returns (uint256);
    function totalShares() external view returns (uint256);
    function totalDeposited() external view returns (uint256);
    function lockedCollateral() external view returns (uint256);
    function availableLiquidity() external view returns (uint256);

    function lockCollateral(uint256 amount) external;
    function releaseCollateral(uint256 amount) external;
    function payWinner(address winner, uint256 amount) external;
    function receiveWinnings() external payable;
}
