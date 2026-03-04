// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "forge-std/Test.sol";

import "../../contracts/src/AddressesRegistry.sol";
import "../../contracts/src/BorrowerOperations.sol";
import "../../contracts/src/TroveManager.sol";
import "../../contracts/src/StabilityPool.sol";
import "../../contracts/src/ActivePool.sol";
import "../../contracts/src/DefaultPool.sol";
import "../../contracts/src/CollSurplusPool.sol";
import "../../contracts/src/SortedTroves.sol";
import "../../contracts/src/GasPool.sol";
import "../../contracts/src/SbUSDToken.sol";
import "../../contracts/src/TroveNFT.sol";
import "../../contracts/src/HintHelpers.sol";
import "../../contracts/src/MultiTroveGetter.sol";
import "../../contracts/src/CollateralRegistry.sol";
import "../../contracts/src/RedemptionHelper.sol";

import "../../contracts/src/Mocks/CreditcoinPriceFeed.sol";
import "../../contracts/src/Mocks/MockWCTC.sol";
import "../../contracts/src/Mocks/MockInterestRouter.sol";

import {IMetadataNFT} from "../../contracts/src/NFTMetadata/MetadataNFT.sol";
import "../../contracts/src/Interfaces/IAddressesRegistry.sol";

/// @dev Minimal mock MetadataNFT for tests
contract MockMetadataNFT is IMetadataNFT {
    function uri(TroveData memory) external pure override returns (string memory) {
        return "";
    }
}

