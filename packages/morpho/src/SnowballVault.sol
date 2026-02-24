// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity 0.8.24;

// Snowball Vault -- MetaMorpho vault fork on Creditcoin
// Original: https://github.com/morpho-org/metamorpho (GPL-2.0)

import {ISnowballVault} from "./interfaces/ISnowballVault.sol";

/**
 * @title SnowballVault
 * @notice ERC4626-compatible vault that allocates liquidity across SnowballLend markets.
 *         Curators set supply queues and caps; allocators rebalance positions.
 * @dev Fork of MetaMorpho. License: GPL-2.0-or-later.
 */
contract SnowballVault is ISnowballVault {
    // ERC20 state
    string public name;
    string public symbol;
    uint8 public constant decimals = 18;
    uint256 public totalSupply;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    // ERC4626 state
    address public immutable asset;
    address public immutable snowballLend;

    // Vault management
    address public owner;
    address public curator;
    address public allocator;
    uint256 public timelock;
    uint256 public fee;
    address public feeRecipient;

    // Supply queue: ordered list of market IDs to supply into
    bytes32[] public supplyQueue;
    // Per-market caps
    mapping(bytes32 => uint256) public marketCap;

    event Deposit(address indexed sender, address indexed owner, uint256 assets, uint256 shares);
    event Withdraw(address indexed sender, address indexed receiver, address indexed owner, uint256 assets, uint256 shares);
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    event SetCurator(address indexed curator);
    event SetAllocator(address indexed allocator);
    event SetSupplyQueue(bytes32[] newSupplyQueue);
    event SetMarketCap(bytes32 indexed id, uint256 newCap);
    event SetFee(uint256 newFee);
    event SetFeeRecipient(address indexed newFeeRecipient);

    constructor(
        address _snowballLend,
        address _initialOwner,
        uint256 _initialTimelock,
        address _asset,
        string memory _name,
        string memory _symbol
    ) {
        snowballLend = _snowballLend;
        owner = _initialOwner;
        timelock = _initialTimelock;
        asset = _asset;
        name = _name;
        symbol = _symbol;
    }

    // ERC4626 core (stub implementations)

    function totalAssets() external view returns (uint256) {
        return totalSupply; // simplified: 1:1 for stub
    }

    function deposit(uint256 assets, address receiver) external returns (uint256 shares) {
        shares = assets; // 1:1 stub
        totalSupply += shares;
        balanceOf[receiver] += shares;
        emit Deposit(msg.sender, receiver, assets, shares);
    }

    function mint(uint256 shares, address receiver) external returns (uint256 assets) {
        assets = shares;
        totalSupply += shares;
        balanceOf[receiver] += shares;
        emit Deposit(msg.sender, receiver, assets, shares);
    }

    function withdraw(uint256 assets, address receiver, address _owner) external returns (uint256 shares) {
        shares = assets;
        balanceOf[_owner] -= shares;
        totalSupply -= shares;
        emit Withdraw(msg.sender, receiver, _owner, assets, shares);
    }

    function redeem(uint256 shares, address receiver, address _owner) external returns (uint256 assets) {
        assets = shares;
        balanceOf[_owner] -= shares;
        totalSupply -= shares;
        emit Withdraw(msg.sender, receiver, _owner, assets, shares);
    }

    function previewDeposit(uint256 assets) external pure returns (uint256) { return assets; }
    function previewMint(uint256 shares) external pure returns (uint256) { return shares; }
    function previewWithdraw(uint256 assets) external pure returns (uint256) { return assets; }
    function previewRedeem(uint256 shares) external pure returns (uint256) { return shares; }
    function maxDeposit(address) external pure returns (uint256) { return type(uint256).max; }
    function maxMint(address) external pure returns (uint256) { return type(uint256).max; }
    function maxWithdraw(address _owner) external view returns (uint256) { return balanceOf[_owner]; }
    function maxRedeem(address _owner) external view returns (uint256) { return balanceOf[_owner]; }

    // Management

    function setCurator(address _curator) external {
        require(msg.sender == owner, "SnowballVault: not owner");
        curator = _curator;
        emit SetCurator(_curator);
    }

    function setAllocator(address _allocator) external {
        require(msg.sender == owner || msg.sender == curator, "SnowballVault: unauthorized");
        allocator = _allocator;
        emit SetAllocator(_allocator);
    }

    function setSupplyQueue(bytes32[] calldata newSupplyQueue) external {
        require(msg.sender == allocator || msg.sender == curator || msg.sender == owner, "SnowballVault: unauthorized");
        supplyQueue = newSupplyQueue;
        emit SetSupplyQueue(newSupplyQueue);
    }

    function setMarketCap(bytes32 id, uint256 newCap) external {
        require(msg.sender == curator || msg.sender == owner, "SnowballVault: unauthorized");
        marketCap[id] = newCap;
        emit SetMarketCap(id, newCap);
    }

    function setFee(uint256 newFee) external {
        require(msg.sender == owner, "SnowballVault: not owner");
        fee = newFee;
        emit SetFee(newFee);
    }

    function setFeeRecipient(address _feeRecipient) external {
        require(msg.sender == owner, "SnowballVault: not owner");
        feeRecipient = _feeRecipient;
        emit SetFeeRecipient(_feeRecipient);
    }

    // ERC20

    function transfer(address to, uint256 amount) external returns (bool) {
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        emit Transfer(msg.sender, to, amount);
        return true;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        allowance[from][msg.sender] -= amount;
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        emit Transfer(from, to, amount);
        return true;
    }
}
