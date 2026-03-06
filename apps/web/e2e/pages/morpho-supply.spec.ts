import { test, expect } from "../fixtures";

test.describe("Morpho Supply Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/morpho/supply");
  });

  test("renders stat cards", async ({ page }) => {
    await expect(page.getByText("Total Supply")).toBeVisible();
    await expect(page.getByText("Total Borrow")).toBeVisible();
    await expect(page.getByText("Markets", { exact: true })).toBeVisible();
    await expect(page.getByText("Avg. Utilization")).toBeVisible();
  });

  test("has Supply and Borrow tabs", async ({ page }) => {
    await expect(page.getByRole("link", { name: "Supply" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Borrow" })).toBeVisible();
  });

  test("market cards show Supply APY and Borrow APR", async ({ page }) => {
    await page.waitForTimeout(1000);
    const supplyLabels = page.getByText("Supply APY");
    const borrowLabels = page.getByText("Borrow APR");
    await expect(supplyLabels.first()).toBeVisible();
    await expect(borrowLabels.first()).toBeVisible();
  });

  test("market cards show utilization bar", async ({ page }) => {
    await expect(page.getByText("Utilization").first()).toBeVisible();
  });
});