contract CDPIntegrationTest is Test {
    // Core contracts
    AddressesRegistry public addressesRegistry;
    BorrowerOperations public borrowerOperations;
    TroveManager public troveManager;
    StabilityPool public stabilityPool;
    ActivePool public activePool;
    DefaultPool public defaultPool;
    CollSurplusPool public collSurplusPool;
    SortedTroves public sortedTroves;
    GasPool public gasPool;
    SbUSDToken public sbUSDToken;
    TroveNFT public troveNFT;
    HintHelpers public hintHelpers;
    MultiTroveGetter public multiTroveGetter;
    CollateralRegistry public collateralRegistry;

    // Mocks
    CreditcoinPriceFeed public priceFeed;
    MockWCTC public wCTC;
    MockInterestRouter public interestRouter;
    MockMetadataNFT public mockMetadataNFT;

    // Actors
    address public alice = makeAddr("alice");
    address public bob = makeAddr("bob");

    uint256 constant INITIAL_PRICE = 2000e18;

    function setUp() public {
        // 1. Deploy standalone mocks
        priceFeed = new CreditcoinPriceFeed(INITIAL_PRICE);
        wCTC = new MockWCTC();
        interestRouter = new MockInterestRouter();
        mockMetadataNFT = new MockMetadataNFT();
        sbUSDToken = new SbUSDToken(address(this));

        // 2. Deploy AddressesRegistry
        addressesRegistry = new AddressesRegistry(
            address(this), // owner
            150e16, // CCR
            110e16, // MCR
            10e16,  // BCR
            110e16, // SCR
            5e16,   // LIQ_PENALTY_SP
            10e16   // LIQ_PENALTY_REDIST
        );

        // 3. Pre-compute addresses for all registry-dependent contracts
        //    Each `new` call increments deployer nonce by 1
        uint64 nonce = uint64(vm.getNonce(address(this)));

        address borrowerOpsAddr     = vm.computeCreateAddress(address(this), nonce);
        address troveManagerAddr    = vm.computeCreateAddress(address(this), nonce + 1);
        address stabilityPoolAddr   = vm.computeCreateAddress(address(this), nonce + 2);
        address activePoolAddr      = vm.computeCreateAddress(address(this), nonce + 3);
        address defaultPoolAddr     = vm.computeCreateAddress(address(this), nonce + 4);
        address collSurplusPoolAddr = vm.computeCreateAddress(address(this), nonce + 5);
        address sortedTrovesAddr    = vm.computeCreateAddress(address(this), nonce + 6);
        address gasPoolAddr         = vm.computeCreateAddress(address(this), nonce + 7);
        address troveNFTAddr        = vm.computeCreateAddress(address(this), nonce + 8);
        address collRegAddr         = vm.computeCreateAddress(address(this), nonce + 9);
        address hintHelpersAddr     = vm.computeCreateAddress(address(this), nonce + 10);
        address multiTroveGetAddr   = vm.computeCreateAddress(address(this), nonce + 11);

        // 4. Wire addresses BEFORE deploying (contracts read registry in constructors)
        IAddressesRegistry.AddressVars memory vars = IAddressesRegistry.AddressVars({
            collToken: IERC20Metadata(address(wCTC)),
            borrowerOperations: IBorrowerOperations(borrowerOpsAddr),
            troveManager: ITroveManager(troveManagerAddr),
            troveNFT: ITroveNFT(troveNFTAddr),
            metadataNFT: IMetadataNFT(address(mockMetadataNFT)),
            stabilityPool: IStabilityPool(stabilityPoolAddr),
            priceFeed: IPriceFeed(address(priceFeed)),
            activePool: IActivePool(activePoolAddr),
            defaultPool: IDefaultPool(defaultPoolAddr),
            gasPoolAddress: gasPoolAddr,
            collSurplusPool: ICollSurplusPool(collSurplusPoolAddr),
            sortedTroves: ISortedTroves(sortedTrovesAddr),
            interestRouter: IInterestRouter(address(interestRouter)),
            hintHelpers: IHintHelpers(hintHelpersAddr),
            multiTroveGetter: IMultiTroveGetter(multiTroveGetAddr),
            collateralRegistry: ICollateralRegistry(collRegAddr),
            sbUSDToken: ISbUSDToken(address(sbUSDToken)),
            WETH: IWETH(address(wCTC))
        });
        addressesRegistry.setAddresses(vars);

        // 5. Deploy contracts in exact nonce order (must match pre-computed addresses)
        borrowerOperations = new BorrowerOperations(addressesRegistry);
        troveManager = new TroveManager(addressesRegistry);
        stabilityPool = new StabilityPool(addressesRegistry);
        activePool = new ActivePool(addressesRegistry);
        defaultPool = new DefaultPool(addressesRegistry);
        collSurplusPool = new CollSurplusPool(addressesRegistry);
        sortedTroves = new SortedTroves(addressesRegistry);
        gasPool = new GasPool(addressesRegistry);
        troveNFT = new TroveNFT(addressesRegistry);

        // CollateralRegistry has a different constructor
        IERC20Metadata[] memory tokens = new IERC20Metadata[](1);
        tokens[0] = IERC20Metadata(address(wCTC));
        ITroveManager[] memory troveManagers = new ITroveManager[](1);
        troveManagers[0] = ITroveManager(troveManagerAddr);
        collateralRegistry = new CollateralRegistry(sbUSDToken, tokens, troveManagers);

        hintHelpers = new HintHelpers(collateralRegistry);
        multiTroveGetter = new MultiTroveGetter(collateralRegistry);

        // 6. Wire SbUSDToken permissions
        sbUSDToken.setBranchAddresses(
            address(troveManager),
            address(stabilityPool),
            address(borrowerOperations),
            address(activePool)
        );
        sbUSDToken.setCollateralRegistry(address(collateralRegistry));

        // 7. Fund test actors
        vm.startPrank(alice);
        wCTC.faucet(10_000 ether);
        wCTC.approve(address(borrowerOperations), type(uint256).max);
        vm.stopPrank();

        vm.startPrank(bob);
        wCTC.faucet(10_000 ether);
        wCTC.approve(address(borrowerOperations), type(uint256).max);
        vm.stopPrank();
    }

    function test_deployment() public view {
        assertEq(address(addressesRegistry.collToken()), address(wCTC));
        assertEq(address(addressesRegistry.priceFeed()), address(priceFeed));
        assertEq(address(addressesRegistry.WETH()), address(wCTC));
        assertTrue(address(borrowerOperations) != address(0));
        assertTrue(address(troveManager) != address(0));
    }

    function test_openTrove() public {
        uint256 collAmount = 10 ether;
        uint256 debtAmount = 5000e18;
        uint256 annualRate = 5e16;

        vm.startPrank(alice);
        uint256 troveId = borrowerOperations.openTrove(
            alice, 0, collAmount, debtAmount, 0, 0,
            annualRate, type(uint256).max,
            address(0), address(0), address(0)
        );
        vm.stopPrank();

        assertTrue(troveId != 0, "Trove ID should be non-zero");
        assertGe(sbUSDToken.balanceOf(alice), debtAmount, "Alice should have sbUSD");
    }

    function test_openAndCloseTrove() public {
        uint256 collAmount = 10 ether;
        uint256 debtAmount = 5000e18;
        uint256 annualRate = 5e16;

        vm.startPrank(alice);
        uint256 troveId = borrowerOperations.openTrove(
            alice, 0, collAmount, debtAmount, 0, 0,
            annualRate, type(uint256).max,
            address(0), address(0), address(0)
        );

        // Alice needs more sbUSD than she borrowed (debt includes upfront fee).
        // Mint extra sbUSD from another trove (Bob) to cover the fee.
        vm.stopPrank();
        vm.startPrank(bob);
        borrowerOperations.openTrove(
            bob, 0, 10 ether, 5000e18, 0, 0,
            annualRate, type(uint256).max,
            address(0), address(0), address(0)
        );
        // Transfer enough to Alice to cover her upfront fee
        sbUSDToken.transfer(alice, 100e18);
        vm.stopPrank();

        vm.startPrank(alice);
        sbUSDToken.approve(address(borrowerOperations), type(uint256).max);
        borrowerOperations.closeTrove(troveId);
        vm.stopPrank();
    }

    function test_repayBold() public {
        uint256 collAmount = 10 ether;
        uint256 debtAmount = 5000e18;
        uint256 annualRate = 5e16;

        vm.startPrank(alice);
        uint256 troveId = borrowerOperations.openTrove(
            alice, 0, collAmount, debtAmount, 0, 0,
            annualRate, type(uint256).max,
            address(0), address(0), address(0)
        );

        sbUSDToken.approve(address(borrowerOperations), type(uint256).max);
        borrowerOperations.repayBold(troveId, 1000e18);
        vm.stopPrank();

        assertLt(sbUSDToken.balanceOf(alice), debtAmount);
    }

    function test_addColl() public {
        uint256 collAmount = 10 ether;
        uint256 debtAmount = 5000e18;
        uint256 annualRate = 5e16;

        vm.startPrank(alice);
        uint256 troveId = borrowerOperations.openTrove(
            alice, 0, collAmount, debtAmount, 0, 0,
            annualRate, type(uint256).max,
            address(0), address(0), address(0)
        );
        borrowerOperations.addColl(troveId, 5 ether);
        vm.stopPrank();
    }

    function test_stabilityPoolDeposit() public {
        uint256 collAmount = 10 ether;
        uint256 debtAmount = 5000e18;
        uint256 annualRate = 5e16;

        vm.startPrank(alice);
        borrowerOperations.openTrove(
            alice, 0, collAmount, debtAmount, 0, 0,
            annualRate, type(uint256).max,
            address(0), address(0), address(0)
        );

        sbUSDToken.approve(address(stabilityPool), 2000e18);
        stabilityPool.provideToSP(2000e18, false);
        vm.stopPrank();

        assertEq(stabilityPool.getCompoundedBoldDeposit(alice), 2000e18);
    }

    function test_priceFeedMock() public {
        (uint256 price, bool oracleFailure) = priceFeed.fetchPrice();
        assertEq(price, INITIAL_PRICE);
        assertFalse(oracleFailure, "Oracle should be healthy");

        priceFeed.setPrice(3000e18);
        (price, oracleFailure) = priceFeed.fetchPrice();
        assertEq(price, 3000e18);
        assertFalse(oracleFailure);
    }

    function test_wCTCWrapUnwrap() public {
        vm.deal(alice, 10 ether);
        vm.startPrank(alice);

        wCTC.deposit{value: 5 ether}();
        assertEq(wCTC.balanceOf(alice), 10_005 ether);

        wCTC.withdraw(5 ether);
        assertEq(alice.balance, 10 ether);
        vm.stopPrank();
    }
}
