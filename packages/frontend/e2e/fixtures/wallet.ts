import { test as base, type Page } from "@playwright/test";

// Anvil default test accounts
export const TEST_ACCOUNTS = [
  {
    address: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    privateKey:
      "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
  },
  {
    address: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    privateKey:
      "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d",
  },
  {
    address: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
    privateKey:
      "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a",
  },
] as const;

/** Connect the mock wallet by clicking the header's Connect button */
async function connectWallet(page: Page) {
  // Click the Connect button in the header
  const connectBtn = page.getByRole("button", { name: "Connect", exact: true });
  await connectBtn.click();

  // Wait for the connection to be reflected in the UI
  // (Connect button should disappear)
  await connectBtn.waitFor({ state: "hidden", timeout: 10_000 });
}

export const test = base.extend<{ connectWallet: () => Promise<void> }>({
  connectWallet: async ({ page }, use) => {
    await use(() => connectWallet(page));
  },
});
