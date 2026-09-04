import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: [
      "apps/demo/src/**/*.test.ts",
      "packages/**/*.test.ts",
      "compat/v2/packages/**/*.test.ts",
      "tools/**/*.test.ts",
    ],
    coverage: {
      reporter: ["text", "json-summary"],
    },
  },
});
