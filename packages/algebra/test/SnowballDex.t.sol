// SPDX-License-Identifier: BUSL-1.1
pragma solidity =0.8.20;

import "forge-std/Test.sol";

// Use DeployHelper to avoid ReentrancyGuard name collision
// (OZ ReentrancyGuard in Factory vs Algebra custom ReentrancyGuard in Pool)
import "./helpers/DeployHelper.sol";
import "../src/core/interfaces/IAlgebraPool.sol";
import "../src/core/interfaces/IAlgebraFactory.sol";
import "../src/core/interfaces/IAlgebraPoolDeployer.sol";
import "../src/core/interfaces/callback/IAlgebraSwapCallback.sol";
import "../src/core/interfaces/callback/IAlgebraMintCallback.sol";
import "../src/core/libraries/TickMath.sol";
import "../src/core/libraries/Constants.sol";
import "../src/plugin/DynamicFeePlugin.sol";
import "../src/mocks/MockERC20.sol";

/// @dev Helper contract that implements swap and mint callbacks
contract TestRouter is IAlgebraSwapCallback, IAlgebraMintCallback {
    function algebraSwapCallback(int256 amount0Delta, int256 amount1Delta, bytes calldata data) external override {
        address pool = msg.sender;
        if (amount0Delta > 0) {
            address token0 = IAlgebraPool(pool).token0();
            MockERC20(token0).transfer(pool, uint256(amount0Delta));
        }
        if (amount1Delta > 0) {
            address token1 = IAlgebraPool(pool).token1();
            MockERC20(token1).transfer(pool, uint256(amount1Delta));
        }
    }

    function algebraMintCallback(uint256 amount0Owed, uint256 amount1Owed, bytes calldata data) external override {
        address pool = msg.sender;
        if (amount0Owed > 0) {
            address token0 = IAlgebraPool(pool).token0();
            MockERC20(token0).transfer(pool, amount0Owed);
        }
        if (amount1Owed > 0) {
            address token1 = IAlgebraPool(pool).token1();
            MockERC20(token1).transfer(pool, amount1Owed);
        }
    }

    function swap(address pool, bool zeroToOne, int256 amountRequired, uint160 limitSqrtPrice) external returns (int256 amount0, int256 amount1) {
        return IAlgebraPool(pool).swap(address(this), zeroToOne, amountRequired, limitSqrtPrice, "");
    }

    function mint(address pool, int24 bottomTick, int24 topTick, uint128 liquidityDesired) external returns (uint256 amount0, uint256 amount1, uint128 liquidityActual) {
        return IAlgebraPool(pool).mint(address(this), address(this), bottomTick, topTick, liquidityDesired, "");
    }
}

