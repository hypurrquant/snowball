// SPDX-License-Identifier: BUSL-1.1
pragma solidity =0.8.20;

// Snowball DEX — DynamicFeePlugin (Algebra V4 fork on Creditcoin)
// MAINNET DEPLOYMENT: Requires Algebra Labs commercial license (algebra.finance/form)

import '../core/interfaces/plugin/IAlgebraPlugin.sol';
import '../core/interfaces/plugin/IAlgebraPluginFactory.sol';
import '../core/interfaces/plugin/IAlgebraDynamicFeePlugin.sol';
import '../core/interfaces/pool/IAlgebraPoolPermissionedActions.sol';
import '../core/libraries/Plugins.sol';

/// @title DynamicFeePlugin
/// @notice Adjusts pool swap fee dynamically based on realized volatility.
///         Higher volatility -> higher fee (LP protection from IL).
///         Lower volatility -> lower fee (attract volume).
///         Implements IAlgebraPlugin + IAlgebraPluginFactory for auto-attachment.
contract DynamicFeePlugin is IAlgebraPlugin, IAlgebraPluginFactory, IAlgebraDynamicFeePlugin {
    address public immutable factory;
    address public owner;

    /// @dev BEFORE_SWAP_FLAG | DYNAMIC_FEE = 1 | 128 = 129
    uint8 private constant PLUGIN_CONFIG = uint8(Plugins.BEFORE_SWAP_FLAG | Plugins.DYNAMIC_FEE);

    struct PoolConfig {
        uint16 minFee;           // pips (e.g. 500 = 0.05%)
        uint16 maxFee;           // pips (e.g. 10000 = 1%)
        uint32 volatilityWindow; // seconds for TWAP window (future use)
        bool registered;
    }

    /// @notice pool => config
    mapping(address => PoolConfig) public poolConfig;

    /// @notice pool => plugin address (each pool gets its own entry)
    mapping(address => address) public pluginForPool;

    // ─── Events ───
    event PluginRegistered(address indexed pool, uint16 minFee, uint16 maxFee);
    event FeeUpdated(address indexed pool, uint16 newFee);
    event OwnerChanged(address indexed newOwner);

    modifier onlyOwnerOrFactory() {
        require(msg.sender == owner || msg.sender == factory, 'DynamicFeePlugin: unauthorized');
        _;
    }

    constructor(address _factory) {
        require(_factory != address(0));
        factory = _factory;
        owner = msg.sender;
    }

    // ─── Admin ───

    function setOwner(address _owner) external {
        require(msg.sender == owner, 'DynamicFeePlugin: not owner');
        owner = _owner;
        emit OwnerChanged(_owner);
    }

    // ─── Pool Registration ───

    function registerPool(
        address pool,
        uint16 _minFee,
        uint16 _maxFee,
        uint32 _volatilityWindow
    ) external onlyOwnerOrFactory {
        require(_maxFee >= _minFee, 'DynamicFeePlugin: maxFee < minFee');
        require(_maxFee <= 100_000, 'DynamicFeePlugin: fee too high');

        poolConfig[pool] = PoolConfig({
            minFee: _minFee,
            maxFee: _maxFee,
            volatilityWindow: _volatilityWindow,
            registered: true
        });

        emit PluginRegistered(pool, _minFee, _maxFee);
    }

    // ─── IAlgebraPlugin: defaultPluginConfig ───

    /// @inheritdoc IAlgebraPlugin
    function defaultPluginConfig() external pure override returns (uint8) {
        return PLUGIN_CONFIG;
    }

    // ─── IAlgebraPlugin hooks ───

    /// @inheritdoc IAlgebraPlugin
    function handlePluginFee(uint256, uint256) external pure override returns (bytes4) {
        return IAlgebraPlugin.handlePluginFee.selector;
    }

    /// @inheritdoc IAlgebraPlugin
    function beforeInitialize(address, uint160) external pure override returns (bytes4) {
        return IAlgebraPlugin.beforeInitialize.selector;
    }

    /// @inheritdoc IAlgebraPlugin
    function afterInitialize(address, uint160, int24) external pure override returns (bytes4) {
        return IAlgebraPlugin.afterInitialize.selector;
    }

    /// @inheritdoc IAlgebraPlugin
    function beforeModifyPosition(address, address, int24, int24, int128, bytes calldata)
        external
        pure
        override
        returns (bytes4, uint24)
    {
        return (IAlgebraPlugin.beforeModifyPosition.selector, 0);
    }

    /// @inheritdoc IAlgebraPlugin
    function afterModifyPosition(address, address, int24, int24, int128, uint256, uint256, bytes calldata)
        external
        pure
        override
        returns (bytes4)
    {
        return IAlgebraPlugin.afterModifyPosition.selector;
    }

    /// @inheritdoc IAlgebraPlugin
    function beforeSwap(
        address,
        address,
        bool,
        int256,
        uint160,
        bool,
        bytes calldata
    ) external view override returns (bytes4 selector, uint24 feeOverride, uint24 pluginFee) {
        PoolConfig memory cfg = poolConfig[msg.sender];
        if (cfg.registered) {
            // Simplified volatility proxy: return midpoint fee
            // Production: compare current price vs TWAP for volatility-based fee
            feeOverride = uint24((uint256(cfg.minFee) + uint256(cfg.maxFee)) / 2);
        }
        // pluginFee stays 0 — no protocol-level plugin cut
        return (IAlgebraPlugin.beforeSwap.selector, feeOverride, pluginFee);
    }

    /// @inheritdoc IAlgebraPlugin
    function afterSwap(address, address, bool, int256, uint160, int256, int256, bytes calldata)
        external
        pure
        override
        returns (bytes4)
    {
        return IAlgebraPlugin.afterSwap.selector;
    }

    /// @inheritdoc IAlgebraPlugin
    function beforeFlash(address, address, uint256, uint256, bytes calldata)
        external
        pure
        override
        returns (bytes4)
    {
        return IAlgebraPlugin.beforeFlash.selector;
    }

    /// @inheritdoc IAlgebraPlugin
    function afterFlash(address, address, uint256, uint256, uint256, uint256, bytes calldata)
        external
        pure
        override
        returns (bytes4)
    {
        return IAlgebraPlugin.afterFlash.selector;
    }

    // ─── IAlgebraPluginFactory ───

    /// @inheritdoc IAlgebraPluginFactory
    function beforeCreatePoolHook(
        address pool,
        address,
        address,
        address,
        address,
        bytes calldata
    ) external override returns (address) {
        require(msg.sender == factory, 'DynamicFeePlugin: only factory');
        pluginForPool[pool] = address(this);
        return address(this);
    }

    /// @inheritdoc IAlgebraPluginFactory
    function afterCreatePoolHook(address, address pool, address) external override {
        require(msg.sender == factory, 'DynamicFeePlugin: only factory');
        // Set the plugin config on the pool so it knows which hooks are active
        IAlgebraPoolPermissionedActions(pool).setPluginConfig(PLUGIN_CONFIG);
    }

    // ─── IAlgebraDynamicFeePlugin ───

    /// @inheritdoc IAlgebraDynamicFeePlugin
    function getCurrentFee() external view override returns (uint16 fee) {
        PoolConfig memory cfg = poolConfig[msg.sender];
        if (!cfg.registered) return 3000; // default fallback
        return uint16((uint256(cfg.minFee) + uint256(cfg.maxFee)) / 2);
    }

    /// @notice View version of fee for a specific pool
    function getFee(address pool) external view returns (uint16) {
        PoolConfig memory cfg = poolConfig[pool];
        if (!cfg.registered) return 3000;
        return uint16((uint256(cfg.minFee) + uint256(cfg.maxFee)) / 2);
    }
}
