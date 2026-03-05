import { test, expect } from "../fixtures";

test.describe("Analytics Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/analytics");
  });

  test("renders Protocol Analytics heading", async ({ page }) => {
    await expect(page.getByText("Protocol Analytics")).toBeVisible();
  });

  test("shows data update indicator", async ({ page }) => {
    await expect(page.getByText("Data updates every 5 mins")).toBeVisible();
  });

  test("shows stat cards", async ({ page }) => {
    await expect(
      page.getByText("Total Value Locked", { exact: true })
    ).toBeVisible();
    await expect(page.getByText("24h Volume")).toBeVisible();
    await expect(page.getByText("Total Users")).toBeVisible();
    await expect(page.getByText("Total Fees")).toBeVisible();
  });

  test("shows TVL History chart card", async ({ page }) => {
    await expect(page.getByText("TVL History")).toBeVisible();
  });

  test("shows Top Pools table", async ({ page }) => {
    await expect(page.getByText("Top Pools by Volume")).toBeVisible();

    // Table should show pool pairs
    await expect(page.getByText("wCTC / USDC")).toBeVisible();
    await expect(page.getByText("sbUSD / USDC")).toBeVisible();
    await expect(page.getByText("lstCTC / wCTC")).toBeVisible();
  });

  test("pool table shows column headers", async ({ page }) => {
    await expect(page.getByText("Pool", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Volume", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("APY", { exact: true }).first()).toBeVisible();
  });
});
