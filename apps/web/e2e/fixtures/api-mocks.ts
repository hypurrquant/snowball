import { test as base, type Page } from "@playwright/test";

/** Mock price API responses */
async function mockPriceAPI(page: Page) {
  await page.route("**/api/price/**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ price: 96500.0, timestamp: Date.now() }),
    })
  );
}

/** Mock options API responses */
async function mockOptionsAPI(page: Page) {
  await page.route("**/api/options/**", (route) => {
    const url = route.request().url();

    if (url.includes("/history")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          trades: [
            {
              round: 42,
              side: "Over",
              amount: "10.0",
              payout: "19.5",
              priceStart: "96000",
              priceEnd: "96500",
              status: "Won",
            },
            {
              round: 41,
              side: "Under",
              amount: "5.0",
              payout: "0",
              priceStart: "95500",
              priceEnd: "96000",
              status: "Lost",
            },
          ],
        }),
      });
    }

    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        currentRound: 43,
        timeLeft: 120,
        btcPrice: 96500.0,
        poolBalance: "1000.0",
      }),
    });
  });
}

/** Mock chat API responses */
async function mockChatAPI(page: Page) {
  await page.route("**/api/chat", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        message:
          "I can help you with DeFi operations on Snowball. What would you like to do?",
      }),
    })
  );
}

export const test = base.extend<{
  mockPriceAPI: () => Promise<void>;
  mockOptionsAPI: () => Promise<void>;
  mockChatAPI: () => Promise<void>;
}>({
  mockPriceAPI: async ({ page }, use) => {
    await use(() => mockPriceAPI(page));
  },
  mockOptionsAPI: async ({ page }, use) => {
    await use(() => mockOptionsAPI(page));
  },
  mockChatAPI: async ({ page }, use) => {
    await use(() => mockChatAPI(page));
  },
});
