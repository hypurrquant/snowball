import { test, expect } from "../fixtures";
import { TEST_ACCOUNTS } from "../fixtures/wallet";

test.describe("Wallet Connection Flow", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/swap");
  });

  test("shows Connect button when wallet is disconnected", async ({
    page,
  }) => {
    await expect(
      page.getByRole("button", { name: "Connect", exact: true })
    ).toBeVisible();
  });

  test("Connect button triggers wallet connection", async ({
    page,
    connectWallet,
  }) => {
    await connectWallet();

    // Connect button should be gone
    await expect(
      page.getByRole("button", { name: "Connect", exact: true })
    ).not.toBeVisible();
  });

  test("shows shortened address after connecting", async ({
    page,
    connectWallet,
  }) => {
    await connectWallet();

    // The shortened address of the test account should be visible
    const shortAddr =
      TEST_ACCOUNTS[0].address.slice(0, 6) +
      "..." +
      TEST_ACCOUNTS[0].address.slice(-4);
    await expect(page.getByText(shortAddr)).toBeVisible({ timeout: 5_000 });
  });

  test("shows Testnet badge in header", async ({ page }) => {
    await expect(
      page.getByText("Testnet", { exact: true })
    ).toBeVisible();
  });

  test("wallet-dependent pages update on connect", async ({
    page,
    connectWallet,
  }) => {
    // Navigate to dashboard - should show connect message
    await page.goto("/dashboard");
    await expect(
      page.getByText("Connect your wallet to view your dashboard")
    ).toBeVisible();

    // Connect wallet
    await connectWallet();

    // Connect message should disappear, dashboard content should appear
    await expect(
      page.getByText("Connect your wallet to view your dashboard")
    ).not.toBeVisible({ timeout: 5_000 });
    await expect(page.getByText("Quick Actions")).toBeVisible();
  });

  test("logout disconnects wallet", async ({ page, connectWallet }) => {
    await connectWallet();

    // Wait for connected state
    const shortAddr =
      TEST_ACCOUNTS[0].address.slice(0, 6) +
      "..." +
      TEST_ACCOUNTS[0].address.slice(-4);
    await expect(page.getByText(shortAddr)).toBeVisible({ timeout: 5_000 });

    // Click logout button (the last icon button in header before mobile nav)
    const logoutBtn = page.locator("header button").filter({
      has: page.locator("svg.lucide-log-out, svg"),
    }).last();
    await logoutBtn.click();

    // Should show Connect button again
    await expect(
      page.getByRole("button", { name: "Connect", exact: true })
    ).toBeVisible({ timeout: 5_000 });
  });
});
