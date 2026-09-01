import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { pool } from "../config/db";

async function main() {
  const schemaPath = path.join(__dirname, "schema.sql");
  const sql = fs.readFileSync(schemaPath, "utf-8");

  console.log("Applying schema.sql ...");
  await pool.query(sql);
  console.log("✅ Migration complete.");
  await pool.end();
}

main().catch((err) => {
  console.error("❌ Migration failed:", err);
  process.exit(1);
});
