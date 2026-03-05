import { test, expect } from "../fixtures";

test.describe("Chat Page", () => {
  test.beforeEach(async ({ page, mockChatAPI }) => {
    await mockChatAPI();
    await page.goto("/chat");
  });

  test("renders Chat heading", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Chat" })).toBeVisible();
  });

  test("shows initial bot greeting message", async ({ page }) => {
    await expect(
      page.getByText("Hi! I'm Snowball AI")
    ).toBeVisible();
  });

  test("has message input field", async ({ page }) => {
    const input = page.getByPlaceholder(
      "Ask about DeFi, positions, or strategies..."
    );
    await expect(input).toBeVisible();
  });

  test("can type a message", async ({ page }) => {
    const input = page.getByPlaceholder(
      "Ask about DeFi, positions, or strategies..."
    );
    await input.fill("What is the current TVL?");
    await expect(input).toHaveValue("What is the current TVL?");
  });

  test("sends message and shows response", async ({ page }) => {
    const input = page.getByPlaceholder(
      "Ask about DeFi, positions, or strategies..."
    );
    await input.fill("What is the current TVL?");

    // Submit the form (press Enter)
    await input.press("Enter");

    // User message should appear
    await expect(page.getByText("What is the current TVL?")).toBeVisible();

    // Bot response should appear (from mocked API)
    await expect(
      page.getByText("I can help you with DeFi operations")
    ).toBeVisible({ timeout: 10_000 });
  });
});
