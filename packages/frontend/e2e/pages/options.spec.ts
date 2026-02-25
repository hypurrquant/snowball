import { test, expect } from "../fixtures";

test.describe("Options Page", () => {
  test.beforeEach(async ({ page, mockPriceAPI, mockOptionsAPI }) => {
    await mockPriceAPI();
    await mockOptionsAPI();
    await page.goto("/options");
  });

  test("renders BTC/USD chart card", async ({ page }) => {
    await expect(page.getByText("BTC/USD")).toBeVisible();
  });

  test("shows stat cards", async ({ page }) => {
    await expect(page.getByText("BTC Price", { exact: true })).toBeVisible();
    await expect(page.getByText("Round", { exact: true })).toBeVisible();
    await expect(page.getByText("Time Left")).toBeVisible();
    await expect(page.getByText("Your Balance")).toBeVisible();
  });

  test("shows Over and Under selection buttons", async ({ page }) => {
    await expect(
      page.getByRole("button", { name: "Over", exact: true })
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Under", exact: true })
    ).toBeVisible();
  });

  test("can select Over side", async ({ page }) => {
    await page.getByRole("button", { name: "Over", exact: true }).click();
    await expect(page.getByRole("button", { name: "Bet Over" })).toBeVisible();
  });

  test("can select Under side", async ({ page }) => {
    await page.getByRole("button", { name: "Under", exact: true }).click();
    await expect(page.getByRole("button", { name: "Bet Under" })).toBeVisible();
  });

  test("shows Place Order card", async ({ page }) => {
    await expect(page.getByText("Place Order")).toBeVisible();
  });

  test("shows Deposit card", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: "Deposit" })
    ).toBeVisible();
  });
});
