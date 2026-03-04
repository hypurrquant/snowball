// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "./Dependencies/Ownable.sol";
import "../interfaces/ISbUSDToken.sol";

/// @title SbUSDToken — Snowball USD stablecoin (Liquity V2 BOLD fork)
/// @dev Uses custom Ownable that only exposes internal _renounceOwnership().
///      Ownership is permanently renounced after setCollateralRegistry() is called,
///      making the token's access control immutable.
contract SbUSDToken is Ownable, ISbUSDToken, ERC20Permit {
    string internal constant _NAME = "Snowball USD";
    string internal constant _SYMBOL = "sbUSD";

    address public collateralRegistryAddress;

    mapping(address => bool) public troveManagerAddresses;
    mapping(address => bool) public stabilityPoolAddresses;
    mapping(address => bool) public borrowerOperationsAddresses;
    mapping(address => bool) public activePoolAddresses;

    event CollateralRegistryAddressChanged(address _newCollateralRegistryAddress);
    event TroveManagerAddressAdded(address _newTroveManagerAddress);
    event StabilityPoolAddressAdded(address _newStabilityPoolAddress);
    event BorrowerOperationsAddressAdded(address _newBorrowerOperationsAddress);
    event ActivePoolAddressAdded(address _newActivePoolAddress);

    constructor()
        Ownable(msg.sender)
        ERC20(_NAME, _SYMBOL)
        ERC20Permit(_NAME)
    {}

    function setBranchAddresses(
        address _troveManagerAddress,
        address _stabilityPoolAddress,
        address _borrowerOperationsAddress,
        address _activePoolAddress
    ) external override onlyOwner {
        troveManagerAddresses[_troveManagerAddress] = true;
        emit TroveManagerAddressAdded(_troveManagerAddress);

        stabilityPoolAddresses[_stabilityPoolAddress] = true;
        emit StabilityPoolAddressAdded(_stabilityPoolAddress);

        borrowerOperationsAddresses[_borrowerOperationsAddress] = true;
        emit BorrowerOperationsAddressAdded(_borrowerOperationsAddress);

        activePoolAddresses[_activePoolAddress] = true;
        emit ActivePoolAddressAdded(_activePoolAddress);
    }

    function setCollateralRegistry(address _collateralRegistryAddress) external override onlyOwner {
        collateralRegistryAddress = _collateralRegistryAddress;
        emit CollateralRegistryAddressChanged(_collateralRegistryAddress);

        _renounceOwnership();
    }

    // --- Functions for intra-protocol calls ---

    function mint(address _account, uint256 _amount) external override {
        _requireCallerIsBOorAP();
        _mint(_account, _amount);
    }

    function burn(address _account, uint256 _amount) external override {
        _requireCallerIsCRorBOorTMorSP();
        _burn(_account, _amount);
    }

    function sendToPool(address _sender, address _poolAddress, uint256 _amount) external override {
        _requireCallerIsStabilityPool();
        _transfer(_sender, _poolAddress, _amount);
    }

    function returnFromPool(address _poolAddress, address _receiver, uint256 _amount) external override {
        _requireCallerIsStabilityPool();
        _transfer(_poolAddress, _receiver, _amount);
    }

    // --- Transfer protection ---

    function transfer(address recipient, uint256 amount) public override(ERC20, IERC20) returns (bool) {
        _requireValidRecipient(recipient);
        return super.transfer(recipient, amount);
    }

    function transferFrom(address sender, address recipient, uint256 amount)
        public
        override(ERC20, IERC20)
        returns (bool)
    {
        _requireValidRecipient(recipient);
        return super.transferFrom(sender, recipient, amount);
    }

    // --- 'require' functions ---

    function _requireValidRecipient(address _recipient) internal view {
        require(
            _recipient != address(0) && _recipient != address(this),
            "SbUSD: Cannot transfer tokens directly to the token contract or the zero address"
        );
    }

    function _requireCallerIsBOorAP() internal view {
        require(
            borrowerOperationsAddresses[msg.sender] || activePoolAddresses[msg.sender],
            "SbUSD: Caller is not BO or AP"
        );
    }

    function _requireCallerIsCRorBOorTMorSP() internal view {
        require(
            msg.sender == collateralRegistryAddress ||
            borrowerOperationsAddresses[msg.sender] ||
            troveManagerAddresses[msg.sender] ||
            stabilityPoolAddresses[msg.sender],
            "SbUSD: Caller is not CR, BO, TM, or SP"
        );
    }

    function _requireCallerIsStabilityPool() internal view {
        require(stabilityPoolAddresses[msg.sender], "SbUSD: Caller is not the StabilityPool");
    }
}
