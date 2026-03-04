// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "../Interfaces/IWETH.sol";

/// @title MockWCTC — Wrapped CTC implementing IWETH for Creditcoin
/// @notice Drop-in replacement for WETH in Liquity V2, wraps native CTC
contract MockWCTC is ERC20, IWETH {
    event Deposit(address indexed dst, uint256 wad);
    event Withdrawal(address indexed src, uint256 wad);

    constructor() ERC20("Wrapped CTC", "wCTC") {}

    /// @notice Wrap native CTC into wCTC
    function deposit() external payable override {
        _mint(msg.sender, msg.value);
        emit Deposit(msg.sender, msg.value);
    }

    /// @notice Unwrap wCTC back to native CTC
    function withdraw(uint256 wad) external override {
        require(balanceOf(msg.sender) >= wad, "MockWCTC: insufficient balance");
        _burn(msg.sender, wad);
        (bool success,) = msg.sender.call{value: wad}("");
        require(success, "MockWCTC: CTC transfer failed");
        emit Withdrawal(msg.sender, wad);
    }

    /// @notice Returns 18 decimals (IERC20Metadata override)
    function decimals() public pure override(ERC20, IERC20Metadata) returns (uint8) {
        return 18;
    }

    /// @notice Faucet for testnet — anyone can mint
    function faucet(uint256 amount) external {
        require(amount <= 100_000 ether, "Max 100k per faucet call");
        _mint(msg.sender, amount);
    }

    /// @notice Accept native CTC and auto-wrap
    receive() external payable {
        _mint(msg.sender, msg.value);
        emit Deposit(msg.sender, msg.value);
    }
}
