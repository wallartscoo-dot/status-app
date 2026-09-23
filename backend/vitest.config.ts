import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: false,
    // Sequential, not parallel: tests share one Postgres test database and
    // truncate tables between files, so concurrent runs would race.
    fileParallelism: false,
    setupFiles: ["./tests/env.ts", "./tests/setup.ts"],
    testTimeout: 15_000,
    hookTimeout: 15_000,
  },
});
