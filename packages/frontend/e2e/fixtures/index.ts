import { mergeTests } from "@playwright/test";
import { test as walletTest } from "./wallet";
import { test as apiMocksTest } from "./api-mocks";

export const test = mergeTests(walletTest, apiMocksTest);
export { expect } from "@playwright/test";
