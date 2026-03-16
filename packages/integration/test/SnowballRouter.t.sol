// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test} from "forge-std/Test.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {SnowballRouter} from "../src/router/SnowballRouter.sol";
import {ISnowballRouter} from "../src/interfaces/ISnowballRouter.sol";

// ─── Mock Tokens ─────────────────────────────────────────

contract MockToken is ERC20 {
    constructor(string memory name, string memory symbol) ERC20(name, symbol) {}
    function mint(address to, uint256 amount) external { _mint(to, amount); }
}

// ─── Mock BorrowerOps ────────────────────────────────────

contract MockBorrowerOps {
    MockToken public collToken;
    MockToken public sbUSD;

    constructor(address _coll, address _sbUSD) {
        collToken = MockToken(_coll);
        sbUSD = MockToken(_sbUSD);
    }

    function openTrove(
        address, uint256, uint256 _collAmount, uint256 _boldAmount,
        uint256, uint256, uint256, uint256,
        address, address, address _receiver
    ) external returns (uint256) {
        collToken.transferFrom(msg.sender, address(this), _collAmount);
        sbUSD.mint(_receiver, _boldAmount);
        return 0;
    }
}

// ─── Mock Morpho ─────────────────────────────────────────

contract MockMorpho {
    struct MarketParams {
        address loanToken; address collateralToken; address oracle; address irm; uint256 lltv;
    }

    function supply(
        MarketParams memory marketParams, uint256 assets, uint256, address, bytes memory
    ) external returns (uint256, uint256) {
        IERC20(marketParams.loanToken).transferFrom(msg.sender, address(this), assets);
        return (assets, assets);
    }
}

// ─── Mock SwapRouter ─────────────────────────────────────

contract MockSwapRouter {
    MockToken public tokenOut;

    constructor(address _tokenOut) { tokenOut = MockToken(_tokenOut); }

    struct ExactInputSingleParams {
        address tokenIn; address tokenOut; uint24 fee; address recipient;
        uint256 deadline; uint256 amountIn; uint256 amountOutMinimum; uint160 sqrtPriceLimitX96;
    }

    function exactInputSingle(ExactInputSingleParams calldata params) external payable returns (uint256) {
        IERC20(params.tokenIn).transferFrom(msg.sender, address(this), params.amountIn);
        tokenOut.mint(params.recipient, params.amountIn);
        return params.amountIn;
    }
}

// ─── Mock ERC4626 Vault ──────────────────────────────────

contract MockVault is ERC20 {
    MockToken public assetToken;

    constructor(address _asset) ERC20("Mock Vault", "mvTKN") { assetToken = MockToken(_asset); }

    function asset() external view returns (address) { return address(assetToken); }

    function deposit(uint256 assets, address receiver) external returns (uint256) {
        assetToken.transferFrom(msg.sender, address(this), assets);
        _mint(receiver, assets);
        return assets;
    }
}

// ─── Test Contract ───────────────────────────────────────

