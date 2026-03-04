// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "../Interfaces/IWSTETH.sol";

/// @title MockLstCTC — LST CTC token implementing IWSTETH interface
/// @notice Simulates a liquid staking token for CTC on Creditcoin testnet
contract MockLstCTC is ERC20, IWSTETH {
    uint256 public exchangeRate = 1e18; // 1:1 initially
    address public owner;

    IERC20 public stCTCToken; // the underlying "staked" token (can be self-referencing for testnet)

    event ExchangeRateUpdated(uint256 newRate);

    modifier onlyOwner() {
        require(msg.sender == owner, "MockLstCTC: not owner");
        _;
    }

    constructor() ERC20("Liquid Staked CTC", "lstCTC") {
        owner = msg.sender;
    }

    /// @notice Wrap stCTC into lstCTC
    function wrap(uint256 _stETHAmount) external override returns (uint256) {
        uint256 lstAmount = getWstETHByStETH(_stETHAmount);
        _mint(msg.sender, lstAmount);
        return lstAmount;
    }

    /// @notice Unwrap lstCTC back to stCTC amount
    function unwrap(uint256 _wstETHAmount) external override returns (uint256) {
        uint256 stAmount = getStETHByWstETH(_wstETHAmount);
        _burn(msg.sender, _wstETHAmount);
        return stAmount;
    }

    /// @notice Convert stCTC to lstCTC amount
    function getWstETHByStETH(uint256 _stETHAmount) public view override returns (uint256) {
        return (_stETHAmount * 1e18) / exchangeRate;
    }

    /// @notice Convert lstCTC to stCTC amount
    function getStETHByWstETH(uint256 _wstETHAmount) public view override returns (uint256) {
        return (_wstETHAmount * exchangeRate) / 1e18;
    }

    /// @notice Exchange rate: 1 lstCTC = X stCTC
    function stEthPerToken() external view override returns (uint256) {
        return exchangeRate;
    }

    /// @notice Inverse exchange rate
    function tokensPerStEth() external view override returns (uint256) {
        return (1e18 * 1e18) / exchangeRate;
    }

    /// @notice Admin: update exchange rate to simulate staking yield
    function setExchangeRate(uint256 _rate) external onlyOwner {
        exchangeRate = _rate;
        emit ExchangeRateUpdated(_rate);
    }

    /// @notice Faucet for testnet
    function faucet(uint256 amount) external {
        require(amount <= 100_000 ether, "Max 100k per faucet call");
        _mint(msg.sender, amount);
    }

    /// @notice Transfer ownership
    function transferOwnership(address _newOwner) external onlyOwner {
        owner = _newOwner;
    }
}
