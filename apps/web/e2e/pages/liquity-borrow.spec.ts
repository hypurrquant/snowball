import { test, expect } from "../fixtures";

test.describe("Liquity Borrow Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/liquity/borrow");
  });

  test("renders page with branch selector", async ({ page }) => {
    await expect(page.getByText("wCTC")).toBeVisible();
    await expect(page.getByText("lstCTC")).toBeVisible();
  });

  test("shows stat cards", async ({ page }) => {
    await expect(page.getByText("TVL")).toBeVisible();
    await expect(page.getByText("Total Debt")).toBeVisible();
    await expect(page.getByText("TCR", { exact: true })).toBeVisible();
  });

  test("has Borrow and Earn tabs", async ({ page }) => {
    await expect(page.getByRole("link", { name: "Borrow" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Earn" })).toBeVisible();
  });

  test("switching branch updates URL parameter", async ({ page }) => {
    await page.getByText("lstCTC").first().click();
    await expect(page).toHaveURL(/branch=lstCTC/);
  });

  test("shows connect wallet message when disconnected", async ({ page }) => {
    await expect(
      page.getByText("Connect Wallet to view your troves")
    ).toBeVisible();
  });

  test("Open Trove button visible when connected", async ({
    page,
    connectWallet,
  }) => {
    await connectWallet();
    await expect(page.getByText("Open Trove")).toBeVisible();
  });
});
