// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test} from "forge-std/Test.sol";
import {SnowballInterestRouter} from "../src/interest/SnowballInterestRouter.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockSbUSD is ERC20 {
    constructor() ERC20("sbUSD", "sbUSD") {}
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

contract SnowballInterestRouterTest is Test {
    SnowballInterestRouter router;
    MockSbUSD sbUSD;

    address morphoTarget = makeAddr("morpho");
    address treasury = makeAddr("treasury");
    address nobody = makeAddr("nobody");

    uint256 constant MORPHO_SPLIT = 7000; // 70%
    uint256 constant MIN_AMOUNT = 100e18;

    function setUp() public {
        sbUSD = new MockSbUSD();
        router = new SnowballInterestRouter(
            address(sbUSD),
            morphoTarget,
            treasury,
            MORPHO_SPLIT,
            MIN_AMOUNT
        );
    }

    function test_distribute_splits_correctly() public {
        uint256 amount = 1000e18;
        sbUSD.mint(address(router), amount);

        router.distribute();

        uint256 expectedMorpho = (amount * MORPHO_SPLIT) / 10000;
        uint256 expectedTreasury = amount - expectedMorpho;

        assertEq(sbUSD.balanceOf(morphoTarget), expectedMorpho);
        assertEq(sbUSD.balanceOf(treasury), expectedTreasury);
        assertEq(sbUSD.balanceOf(address(router)), 0);
    }

    function test_distribute_revertsUnderMin() public {
        sbUSD.mint(address(router), MIN_AMOUNT - 1);

        vm.expectRevert("InterestRouter: below min");
        router.distribute();
    }

    function test_distribute_atExactMin() public {
        sbUSD.mint(address(router), MIN_AMOUNT);
        router.distribute(); // should not revert
        assertEq(sbUSD.balanceOf(address(router)), 0);
    }

    function test_distribute_callableByAnyone() public {
        sbUSD.mint(address(router), 1000e18);

        vm.prank(nobody);
        router.distribute();

        assertGt(sbUSD.balanceOf(morphoTarget), 0);
    }

    function test_setTargets() public {
        address newMorpho = makeAddr("newMorpho");
        address newTreasury = makeAddr("newTreasury");

        router.setTargets(newMorpho, newTreasury, 5000);

        assertEq(router.morphoTarget(), newMorpho);
        assertEq(router.treasury(), newTreasury);
        assertEq(router.morphoSplitBps(), 5000);
    }

    function test_setTargets_revertsForNonOwner() public {
        vm.prank(nobody);
        vm.expectRevert();
        router.setTargets(morphoTarget, treasury, 5000);
    }

    function test_setTargets_revertsForInvalidSplit() public {
        vm.expectRevert("InterestRouter: invalid split");
        router.setTargets(morphoTarget, treasury, 10001);
    }

    function test_setMinDistributeAmount() public {
        router.setMinDistributeAmount(200e18);
        assertEq(router.minDistributeAmount(), 200e18);
    }

    function test_setMinDistributeAmount_revertsForNonOwner() public {
        vm.prank(nobody);
        vm.expectRevert();
        router.setMinDistributeAmount(200e18);
    }

    function test_setMinDistributeAmount_revertsBelowFloor() public {
        vm.expectRevert("InterestRouter: min too low");
        router.setMinDistributeAmount(1e14); // below 1e15 floor
    }

    function test_withdrawETH() public {
        vm.deal(address(router), 1 ether);
        address payable recipient = payable(makeAddr("recipient"));
        router.withdrawETH(recipient, 1 ether);
        assertEq(recipient.balance, 1 ether);
    }

    function test_withdrawETH_revertsForNonOwner() public {
        vm.deal(address(router), 1 ether);
        vm.prank(nobody);
        vm.expectRevert();
        router.withdrawETH(payable(nobody), 1 ether);
    }

    function test_distribute_fullToMorpho() public {
        router.setTargets(morphoTarget, treasury, 10000); // 100% to morpho
        sbUSD.mint(address(router), 1000e18);
        router.distribute();

        assertEq(sbUSD.balanceOf(morphoTarget), 1000e18);
        assertEq(sbUSD.balanceOf(treasury), 0);
    }

    function test_distribute_fullToTreasury() public {
        router.setTargets(morphoTarget, treasury, 0); // 0% to morpho
        sbUSD.mint(address(router), 1000e18);
        router.distribute();

        assertEq(sbUSD.balanceOf(morphoTarget), 0);
        assertEq(sbUSD.balanceOf(treasury), 1000e18);
    }

    function test_receiveETH() public {
        vm.deal(address(this), 1 ether);
        (bool ok,) = address(router).call{value: 1 ether}("");
        assertTrue(ok);
        assertEq(address(router).balance, 1 ether);
    }
}
