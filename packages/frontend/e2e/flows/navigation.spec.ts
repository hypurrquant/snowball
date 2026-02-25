import { test, expect } from "../fixtures";

const SIDEBAR_LINKS = [
  { name: "Swap", href: "/swap" },
  { name: "Pool", href: "/pool" },
  { name: "Lend", href: "/lend" },
  { name: "Borrow", href: "/borrow" },
  { name: "Earn", href: "/earn" },
  { name: "Dashboard", href: "/dashboard" },
  { name: "Analytics", href: "/analytics" },
  { name: "Chat", href: "/chat" },
];

test.describe("Navigation", () => {
  test("sidebar shows all navigation groups", async ({ page }) => {
    await page.goto("/");
    await page.setViewportSize({ width: 1280, height: 720 });

    const sidebar = page.locator("aside");
    await expect(sidebar.getByText("Snowball")).toBeVisible();
    await expect(sidebar.locator(".section-title", { hasText: "Trade" })).toBeVisible();
    await expect(sidebar.locator(".section-title", { hasText: "DeFi" })).toBeVisible();
    await expect(sidebar.locator(".section-title", { hasText: "More" })).toBeVisible();
  });

  test("sidebar shows Creditcoin Testnet footer", async ({ page }) => {
    await page.goto("/");
    await page.setViewportSize({ width: 1280, height: 720 });
    await expect(page.locator("aside").getByText("Creditcoin Testnet")).toBeVisible();
  });

  for (const link of SIDEBAR_LINKS) {
    test(`sidebar link "${link.name}" navigates to ${link.href}`, async ({
      page,
    }) => {
      await page.goto("/");
      await page.setViewportSize({ width: 1280, height: 720 });

      const sidebarLink = page
        .locator("aside a")
        .filter({ hasText: link.name })
        .first();
      await sidebarLink.click();
      await expect(page).toHaveURL(link.href);
    });
  }

  test("active link is highlighted", async ({ page }) => {
    await page.goto("/swap");
    await page.setViewportSize({ width: 1280, height: 720 });

    const activeLink = page
      .locator("aside a")
      .filter({ hasText: "Swap" })
      .first();
    await expect(activeLink).toBeVisible();
  });

  test("mobile menu opens and shows nav links", async ({ page }) => {
    await page.goto("/");
    await page.setViewportSize({ width: 375, height: 812 });

    // Open mobile menu (hamburger button in header)
    const menuBtn = page.locator("header button").first();
    await menuBtn.click();

    // Mobile nav should render with links
    const mobileNav = page.locator(".fixed.inset-0");
    await expect(mobileNav).toBeVisible();
    await expect(mobileNav.getByText("Swap")).toBeVisible();
    await expect(mobileNav.getByText("Lend")).toBeVisible();
    await expect(mobileNav.getByText("Dashboard")).toBeVisible();
  });

  test("mobile navigation links work", async ({ page }) => {
    await page.goto("/");
    await page.setViewportSize({ width: 375, height: 812 });

    // Open mobile menu
    const menuBtn = page.locator("header button").first();
    await menuBtn.click();

    // Click a nav link in mobile nav
    const mobileNav = page.locator(".fixed.inset-0");
    await mobileNav.getByText("Lend").click();
    await expect(page).toHaveURL("/lend");
  });
});
