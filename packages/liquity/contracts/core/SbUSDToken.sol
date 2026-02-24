// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "../interfaces/ISbUSDToken.sol";

/// @title SbUSDToken — Snowball USD stablecoin (Liquity V2 BOLD fork)
/// @dev Uses OpenZeppelin Ownable for standard ownership management (transferOwnership, renounceOwnership).
contract SbUSDToken is ERC20, ERC20Permit, Ownable, ISbUSDToken {
    address public collateralRegistryAddress;

    // Per-branch authorized minters/burners
    mapping(address => bool) public troveManagers;
    mapping(address => bool) public stabilityPools;
    mapping(address => bool) public borrowerOperations;
    mapping(address => bool) public activePools;

    modifier onlyAuthorized() {
        require(
            troveManagers[msg.sender] ||
            stabilityPools[msg.sender] ||
            borrowerOperations[msg.sender] ||
            activePools[msg.sender],
            "SbUSD: not authorized"
        );
        _;
    }

    constructor()
        ERC20("Snowball USD", "sbUSD")
        ERC20Permit("Snowball USD")
        Ownable(msg.sender)
    {}

    function setBranchAddresses(
        address _troveManagerAddress,
        address _stabilityPoolAddress,
        address _borrowerOperationsAddress,
        address _activePoolAddress
    ) external override onlyOwner {
        troveManagers[_troveManagerAddress] = true;
        stabilityPools[_stabilityPoolAddress] = true;
        borrowerOperations[_borrowerOperationsAddress] = true;
        activePools[_activePoolAddress] = true;
    }

    function setCollateralRegistry(address _collateralRegistryAddress) external override onlyOwner {
        collateralRegistryAddress = _collateralRegistryAddress;
    }

    function mint(address _account, uint256 _amount) external override onlyAuthorized {
        _mint(_account, _amount);
    }

    function burn(address _account, uint256 _amount) external override onlyAuthorized {
        _burn(_account, _amount);
    }
}
