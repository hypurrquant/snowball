import { test, expect } from "../fixtures";

test.describe("Pool Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/pool");
  });

  test("renders pool list heading", async ({ page }) => {
    await expect(page.getByText("Liquidity Pools")).toBeVisible();
  });

  test("shows New Position button", async ({ page }) => {
    await expect(page.getByText("New Position")).toBeVisible();
  });

  test("displays 4 pool pairs", async ({ page }) => {
    await expect(page.getByText("wCTC / USDC")).toBeVisible();
    await expect(page.getByText("wCTC / sbUSD")).toBeVisible();
    await expect(page.getByText("sbUSD / USDC")).toBeVisible();
    await expect(page.getByText("lstCTC / wCTC")).toBeVisible();
  });

  test("shows pool table headers on desktop", async ({ page }) => {
    // Set desktop viewport
    await page.setViewportSize({ width: 1280, height: 720 });
    await expect(page.getByText("Pool Pair")).toBeVisible();
    await expect(page.getByText("Dynamic Fee")).toBeVisible();
    await expect(page.getByText("TVL")).toBeVisible();
  });

  test("each pool row has a Deposit button", async ({ page }) => {
    const depositButtons = page.getByText("Deposit");
    await expect(depositButtons).toHaveCount(4);
  });

  test("New Position navigates to /pool/add", async ({ page }) => {
    await page.getByText("New Position").click();
    await expect(page).toHaveURL("/pool/add");
  });
});
