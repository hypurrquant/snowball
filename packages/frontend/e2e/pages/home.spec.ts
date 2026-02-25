import { test, expect } from "../fixtures";

test.describe("Home Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("renders hero section with title and tagline", async ({ page }) => {
    await expect(page.locator("h1")).toContainText("Snowball");
    await expect(page.locator("h1")).toContainText("DeFi");
    await expect(page.getByText("The unified DeFi protocol on Creditcoin.")).toBeVisible();
  });

  test("shows Testnet Live badge", async ({ page }) => {
    await expect(page.getByText("Testnet Live")).toBeVisible();
  });

  test("displays 5 feature cards", async ({ page }) => {
    const cards = page.locator("a.group");
    await expect(cards).toHaveCount(5);

    await expect(page.getByRole("heading", { name: "Swap" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Lend" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Borrow" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Earn" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Options" })).toBeVisible();
  });

  test("feature card links navigate correctly", async ({ page }) => {
    await page.getByRole("heading", { name: "Swap" }).click();
    await expect(page).toHaveURL("/swap");
  });

  test("Launch App button navigates to /swap", async ({ page }) => {
    await page.getByText("Launch App").click();
    await expect(page).toHaveURL("/swap");
  });
});
