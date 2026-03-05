import { test, expect } from "../fixtures";

test.describe("Lend Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/lend");
  });

  test("renders Lending Markets heading", async ({ page }) => {
    await expect(page.getByText("Lending Markets")).toBeVisible();
  });

  test("shows stat cards", async ({ page }) => {
    await expect(page.getByText("Total Supply")).toBeVisible();
    await expect(page.getByText("Total Borrow")).toBeVisible();
    await expect(page.getByText("Markets", { exact: true })).toBeVisible();
    await expect(page.getByText("Avg. Utilization")).toBeVisible();
  });

  test("market cards show Supply APY and Borrow APR", async ({ page }) => {
    // Wait for loading to potentially settle
    await page.waitForTimeout(1000);
    const supplyLabels = page.getByText("Supply APY");
    const borrowLabels = page.getByText("Borrow APR");
    // At least one market card should render
    await expect(supplyLabels.first()).toBeVisible();
    await expect(borrowLabels.first()).toBeVisible();
  });

  test("market cards show utilization bar", async ({ page }) => {
    await expect(page.getByText("Utilization").first()).toBeVisible();
  });
});
