import { test, expect } from "../fixtures";

test.describe("Liquity Earn Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/liquity/earn");
  });

  test("renders stat cards", async ({ page }) => {
    await expect(page.getByText("Pool Size")).toBeVisible();
    await expect(page.getByText("Your Deposit", { exact: true })).toBeVisible();
    await expect(page.getByText("Coll. Gain")).toBeVisible();
  });

  test("shows deposit and withdraw cards", async ({ page }) => {
    await expect(page.getByText("Deposit sbUSD")).toBeVisible();
    await expect(page.getByText("Withdraw sbUSD")).toBeVisible();
  });

  test("deposit form has amount input", async ({ page }) => {
    const depositInput = page.locator('input[placeholder="0.0"]').first();
    await expect(depositInput).toBeVisible();
  });

  test("has Borrow and Earn tabs", async ({ page }) => {
    await expect(page.getByRole("link", { name: "Borrow" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Earn" })).toBeVisible();
  });

  test("Earn tab is active", async ({ page }) => {
    const earnTab = page.getByRole("link", { name: "Earn" });
    await expect(earnTab).toHaveClass(/border-ice-400/);
  });
});