contract SnowballRouterTest is Test {
    SnowballRouter router;
    MockToken collToken;
    MockToken sbUSD;
    MockToken usdc;
    MockBorrowerOps borrowerOps;
    MockMorpho morpho;
    MockSwapRouter swapRouter;
    MockVault vault;

    address alice = makeAddr("alice");

    function setUp() public {
        collToken = new MockToken("Collateral", "COLL");
        sbUSD = new MockToken("sbUSD", "sbUSD");
        usdc = new MockToken("USDC", "USDC");

        router = new SnowballRouter();
        borrowerOps = new MockBorrowerOps(address(collToken), address(sbUSD));
        morpho = new MockMorpho();
        swapRouter = new MockSwapRouter(address(usdc));
        vault = new MockVault(address(sbUSD));

        // Whitelist all mock contracts
        router.setWhitelist(address(borrowerOps), true);
        router.setWhitelist(address(morpho), true);
        router.setWhitelist(address(swapRouter), true);
        router.setWhitelist(address(vault), true);

        // Whitelist debt tokens
        router.setTokenWhitelist(address(sbUSD), true);

        // Fund alice
        collToken.mint(alice, 100e18);

        vm.startPrank(alice);
        collToken.approve(address(router), type(uint256).max);
        sbUSD.approve(address(router), type(uint256).max);
        vm.stopPrank();
    }

    function _defaultBorrowParams() internal view returns (ISnowballRouter.BorrowParams memory) {
        return ISnowballRouter.BorrowParams({
            borrowerOps: address(borrowerOps),
            collToken: address(collToken),
            debtToken: address(sbUSD),
            collAmount: 10e18,
            debtAmount: 5000e18,
            maxUpfrontFee: 1000e18,
            annualInterestRate: 5e16,
            troveIndex: 0,
            upperHint: 0,
            lowerHint: 0
        });
    }

    function _defaultMorphoParams() internal view returns (ISnowballRouter.MorphoSupplyParams memory) {
        return ISnowballRouter.MorphoSupplyParams({
            morpho: address(morpho),
            loanToken: address(sbUSD),
            collateralToken: address(collToken),
            oracle: address(0),
            irm: address(0),
            lltv: 8e17,
            amount: 5000e18
        });
    }

    // ─── borrowAndSupply ─────────────────────────────────

    function test_borrowAndSupply() public {
        vm.prank(alice);
        router.borrowAndSupply(_defaultBorrowParams(), _defaultMorphoParams());

        assertEq(collToken.balanceOf(alice), 90e18);
        assertEq(collToken.balanceOf(address(borrowerOps)), 10e18);
        assertEq(sbUSD.balanceOf(address(morpho)), 5000e18);
        assertEq(sbUSD.balanceOf(address(router)), 0);
        assertEq(collToken.balanceOf(address(router)), 0);
    }

    // ─── borrowAndDeposit ────────────────────────────────

    function test_borrowAndDeposit() public {
        vm.prank(alice);
        router.borrowAndDeposit(_defaultBorrowParams(), address(vault));

        assertEq(vault.balanceOf(alice), 5000e18);
        assertEq(sbUSD.balanceOf(address(vault)), 5000e18);
        assertEq(sbUSD.balanceOf(address(router)), 0);
    }

    // ─── borrowSwapAndSupply ─────────────────────────────

    function test_borrowSwapAndSupply() public {
        ISnowballRouter.SwapParams memory sp = ISnowballRouter.SwapParams({
            router: address(swapRouter),
            tokenIn: address(sbUSD),
            tokenOut: address(usdc),
            fee: 3000,
            amountIn: 5000e18,
            amountOutMinimum: 4900e18,
            deadline: block.timestamp + 300
        });
        ISnowballRouter.MorphoSupplyParams memory mp = ISnowballRouter.MorphoSupplyParams({
            morpho: address(morpho),
            loanToken: address(usdc),
            collateralToken: address(collToken),
            oracle: address(0),
            irm: address(0),
            lltv: 8e17,
            amount: 5000e18
        });

        vm.prank(alice);
        router.borrowSwapAndSupply(_defaultBorrowParams(), sp, mp);

        assertEq(usdc.balanceOf(address(morpho)), 5000e18);
        assertEq(sbUSD.balanceOf(address(router)), 0);
        assertEq(usdc.balanceOf(address(router)), 0);
    }

    // ─── Whitelist enforcement ───────────────────────────

    function test_reverts_nonWhitelistedBorrowerOps() public {
        ISnowballRouter.BorrowParams memory bp = _defaultBorrowParams();
        bp.borrowerOps = makeAddr("fake");

        vm.prank(alice);
        vm.expectRevert("Router: not whitelisted");
        router.borrowAndSupply(bp, _defaultMorphoParams());
    }

    function test_reverts_nonWhitelistedVault() public {
        address fakeVault = makeAddr("fakeVault");
        vm.prank(alice);
        vm.expectRevert("Router: not whitelisted");
        router.borrowAndDeposit(_defaultBorrowParams(), fakeVault);
    }

    // ─── execute batch ───────────────────────────────────

    function test_execute_borrow_action() public {
        ISnowballRouter.ActionType[] memory actions = new ISnowballRouter.ActionType[](1);
        actions[0] = ISnowballRouter.ActionType.BORROW;
        bytes[] memory data = new bytes[](1);
        data[0] = abi.encode(_defaultBorrowParams());

        vm.prank(alice);
        router.execute(actions, data);

        assertEq(sbUSD.balanceOf(address(router)), 5000e18);
    }

    function test_execute_length_mismatch() public {
        ISnowballRouter.ActionType[] memory actions = new ISnowballRouter.ActionType[](2);
        bytes[] memory data = new bytes[](1);

        vm.prank(alice);
        vm.expectRevert("Router: length mismatch");
        router.execute(actions, data);
    }

    // ─── Deadline check ──────────────────────────────────

    function test_swap_expiredDeadline_reverts() public {
        ISnowballRouter.SwapParams memory sp = ISnowballRouter.SwapParams({
            router: address(swapRouter),
            tokenIn: address(sbUSD),
            tokenOut: address(usdc),
            fee: 3000,
            amountIn: 100e18,
            amountOutMinimum: 0,
            deadline: block.timestamp - 1 // expired
        });
        ISnowballRouter.MorphoSupplyParams memory mp = _defaultMorphoParams();
        mp.loanToken = address(usdc);

        vm.prank(alice);
        vm.expectRevert("Router: expired deadline");
        router.borrowSwapAndSupply(_defaultBorrowParams(), sp, mp);
    }

    // ─── No dust in router ───────────────────────────────

    function test_noDustLeftInRouter() public {
        vm.prank(alice);
        router.borrowAndSupply(_defaultBorrowParams(), _defaultMorphoParams());

        assertEq(sbUSD.balanceOf(address(router)), 0);
        assertEq(collToken.balanceOf(address(router)), 0);
    }
}
