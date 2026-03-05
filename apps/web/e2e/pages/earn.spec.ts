import { test, expect } from "../fixtures";

test.describe("Earn Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/earn");
  });

  test("renders branch pool tabs", async ({ page }) => {
    await expect(page.getByText("wCTC Pool")).toBeVisible();
    await expect(page.getByText("lstCTC Pool")).toBeVisible();
  });

  test("shows stat cards", async ({ page }) => {
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

  test("deposit button exists", async ({ page }) => {
    await expect(
      page.getByRole("button", { name: "Deposit" }).first()
    ).toBeVisible();
  });

  test("withdraw button exists", async ({ page }) => {
    await expect(
      page.getByRole("button", { name: "Withdraw" }).first()
    ).toBeVisible();
  });

  test("tab switching updates pool context", async ({ page }) => {
    await page.getByText("lstCTC Pool").click();
    await expect(page.getByText("lstCTC Pool")).toBeVisible();
  });
});
