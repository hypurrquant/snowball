// SPDX-License-Identifier: GPL-3.0-or-later
// Based on WETH9 by Dapphub — adapted for Creditcoin's native CTC token.
// Compatible with Uniswap V3 IWETH9 interface and Aave V3 PeripheryPayments.
pragma solidity ^0.8.10;

/// @title  WCTC — Wrapped CTC
/// @notice WETH9-compatible wrapper for CTC, the native token of Creditcoin.
///         Implements deposit() / withdraw() so that Uniswap V3 periphery
///         contracts (SwapRouter.unwrapWETH9, PeripheryPayments) and Aave V3
///         can treat wCTC exactly like WETH9 on Ethereum mainnet.
contract WCTC {
    string public name     = "Wrapped CTC";
    string public symbol   = "wCTC";
    uint8  public decimals = 18;

    event Approval(address indexed src, address indexed guy, uint256 wad);
    event Transfer(address indexed src, address indexed dst, uint256 wad);
    event Deposit(address indexed dst, uint256 wad);
    event Withdrawal(address indexed src, uint256 wad);

    mapping(address => uint256)                       public balanceOf;
    mapping(address => mapping(address => uint256))   public allowance;

    // ─── Wrap / Unwrap ───────────────────────────────────────────────────────

    /// @notice Accepts CTC and mints an equal amount of wCTC to the caller.
    receive() external payable {
        deposit();
    }

    /// @notice Wrap msg.value CTC into wCTC.
    function deposit() public payable {
        balanceOf[msg.sender] += msg.value;
        emit Deposit(msg.sender, msg.value);
    }

    /// @notice Unwrap `wad` wCTC back into native CTC and send to the caller.
    /// @param wad Amount of wCTC (wei) to unwrap.
    function withdraw(uint256 wad) public {
        require(balanceOf[msg.sender] >= wad, "WCTC: insufficient balance");
        balanceOf[msg.sender] -= wad;
        payable(msg.sender).transfer(wad);
        emit Withdrawal(msg.sender, wad);
    }

    // ─── ERC-20 ──────────────────────────────────────────────────────────────

    /// @notice Total wCTC in existence equals the CTC held by this contract.
    function totalSupply() public view returns (uint256) {
        return address(this).balance;
    }

    function approve(address guy, uint256 wad) public returns (bool) {
        allowance[msg.sender][guy] = wad;
        emit Approval(msg.sender, guy, wad);
        return true;
    }

    function transfer(address dst, uint256 wad) public returns (bool) {
        return transferFrom(msg.sender, dst, wad);
    }

    function transferFrom(address src, address dst, uint256 wad) public returns (bool) {
        require(balanceOf[src] >= wad, "WCTC: insufficient balance");

        if (src != msg.sender && allowance[src][msg.sender] != type(uint256).max) {
            require(allowance[src][msg.sender] >= wad, "WCTC: insufficient allowance");
            allowance[src][msg.sender] -= wad;
        }

        balanceOf[src] -= wad;
        balanceOf[dst] += wad;

        emit Transfer(src, dst, wad);
        return true;
    }
}
