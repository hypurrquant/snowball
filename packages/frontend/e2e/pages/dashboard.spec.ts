import { test, expect } from "../fixtures";

test.describe("Dashboard Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard");
  });

  test("renders dashboard heading", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  });

  test("shows connect wallet message when disconnected", async ({ page }) => {
    await expect(
      page.getByText("Connect your wallet to view your dashboard")
    ).toBeVisible();
  });

  test("shows balance cards when connected", async ({
    page,
    connectWallet,
  }) => {
    await connectWallet();
    // Balance stat cards — use the uppercase label within the stat card
    const statLabels = page.locator("span.uppercase");
    await expect(statLabels.filter({ hasText: /^tCTC$/ })).toBeVisible();
    await expect(statLabels.filter({ hasText: /^wCTC$/ })).toBeVisible();
    await expect(statLabels.filter({ hasText: /^sbUSD$/ })).toBeVisible();
    await expect(statLabels.filter({ hasText: /^lstCTC$/ })).toBeVisible();
  });

  test("shows quick action links when connected", async ({
    page,
    connectWallet,
  }) => {
    await connectWallet();
    await expect(page.getByText("Quick Actions")).toBeVisible();
  });

  test("shows position summary when connected", async ({
    page,
    connectWallet,
  }) => {
    await connectWallet();
    await expect(page.getByText("Active Troves")).toBeVisible();
    await expect(page.getByText("SP Deposit")).toBeVisible();
    await expect(page.getByText("Lend Positions")).toBeVisible();
  });
});