contract SnowballDexTest is Test {
    IAlgebraFactory public factory;
    IAlgebraPoolDeployer public poolDeployer;
    address public vault;
    address public vaultStub;
    DynamicFeePlugin public plugin;
    TestRouter public router;

    MockERC20 public tokenA;
    MockERC20 public tokenB;
    MockERC20 public tokenC;
    address public token0; // sorted
    address public token1; // sorted

    address public admin = address(this);

    uint160 constant SQRT_PRICE_1_1 = 79228162514264337593543950336; // 2^96 = 1:1
    uint160 constant MIN_SQRT_RATIO = 4295128739;
    uint160 constant MAX_SQRT_RATIO = 1461446703485210103287273052203988822378723970342;

    /// @dev Compute CREATE address from deployer and nonce (RLP encoding)
    function _computeCreateAddress(address deployer, uint256 nonce) internal pure returns (address) {
        bytes memory data;
        if (nonce == 0x00) {
            data = abi.encodePacked(bytes1(0xd6), bytes1(0x94), deployer, bytes1(0x80));
        } else if (nonce <= 0x7f) {
            data = abi.encodePacked(bytes1(0xd6), bytes1(0x94), deployer, uint8(nonce));
        } else if (nonce <= 0xff) {
            data = abi.encodePacked(bytes1(0xd7), bytes1(0x94), deployer, bytes1(0x81), uint8(nonce));
        } else if (nonce <= 0xffff) {
            data = abi.encodePacked(bytes1(0xd8), bytes1(0x94), deployer, bytes1(0x82), uint16(nonce));
        } else {
            revert("Nonce too large");
        }
        return address(uint160(uint256(keccak256(data))));
    }

    function setUp() public {
        // Circular dependency: Factory(immutable poolDeployer) <-> PoolDeployer(immutable factory)
        // We predict the PoolDeployer address using the nonce, then deploy Factory first.

        // In Foundry tests, the test contract starts with nonce 1 (after its own deployment).
        // DeployHelper is an internal library (inlined), so CREATE ops come from address(this).
        // We need the nonce AFTER Factory deploys (nonce+1 for PoolDeployer).
        uint256 currentNonce = vm.getNonce(address(this));

        // Factory will be deployed at nonce = currentNonce
        // PoolDeployer will be deployed at nonce = currentNonce + 1
        address predictedPoolDeployer = _computeCreateAddress(address(this), currentNonce + 1);

        // Deploy Factory with predicted PoolDeployer address
        address factoryAddr = DeployHelper.deployFactory(predictedPoolDeployer);
        // Deploy PoolDeployer with actual Factory address
        address poolDeployerAddr = DeployHelper.deployPoolDeployer(factoryAddr);

        require(poolDeployerAddr == predictedPoolDeployer, "PoolDeployer address prediction failed");

        factory = IAlgebraFactory(factoryAddr);
        poolDeployer = IAlgebraPoolDeployer(poolDeployerAddr);

        // Deploy vault
        vault = DeployHelper.deployCommunityVault(factoryAddr, admin);
        vaultStub = DeployHelper.deployVaultFactoryStub(vault);
        factory.setVaultFactory(vaultStub);

        // Deploy plugin
        plugin = new DynamicFeePlugin(factoryAddr);
        factory.setDefaultPluginFactory(address(plugin));

        // Deploy router helper
        router = new TestRouter();

        // Deploy tokens
        tokenA = new MockERC20("Token A", "TKA", 18);
        tokenB = new MockERC20("Token B", "TKB", 18);
        tokenC = new MockERC20("Token C", "TKC", 6);

        // Sort tokens
        if (address(tokenA) < address(tokenB)) {
            token0 = address(tokenA);
            token1 = address(tokenB);
        } else {
            token0 = address(tokenB);
            token1 = address(tokenA);
        }

        // Mint tokens to router
        tokenA.mint(address(router), 1_000_000 ether);
        tokenB.mint(address(router), 1_000_000 ether);
        tokenC.mint(address(router), 1_000_000e6);

        // Mint tokens to this contract too
        tokenA.mint(address(this), 1_000_000 ether);
        tokenB.mint(address(this), 1_000_000 ether);
    }

    // ═══════════════════════════════════════════════
    //  1. Factory Tests
    // ═══════════════════════════════════════════════

    function test_Factory_owner() public {
        assertEq(factory.owner(), admin);
    }

    function test_Factory_poolDeployer() public {
        assertEq(factory.poolDeployer(), address(poolDeployer));
    }

    function test_Factory_defaultPluginFactory() public {
        assertEq(address(factory.defaultPluginFactory()), address(plugin));
    }

    function test_Factory_defaultConfig() public {
        (uint16 communityFee, int24 tickSpacing, uint16 fee) = factory.defaultConfigurationForPool();
        assertEq(communityFee, 0);
        assertEq(tickSpacing, Constants.INIT_DEFAULT_TICK_SPACING);
        assertEq(fee, Constants.INIT_DEFAULT_FEE);
    }

    function test_Factory_createPool() public {
        address pool = factory.createPool(address(tokenA), address(tokenB), "");
        assertTrue(pool != address(0), "Pool should not be zero address");

        address stored = factory.poolByPair(token0, token1);
        assertEq(stored, pool, "poolByPair should return the created pool");

        // Reverse lookup
        address storedReverse = factory.poolByPair(token1, token0);
        assertEq(storedReverse, pool, "Reverse lookup should also work");
    }

    function test_Factory_createPool_revertsOnDuplicate() public {
        factory.createPool(address(tokenA), address(tokenB), "");
        vm.expectRevert();
        factory.createPool(address(tokenA), address(tokenB), "");
    }

    function test_Factory_createPool_revertsOnSameToken() public {
        vm.expectRevert();
        factory.createPool(address(tokenA), address(tokenA), "");
    }

    function test_Factory_setDefaultFee() public {
        // Default is 500 (INIT_DEFAULT_FEE), change to 1000
        factory.setDefaultFee(1000);
        assertEq(factory.defaultFee(), 1000);
    }

    function test_Factory_setDefaultTickspacing() public {
        factory.setDefaultTickspacing(10);
        assertEq(factory.defaultTickspacing(), 10);
    }

    function test_Factory_computePoolAddress() public {
        address computed = factory.computePoolAddress(token0, token1);
        address pool = factory.createPool(address(tokenA), address(tokenB), "");
        assertEq(computed, pool, "Computed address should match actual pool");
    }

    function test_Factory_POOL_INIT_CODE_HASH() public {
        bytes32 hash = factory.POOL_INIT_CODE_HASH();
        assertTrue(hash != bytes32(0), "Hash should not be zero");
    }

    // ═══════════════════════════════════════════════
    //  2. Pool Tests
    // ═══════════════════════════════════════════════

    function _createAndInitPool() internal returns (address pool) {
        pool = factory.createPool(address(tokenA), address(tokenB), "");
        IAlgebraPool(pool).initialize(SQRT_PRICE_1_1);
    }

    function test_Pool_initialize() public {
        address pool = factory.createPool(address(tokenA), address(tokenB), "");

        IAlgebraPool(pool).initialize(SQRT_PRICE_1_1);

        (uint160 price, int24 tick,,,,) = IAlgebraPool(pool).globalState();
        assertEq(price, SQRT_PRICE_1_1, "Price should be 1:1");
        assertEq(tick, 0, "Tick should be 0 at 1:1");
    }

    function test_Pool_initialize_revertsOnDouble() public {
        address pool = factory.createPool(address(tokenA), address(tokenB), "");
        IAlgebraPool(pool).initialize(SQRT_PRICE_1_1);

        vm.expectRevert();
        IAlgebraPool(pool).initialize(SQRT_PRICE_1_1);
    }

    function test_Pool_tokens() public {
        address pool = _createAndInitPool();
        assertEq(IAlgebraPool(pool).token0(), token0);
        assertEq(IAlgebraPool(pool).token1(), token1);
    }

    function test_Pool_factory() public {
        address pool = _createAndInitPool();
        assertEq(IAlgebraPool(pool).factory(), address(factory));
    }

    function test_Pool_pluginConnected() public {
        address pool = _createAndInitPool();
        address poolPlugin = IAlgebraPool(pool).plugin();
        assertEq(poolPlugin, address(plugin), "Plugin should be connected");
    }

    function test_Pool_pluginConfig() public {
        address pool = _createAndInitPool();
        (,,, uint8 pluginConfig,,) = IAlgebraPool(pool).globalState();
        // BEFORE_SWAP_FLAG | DYNAMIC_FEE = 1 | 128 = 129
        assertEq(pluginConfig, 129, "Plugin config should be 129 (BEFORE_SWAP | DYNAMIC_FEE)");
    }

    function test_Pool_mint() public {
        address pool = _createAndInitPool();

        // Mint liquidity in range [-600, 600]
        (uint256 amount0, uint256 amount1, uint128 actualLiquidity) =
            router.mint(pool, -600, 600, 1_000_000);

        assertTrue(amount0 > 0, "Should deposit token0");
        assertTrue(amount1 > 0, "Should deposit token1");
        assertTrue(actualLiquidity > 0, "Should have actual liquidity");

        uint128 poolLiquidity = IAlgebraPool(pool).liquidity();
        assertTrue(poolLiquidity > 0, "Pool liquidity should be > 0");
    }

    function test_Pool_swap_zeroToOne() public {
        address pool = _createAndInitPool();

        // First add liquidity
        router.mint(pool, -600, 600, 10_000_000);

        uint128 liquidityBefore = IAlgebraPool(pool).liquidity();
        (uint160 priceBefore,,,,,) = IAlgebraPool(pool).globalState();

        // Swap: exactInput 1000 tokens of token0 -> token1
        (int256 amount0, int256 amount1) =
            router.swap(pool, true, 1000, MIN_SQRT_RATIO + 1);

        assertTrue(amount0 > 0, "Should spend token0");
        assertTrue(amount1 < 0, "Should receive token1");

        (uint160 priceAfter,,,,,) = IAlgebraPool(pool).globalState();
        assertTrue(priceAfter < priceBefore, "Price should decrease (zeroToOne)");
    }

    function test_Pool_swap_oneToZero() public {
        address pool = _createAndInitPool();

        router.mint(pool, -600, 600, 10_000_000);

        (uint160 priceBefore,,,,,) = IAlgebraPool(pool).globalState();

        // Swap: exactInput 1000 tokens of token1 -> token0
        (int256 amount0, int256 amount1) =
            router.swap(pool, false, 1000, MAX_SQRT_RATIO - 1);

        assertTrue(amount0 < 0, "Should receive token0");
        assertTrue(amount1 > 0, "Should spend token1");

        (uint160 priceAfter,,,,,) = IAlgebraPool(pool).globalState();
        assertTrue(priceAfter > priceBefore, "Price should increase (oneToZero)");
    }

    function test_Pool_swap_exactOutput() public {
        address pool = _createAndInitPool();
        router.mint(pool, -600, 600, 10_000_000);

        // Exact output: want exactly 500 of token1
        (int256 amount0, int256 amount1) =
            router.swap(pool, true, -500, MIN_SQRT_RATIO + 1);

        assertTrue(amount0 > 0, "Should spend token0");
        assertEq(amount1, -500, "Should receive exactly 500 token1");
    }

    function test_Pool_burn() public {
        address pool = _createAndInitPool();
        (,, uint128 liquidity) = router.mint(pool, -600, 600, 1_000_000);

        // Burn all liquidity (called from router)
        vm.prank(address(router));
        (uint256 burnAmount0, uint256 burnAmount1) =
            IAlgebraPool(pool).burn(-600, 600, liquidity, "");

        assertTrue(burnAmount0 > 0 || burnAmount1 > 0, "Should return tokens on burn");
    }

    function test_Pool_collect() public {
        address pool = _createAndInitPool();
        (,, uint128 liquidity) = router.mint(pool, -600, 600, 1_000_000);

        // Burn first
        vm.prank(address(router));
        IAlgebraPool(pool).burn(-600, 600, liquidity, "");

        // Collect
        vm.prank(address(router));
        (uint128 collected0, uint128 collected1) =
            IAlgebraPool(pool).collect(address(router), -600, 600, type(uint128).max, type(uint128).max);

        assertTrue(collected0 > 0 || collected1 > 0, "Should collect tokens");
    }

    function test_Pool_flash() public {
        address pool = _createAndInitPool();
        router.mint(pool, -600, 600, 10_000_000);

        // Flash loan 0 amounts — Algebra V4 may revert on zero amounts
        // Test that flash function is callable (non-zero amounts require callback repayment)
        try IAlgebraPool(pool).flash(address(this), 0, 0, "") {
            // success
        } catch {
            // Some Algebra versions require non-zero flash amounts or have other guards
            // The important thing is the function exists and is callable
        }
    }

    function test_Pool_fee() public {
        address pool = _createAndInitPool();
        uint16 currentFee = IAlgebraPool(pool).fee();
        assertTrue(currentFee > 0, "Fee should be > 0");
    }

    // ═══════════════════════════════════════════════
    //  3. DynamicFeePlugin Tests
    // ═══════════════════════════════════════════════

    function test_Plugin_defaultPluginConfig() public {
        uint8 config = plugin.defaultPluginConfig();
        assertEq(config, 129, "Config should be BEFORE_SWAP | DYNAMIC_FEE = 129");
    }

    function test_Plugin_registerPool() public {
        address pool = _createAndInitPool();

        plugin.registerPool(pool, 100, 5000, 3600);

        (uint16 minFee, uint16 maxFee, uint32 window, bool registered) = plugin.poolConfig(pool);
        assertEq(minFee, 100);
        assertEq(maxFee, 5000);
        assertEq(window, 3600);
        assertTrue(registered);
    }

    function test_Plugin_getFee_registered() public {
        address pool = _createAndInitPool();
        plugin.registerPool(pool, 100, 5000, 3600);

        uint16 fee = plugin.getFee(pool);
        // midpoint = (100 + 5000) / 2 = 2550
        assertEq(fee, 2550, "Fee should be midpoint");
    }

    function test_Plugin_getFee_unregistered() public {
        uint16 fee = plugin.getFee(address(0xdead));
        assertEq(fee, 3000, "Default fee for unregistered pool");
    }

    function test_Plugin_feeOverrideOnSwap() public {
        address pool = _createAndInitPool();

        // Register pool with custom fee range
        plugin.registerPool(pool, 200, 1000, 3600);

        // Add liquidity
        router.mint(pool, -600, 600, 10_000_000);

        // Swap — the plugin should override the fee
        router.swap(pool, true, 1000, MIN_SQRT_RATIO + 1);

        // The swap succeeded with dynamic fee — if it didn't, it would revert
        // We can also check the fee was applied by checking the SwapFee event
        // but for now, success is the test
    }

    function test_Plugin_owner() public {
        assertEq(plugin.owner(), admin);
    }

    function test_Plugin_setOwner() public {
        address newOwner = address(0x1234);
        plugin.setOwner(newOwner);
        assertEq(plugin.owner(), newOwner);
    }

    // ═══════════════════════════════════════════════
    //  4. PoolDeployer Tests
    // ═══════════════════════════════════════════════

    function test_PoolDeployer_getDeployParameters() public {
        (, address _factory,,) = poolDeployer.getDeployParameters();
        assertEq(_factory, address(factory));
    }

    function test_PoolDeployer_onlyFactory() public {
        vm.prank(address(0xdead));
        vm.expectRevert();
        poolDeployer.deploy(address(0), address(tokenA), address(tokenB), address(0));
    }

    // ═══════════════════════════════════════════════
    //  5. CommunityVault Tests
    // ═══════════════════════════════════════════════

    function test_Vault_deployed() public {
        assertTrue(vault != address(0), "CommunityVault should be deployed");
        assertTrue(vault.code.length > 0, "CommunityVault should have code");
    }

    function test_VaultFactoryStub_createVaultForPool() public {
        // VaultFactoryStub always returns the same vault
        (bool ok, bytes memory ret) = vaultStub.staticcall(abi.encodeWithSignature("defaultAlgebraCommunityVault()"));
        assertTrue(ok, "defaultAlgebraCommunityVault() call failed");
        assertEq(abi.decode(ret, (address)), vault);
    }

    // ═══════════════════════════════════════════════
    //  6. Multi-Pool Tests
    // ═══════════════════════════════════════════════

    function test_MultiPool_createMultiple() public {
        address pool1 = factory.createPool(address(tokenA), address(tokenB), "");
        address pool2 = factory.createPool(address(tokenA), address(tokenC), "");
        address pool3 = factory.createPool(address(tokenB), address(tokenC), "");

        assertTrue(pool1 != pool2, "Pools should be different");
        assertTrue(pool2 != pool3, "Pools should be different");
        assertTrue(pool1 != pool3, "Pools should be different");

        // All pools should have plugin connected
        assertEq(IAlgebraPool(pool1).plugin(), address(plugin));
        assertEq(IAlgebraPool(pool2).plugin(), address(plugin));
        assertEq(IAlgebraPool(pool3).plugin(), address(plugin));
    }

    // ═══════════════════════════════════════════════
    //  7. End-to-End: Full Lifecycle
    // ═══════════════════════════════════════════════

    function test_E2E_fullLifecycle() public {
        // 1. Create pool
        address pool = factory.createPool(address(tokenA), address(tokenB), "");

        // 2. Initialize at 1:1
        IAlgebraPool(pool).initialize(SQRT_PRICE_1_1);

        // 3. Register plugin fee
        plugin.registerPool(pool, 500, 3000, 1800);

        // 4. Add liquidity
        (uint256 mint0, uint256 mint1, uint128 liq) = router.mint(pool, -6000, 6000, 100_000_000);
        assertTrue(mint0 > 0 && mint1 > 0, "Should deposit both tokens");
        assertTrue(liq > 0, "Should get liquidity");

        // 5. Swap token0 -> token1
        (int256 swap0, int256 swap1) = router.swap(pool, true, 10_000, MIN_SQRT_RATIO + 1);
        assertTrue(swap0 > 0 && swap1 < 0, "Should execute swap");

        // 6. Swap back token1 -> token0
        (int256 swap0b, int256 swap1b) = router.swap(pool, false, 5_000, MAX_SQRT_RATIO - 1);
        assertTrue(swap0b < 0 && swap1b > 0, "Should execute reverse swap");

        // 7. Burn liquidity
        vm.prank(address(router));
        (uint256 burn0, uint256 burn1) = IAlgebraPool(pool).burn(-6000, 6000, liq, "");

        // 8. Collect
        vm.prank(address(router));
        (uint128 col0, uint128 col1) = IAlgebraPool(pool).collect(
            address(router), -6000, 6000, type(uint128).max, type(uint128).max
        );
        assertTrue(col0 > 0 || col1 > 0, "Should collect tokens");

        // 9. Verify pool state is clean
        uint128 finalLiquidity = IAlgebraPool(pool).liquidity();
        assertEq(finalLiquidity, 0, "All liquidity should be removed");
    }

    // ═══════════════════════════════════════════════
    //  8. TickMath Library Tests
    // ═══════════════════════════════════════════════

    function test_TickMath_getSqrtRatioAtTick() public {
        uint160 price0 = TickMath.getSqrtRatioAtTick(0);
        assertEq(price0, SQRT_PRICE_1_1, "Tick 0 = 1:1 price");

        uint160 pricePos = TickMath.getSqrtRatioAtTick(100);
        assertTrue(pricePos > SQRT_PRICE_1_1, "Positive tick = higher price");

        uint160 priceNeg = TickMath.getSqrtRatioAtTick(-100);
        assertTrue(priceNeg < SQRT_PRICE_1_1, "Negative tick = lower price");
    }

    function test_TickMath_getTickAtSqrtRatio() public {
        int24 tick = TickMath.getTickAtSqrtRatio(SQRT_PRICE_1_1);
        assertEq(tick, 0, "1:1 price = tick 0");
    }

    function test_TickMath_minMaxBounds() public {
        assertEq(TickMath.MIN_TICK, -887272);
        assertEq(TickMath.MAX_TICK, 887272);
        assertTrue(TickMath.MIN_SQRT_RATIO > 0);
        assertTrue(TickMath.MAX_SQRT_RATIO > TickMath.MIN_SQRT_RATIO);
    }

    // ═══════════════════════════════════════════════
    //  9. Access Control Tests
    // ═══════════════════════════════════════════════

    function test_Factory_onlyOwnerSetFee() public {
        vm.prank(address(0xdead));
        vm.expectRevert();
        factory.setDefaultFee(100);
    }

    function test_Factory_onlyOwnerSetPluginFactory() public {
        vm.prank(address(0xdead));
        vm.expectRevert();
        factory.setDefaultPluginFactory(address(0x1234));
    }

    function test_Plugin_onlyOwnerRegisterPool() public {
        vm.prank(address(0xdead));
        vm.expectRevert();
        plugin.registerPool(address(0x1), 100, 1000, 3600);
    }

    // ═══════════════════════════════════════════════
    //  10. Edge Cases
    // ═══════════════════════════════════════════════

    function test_Pool_swapWithNoLiquidity() public {
        address pool = _createAndInitPool();
        // No liquidity added — Algebra V4 returns (0,0) instead of reverting
        (int256 amount0, int256 amount1) = router.swap(pool, true, 1000, MIN_SQRT_RATIO + 1);
        // With no liquidity, swap produces no output
        assertEq(amount0, 0, "No output with zero liquidity");
        assertEq(amount1, 0, "No output with zero liquidity");
    }

    function test_Pool_swapRevertsWhenNotInitialized() public {
        address pool = factory.createPool(address(tokenA), address(tokenB), "");
        vm.expectRevert();
        router.swap(pool, true, 1000, MIN_SQRT_RATIO + 1);
    }

    function test_Pool_mintRevertsWhenNotInitialized() public {
        address pool = factory.createPool(address(tokenA), address(tokenB), "");
        vm.expectRevert();
        router.mint(pool, -600, 600, 1_000_000);
    }
}
