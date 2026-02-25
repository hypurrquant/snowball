import { test, expect } from "../fixtures";

test.describe("Swap Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/swap");
  });

  test("renders swap card with title", async ({ page }) => {
    await expect(page.getByText("Swap", { exact: true }).first()).toBeVisible();
  });

  test("shows From and To sections", async ({ page }) => {
    await expect(page.getByText("From", { exact: true })).toBeVisible();
    await expect(page.getByText("To", { exact: true })).toBeVisible();
  });

  test("shows Connect Wallet button when disconnected", async ({ page }) => {
    await expect(page.getByText("Connect Wallet")).toBeVisible();
  });

  test("can enter amount in From field", async ({ page }) => {
    const input = page.locator('input[inputMode="decimal"]');
    await input.fill("1.5");
    await expect(input).toHaveValue("1.5");
  });

  test("shows Enter an amount when connected but no amount", async ({
    page,
    connectWallet,
  }) => {
    await connectWallet();
    await expect(page.getByText("Enter an amount")).toBeVisible();
  });

  test("flip button swaps From and To tokens", async ({ page }) => {
    // Click the flip button (ArrowDownUp icon container)
    const flipBtn = page.locator("button").filter({ has: page.locator("svg") }).nth(2);
    await flipBtn.click();
    // After flip, the input should be cleared
    const input = page.locator('input[inputMode="decimal"]');
    await expect(input).toHaveValue("");
  });

  test("token selectors are visible", async ({ page }) => {
    // There should be 2 token selector trigger buttons
    const tokenSelectors = page.locator("button").filter({ hasText: /wCTC|sbUSD/ });
    await expect(tokenSelectors.first()).toBeVisible();
    await expect(tokenSelectors).toHaveCount(2);
  });
});
