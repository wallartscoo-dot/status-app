// Runs once before any test file (after tests/env.ts, per setupFiles order
// in vitest.config.ts, so process.env is already pointed at the test DB).

import { beforeAll } from "vitest";
import fs from "fs";
import path from "path";
import { pool } from "../src/config/db";

beforeAll(async () => {
  const schemaPath = path.resolve(__dirname, "../src/db/schema.sql");
  const schema = fs.readFileSync(schemaPath, "utf-8");
  await pool.query(schema);
});

/** Wipes all app tables between test files, keeping schema/migrations intact. */
export async function truncateAll() {
  await pool.query(`
    TRUNCATE TABLE
      notifications, reports, status_hashtags, hashtags, downloads,
      favorites, follows, statuses, categories, profiles, users
    RESTART IDENTITY CASCADE
  `);
}
