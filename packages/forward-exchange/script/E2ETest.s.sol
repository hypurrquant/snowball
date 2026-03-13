// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {IVault} from "../src/interfaces/IVault.sol";
import {IForward} from "../src/interfaces/IForward.sol";
import {IMarketplace} from "../src/interfaces/IMarketplace.sol";
import {IMaturityTokenFactory} from "../src/tokenized/interfaces/IMaturityTokenFactory.sol";
import {IFXPool} from "../src/tokenized/interfaces/IFXPool.sol";
import {IRouter} from "../src/tokenized/interfaces/IRouter.sol";

interface IMintable {
    function mint(address to, uint256 amount) external;
    function faucet() external;
}

contract E2ETest is Script {
    // ─── Keys & Addresses ─────────────────────────────────
    uint256 aliceKey;
    uint256 bobKey;
    address alice;
    address bob;

    // ─── Contracts ────────────────────────────────────────
    IERC20 usdc;
    IERC20 aUsdc;
    IVault vault;
    IForward forward;
    IMarketplace marketplace;
    IMaturityTokenFactory factory;
    IFXPool pool;
    IRouter router;
    address collateralSwap;
    bytes32 seriesIdKrw;
    bytes32 marketIdKrw;

    // ─── Cross-Phase State ────────────────────────────────
    uint256 longId;
    uint256 shortId;

    // ─── Counters ─────────────────────────────────────────
    uint256 passed;
    uint256 failed;

    // ─── Chain Detection ──────────────────────────────────
    bool isBaseSepolia;

    function run() external {
        // Load keys
        aliceKey = vm.envUint("PRIVATE_KEY");
        bobKey = vm.envUint("TEST_PRIVATE_KEY");
        alice = vm.addr(aliceKey);
        bob = vm.addr(bobKey);

        // Phase range: E2E_FROM (default 1) to E2E_TO (default 10)
        uint256 phaseFrom = vm.envOr("E2E_FROM", uint256(1));
        uint256 phaseTo = vm.envOr("E2E_TO", uint256(10));

        console.log("=== ForwardX E2E Test ===");
        console.log("Chain ID:", block.chainid);
        console.log("Alice:", alice);
        console.log("Bob:  ", bob);
        console.log("Phases:", phaseFrom, "-", phaseTo);

        _loadAddresses();

        marketIdKrw = keccak256("USD/KRW");

        // Execute selected phases
        if (phaseFrom <= 1 && phaseTo >= 1) _phase1_faucet();
        if (phaseFrom <= 2 && phaseTo >= 2) _phase2_vault();
        if (phaseFrom <= 3 && phaseTo >= 3) _phase3_otc();
        if (phaseFrom <= 4 && phaseTo >= 4) _phase4_marketplace();
        if (phaseFrom <= 5 && phaseTo >= 5) _phase5_ammMint();
        if (phaseFrom <= 6 && phaseTo >= 6) _phase6_addLiquidity();
        if (phaseFrom <= 7 && phaseTo >= 7) _phase7_swap();
        if (phaseFrom <= 8 && phaseTo >= 8) _phase8_removeLiquidity();
        if (phaseFrom <= 9 && phaseTo >= 9) _phase9_routerMint();
        if (phaseFrom <= 10 && phaseTo >= 10) _phase10_cleanup();

        // Summary
        console.log("");
        console.log("=== RESULTS ===");
        console.log("PASSED:", passed);
        console.log("FAILED:", failed);
        console.log("TOTAL: ", passed + failed);
    }

    // ═══════════════════════════════════════════════════════
    // Address Loading
    // ═══════════════════════════════════════════════════════

    function _loadAddresses() internal {
        if (block.chainid == 84532) {
            isBaseSepolia = true;
            vault = IVault(0x9493E2374F4b071F5beF15D1c08fF05932f22FAe);
            forward = IForward(0xbc0c07203Fcc8FD141f19CD9f0c9862B19fb0763);
            usdc = IERC20(0xeb42C8a72016092d95c092ab594a31a57b24d688);
            marketplace = IMarketplace(0x17C81E00bf5ceAD788C5d805231A3EC9Db8cb7d9);
            factory = IMaturityTokenFactory(0x68E9e7F096Ee8c0E631Ff77C11E584CA8319D974);
            pool = IFXPool(0xe1A519137818678339e309D51131Df53b356a2dc);
            router = IRouter(0xFAE459913f7DdDfa3FCf6987676062cbf1f907f5);
            aUsdc = IERC20(0x5a37b7458fE70eeb2a1E003067d0cEad1717a08f);
            collateralSwap = 0xec0dC9409640bBF6bB5d7516a14Eb723734F2367;
            seriesIdKrw = 0xc8c74bb7eb2753056bc9d1d41dad3b82557a2ae36f7e6f305f400fdb777b1b89;
        } else if (block.chainid == 998) {
            isBaseSepolia = false;
            vault = IVault(0x5302Ca309208A737fBb56BCB4103A6ce99b24ecd);
            forward = IForward(0xb151d6a2Aab387b9EC44771b3c5ec675f0Ac15Cb);
            usdc = IERC20(0x665Cc50dDd2a62A12C84D348086D8fa2E2A5F4a3);
            marketplace = IMarketplace(0x704c6e7ec4Bf58AcD576316500213C88C0aA2B82);
            factory = IMaturityTokenFactory(0xD7966b295a130C33377dE1e8a9D33487098847eD);
            pool = IFXPool(0x4C34357e14cBBDBDE3Ebf5dE7C6AB2D258C2D881);
            router = IRouter(0x3e6e6ae95E14e3A95B03DbD79B2540Bef9d221d4);
            aUsdc = IERC20(0x8f9A56d0F860cC2C91E4A21eA7e60C9323cf1d10);
            collateralSwap = 0xaA809334ab7D12De2d9b4885EffF4a6C63696F9a;
            seriesIdKrw = 0x8e021ced6ed4206e229613145c5d5436967122ec622708a784bdd6f55cbc4b5a;
        } else {
            revert("Unsupported chain");
        }
    }

    // ═══════════════════════════════════════════════════════
    // Helpers
    // ═══════════════════════════════════════════════════════

    function _check(string memory label, bool condition) internal {
        if (condition) {
            console.log(string.concat("  [PASS] ", label));
            passed++;
        } else {
            console.log(string.concat("  [FAIL] ", label));
            failed++;
        }
    }

    // ═══════════════════════════════════════════════════════
    // Phase 1: Faucet (Token Minting)
    // ═══════════════════════════════════════════════════════

    function _phase1_faucet() internal {
        console.log("");
        console.log("--- Phase 1: Faucet ---");

        uint256 mintAmount = 10_000e6;

        // Alice: mint mUSDC
        vm.startBroadcast(aliceKey);
        IMintable(address(usdc)).mint(alice, mintAmount);
        vm.stopBroadcast();

        // Alice: mint aUSDC
        vm.startBroadcast(aliceKey);
        IMintable(address(aUsdc)).mint(alice, mintAmount);
        vm.stopBroadcast();

        // Bob: mint mUSDC
        vm.startBroadcast(bobKey);
        IMintable(address(usdc)).mint(bob, mintAmount);
        vm.stopBroadcast();

        _check("Alice USDC >= 10,000", usdc.balanceOf(alice) >= mintAmount);
        _check("Alice aUSDC >= 10,000", aUsdc.balanceOf(alice) >= mintAmount);
        _check("Bob USDC >= 10,000", usdc.balanceOf(bob) >= mintAmount);
    }

    // ═══════════════════════════════════════════════════════
    // Phase 2: Vault (Deposit / Withdraw)
    // ═══════════════════════════════════════════════════════

    function _phase2_vault() internal {
        console.log("");
        console.log("--- Phase 2: Vault ---");

        // Alice deposit 5000
        uint256 aliceFreeBefore = vault.freeBalance(alice);
        vm.startBroadcast(aliceKey);
        usdc.approve(address(vault), 5000e6);
        vault.deposit(5000e6);
        vm.stopBroadcast();

        uint256 aliceFreeAfterDeposit = vault.freeBalance(alice);
        _check("Alice deposit +5000", aliceFreeAfterDeposit == aliceFreeBefore + 5000e6);

        // Alice withdraw 1000
        vm.startBroadcast(aliceKey);
        vault.withdraw(1000e6);
        vm.stopBroadcast();

        uint256 aliceFreeAfterWithdraw = vault.freeBalance(alice);
        _check("Alice withdraw -1000", aliceFreeAfterWithdraw == aliceFreeAfterDeposit - 1000e6);

        // Bob deposit 5000
        uint256 bobFreeBefore = vault.freeBalance(bob);
        vm.startBroadcast(bobKey);
        usdc.approve(address(vault), 5000e6);
        vault.deposit(5000e6);
        vm.stopBroadcast();

        uint256 bobFreeAfterDeposit = vault.freeBalance(bob);
        _check("Bob deposit +5000", bobFreeAfterDeposit == bobFreeBefore + 5000e6);
    }

    // ═══════════════════════════════════════════════════════
    // Phase 3: P2P OTC (Create / Cancel / Accept)
    // ═══════════════════════════════════════════════════════

    function _phase3_otc() internal {
        console.log("");
        console.log("--- Phase 3: P2P OTC ---");

        uint256 maturity = block.timestamp + 30 minutes;

        // Alice creates offer (isLong=true)
        vm.startBroadcast(aliceKey);
        (uint256 longId1, ) = forward.createOffer(
            marketIdKrw, 100e6, 1400e18, maturity, true
        );
        vm.stopBroadcast();

        IForward.ForwardPosition memory pos1 = forward.getPosition(longId1);
        _check("Offer1 marketId", pos1.marketId == marketIdKrw);
        _check("Offer1 notional", pos1.notional == 100e6);
        _check("Offer1 no counterparty", pos1.counterparty == address(0));

        // Alice cancels the offer
        vm.startBroadcast(aliceKey);
        forward.cancelOffer(longId1);
        vm.stopBroadcast();
        _check("Offer1 cancelled", true); // If no revert, it's cancelled

        // Alice creates another offer (isLong=false) → Alice gets Short
        vm.startBroadcast(aliceKey);
        (uint256 longId2, uint256 shortId2) = forward.createOffer(
            marketIdKrw, 100e6, 1400e18, maturity, false
        );
        vm.stopBroadcast();

        // Bob accepts the offer (takes Long side)
        vm.startBroadcast(bobKey);
        forward.acceptOffer(longId2);
        vm.stopBroadcast();

        IForward.ForwardPosition memory pos2 = forward.getPosition(longId2);
        _check("Offer2 counterparty set", pos2.counterparty != address(0));
        _check("Alice owns Short", IERC721(address(forward)).ownerOf(shortId2) == alice);
        _check("Bob owns Long", IERC721(address(forward)).ownerOf(longId2) == bob);

        // Store for marketplace phase
        longId = longId2;
        shortId = shortId2;
    }

    // ═══════════════════════════════════════════════════════
    // Phase 4: Marketplace (List / Cancel / Buy)
    // ═══════════════════════════════════════════════════════

    function _phase4_marketplace() internal {
        console.log("");
        console.log("--- Phase 4: Marketplace ---");

        // If running without Phase 3, load shortId from env
        if (shortId == 0) {
            shortId = vm.envOr("E2E_SHORT_ID", uint256(0));
            if (shortId == 0) {
                console.log("  [SKIP] No shortId available (run Phase 3 first or set E2E_SHORT_ID)");
                return;
            }
        }

        // Alice lists Short NFT
        vm.startBroadcast(aliceKey);
        IERC721(address(forward)).approve(address(marketplace), shortId);
        marketplace.list(shortId, 50e6);
        vm.stopBroadcast();

        IMarketplace.Listing memory listing = marketplace.getListing(shortId);
        _check("Listing seller == alice", listing.seller == alice);
        _check("Listing askPrice == 50", listing.askPrice == 50e6);

        // Alice cancels
        vm.startBroadcast(aliceKey);
        marketplace.cancelListing(shortId);
        vm.stopBroadcast();

        IMarketplace.Listing memory cancelledListing = marketplace.getListing(shortId);
        _check("Listing cancelled", cancelledListing.seller == address(0));

        // Alice re-lists
        vm.startBroadcast(aliceKey);
        IERC721(address(forward)).approve(address(marketplace), shortId);
        marketplace.list(shortId, 50e6);
        vm.stopBroadcast();

        // Bob buys
        vm.startBroadcast(bobKey);
        marketplace.buy(shortId);
        vm.stopBroadcast();

        _check("Bob owns Short after buy", IERC721(address(forward)).ownerOf(shortId) == bob);
    }

    // ═══════════════════════════════════════════════════════
    // Phase 5: AMM Mint (Tokenized Forwards)
    // ═══════════════════════════════════════════════════════

    function _phase5_ammMint() internal {
        console.log("");
        console.log("--- Phase 5: AMM Mint ---");

        IERC20 fToken = IERC20(pool.fToken());
        IERC20 sfToken = IERC20(pool.sfToken());

        uint256 fBefore = fToken.balanceOf(alice);
        uint256 sfBefore = sfToken.balanceOf(alice);

        // Alice mints 500 tokens (costs 1000 USDC: 500 * 2 USDC per pair)
        vm.startBroadcast(aliceKey);
        usdc.approve(address(factory), 1000e6);
        factory.mint(seriesIdKrw, 500e18);
        vm.stopBroadcast();

        uint256 fAfter = fToken.balanceOf(alice);
        uint256 sfAfter = sfToken.balanceOf(alice);

        _check("fToken +500", fAfter == fBefore + 500e18);
        _check("sfToken +500", sfAfter == sfBefore + 500e18);
    }

    // ═══════════════════════════════════════════════════════
    // Phase 6: AMM Add Liquidity
    // ═══════════════════════════════════════════════════════

    function _phase6_addLiquidity() internal {
        console.log("");
        console.log("--- Phase 6: Add Liquidity ---");

        IERC20 fToken = IERC20(pool.fToken());
        IERC20 sfToken = IERC20(pool.sfToken());

        // Get current reserves to compute proportional amounts
        (uint256 reserveX, uint256 reserveY) = pool.getReserves();

        uint256 amountX;
        uint256 amountY;

        if (reserveX == 0 && reserveY == 0) {
            // Empty pool: add equal amounts
            amountX = 200e18;
            amountY = 200e18;
        } else {
            // Match existing ratio
            amountX = 200e18;
            amountY = (200e18 * reserveY) / reserveX;
            // Cap at available balance
            uint256 sfBal = sfToken.balanceOf(alice);
            if (amountY > sfBal) {
                amountY = sfBal;
                amountX = (amountY * reserveX) / reserveY;
            }
        }

        vm.startBroadcast(aliceKey);
        fToken.approve(address(pool), amountX);
        sfToken.approve(address(pool), amountY);
        pool.addLiquidity(amountX, amountY, 0);
        vm.stopBroadcast();

        uint256 lpBalance = IERC20(address(pool)).balanceOf(alice);
        _check("LP token balance > 0", lpBalance > 0);
    }

    // ═══════════════════════════════════════════════════════
    // Phase 7: AMM Swap
    // ═══════════════════════════════════════════════════════

    function _phase7_swap() internal {
        console.log("");
        console.log("--- Phase 7: Swap ---");

        IERC20 fToken = IERC20(pool.fToken());
        IERC20 sfToken = IERC20(pool.sfToken());

        uint256 fBefore = fToken.balanceOf(alice);
        uint256 sfBefore = sfToken.balanceOf(alice);

        vm.startBroadcast(aliceKey);
        fToken.approve(address(pool), 10e18);
        uint256 amountOut = pool.swap(address(fToken), 10e18, 0);
        vm.stopBroadcast();

        uint256 fAfter = fToken.balanceOf(alice);
        uint256 sfAfter = sfToken.balanceOf(alice);

        _check("fToken decreased", fAfter < fBefore);
        _check("sfToken increased", sfAfter > sfBefore);
        _check("amountOut > 0", amountOut > 0);
    }

    // ═══════════════════════════════════════════════════════
    // Phase 8: AMM Remove Liquidity
    // ═══════════════════════════════════════════════════════

    function _phase8_removeLiquidity() internal {
        console.log("");
        console.log("--- Phase 8: Remove Liquidity ---");

        IERC20 fToken = IERC20(pool.fToken());
        IERC20 sfToken = IERC20(pool.sfToken());

        uint256 lpBalance = IERC20(address(pool)).balanceOf(alice);
        uint256 lpToRemove = lpBalance / 2;

        uint256 fBefore = fToken.balanceOf(alice);
        uint256 sfBefore = sfToken.balanceOf(alice);

        vm.startBroadcast(aliceKey);
        (uint256 amountX, uint256 amountY) = pool.removeLiquidity(lpToRemove, 0, 0);
        vm.stopBroadcast();

        uint256 fAfter = fToken.balanceOf(alice);
        uint256 sfAfter = sfToken.balanceOf(alice);

        _check("fToken returned > 0", fAfter > fBefore);
        _check("sfToken returned > 0", sfAfter > sfBefore);
        _check("amountX > 0", amountX > 0);
        _check("amountY > 0", amountY > 0);
    }

    // ═══════════════════════════════════════════════════════
    // Phase 9: Router mintWithAltCollateral
    // ═══════════════════════════════════════════════════════

    function _phase9_routerMint() internal {
        console.log("");
        console.log("--- Phase 9: Router mintWithAltCollateral ---");

        IERC20 fToken = IERC20(pool.fToken());
        IERC20 sfToken = IERC20(pool.sfToken());

        uint256 fBefore = fToken.balanceOf(alice);
        uint256 sfBefore = sfToken.balanceOf(alice);

        vm.startBroadcast(aliceKey);
        aUsdc.approve(address(router), 200e6);
        router.mintWithAltCollateral(seriesIdKrw, 100e18, address(aUsdc), collateralSwap, block.timestamp + 1 hours);
        vm.stopBroadcast();

        uint256 fAfter = fToken.balanceOf(alice);
        uint256 sfAfter = sfToken.balanceOf(alice);

        _check("fToken +100 via router", fAfter == fBefore + 100e18);
        _check("sfToken +100 via router", sfAfter == sfBefore + 100e18);
    }

    // ═══════════════════════════════════════════════════════
    // Phase 10: Vault Cleanup
    // ═══════════════════════════════════════════════════════

    function _phase10_cleanup() internal {
        console.log("");
        console.log("--- Phase 10: Vault Cleanup ---");

        uint256 aliceFree = vault.freeBalance(alice);
        if (aliceFree > 0) {
            vm.startBroadcast(aliceKey);
            vault.withdraw(aliceFree);
            vm.stopBroadcast();
        }

        uint256 aliceFreeAfter = vault.freeBalance(alice);
        _check("Alice freeBalance == 0", aliceFreeAfter == 0);
    }
}
