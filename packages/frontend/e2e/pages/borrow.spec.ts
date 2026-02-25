import { test, expect } from "../fixtures";

test.describe("Borrow Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/borrow");
  });

  test("renders page with branch tabs", async ({ page }) => {
    await expect(page.getByRole("tab", { name: "wCTC" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "lstCTC" })).toBeVisible();
  });

  test("shows stat cards for selected branch", async ({ page }) => {
    await expect(page.getByText("TVL")).toBeVisible();
    await expect(page.getByText("Total Debt")).toBeVisible();
    await expect(page.getByText("TCR", { exact: true })).toBeVisible();
  });

  test("switching tabs updates branch context", async ({ page }) => {
    await page.getByRole("tab", { name: "lstCTC" }).click();
    await expect(page.getByText("lstCTC Price")).toBeVisible();

    await page.getByRole("tab", { name: "wCTC" }).click();
    await expect(page.getByText("wCTC Price")).toBeVisible();
  });

  test("shows connect wallet message when disconnected", async ({ page }) => {
    await expect(
      page.getByText("Connect wallet to view your troves")
    ).toBeVisible();
  });

  test("Open Trove button opens dialog when connected", async ({
    page,
    connectWallet,
  }) => {
    await connectWallet();
    await page.getByText("Open Trove").click();
    await expect(page.getByText("Collateral Ratio", { exact: true })).toBeVisible();
    await expect(page.getByText("Liquidation Price", { exact: true })).toBeVisible();
  });

  test("trove dialog has collateral and borrow inputs", async ({
    page,
    connectWallet,
  }) => {
    await connectWallet();
    await page.getByText("Open Trove").click();

    const inputs = page.locator('input[placeholder="0.00"]');
    await expect(inputs).toHaveCount(2);
  });
});
