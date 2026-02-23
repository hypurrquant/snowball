import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["src/__tests__/**/*.test.ts"],
    env: {
      AUTH_DISABLED: "true",
      NODE_ENV: "test",
    },
  },
});
