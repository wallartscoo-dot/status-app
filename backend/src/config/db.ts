import { Pool, type QueryResultRow } from "pg";
import { env } from "./env";

// Managed Postgres providers (Neon, Supabase, Railway's Postgres, RDS, etc.)
// require SSL and are not reachable at localhost — local dev Postgres
// typically has no SSL configured at all, so we can't use one fixed
// setting for both. Heuristic: anything not on localhost/127.0.0.1 gets
// SSL enabled. `rejectUnauthorized: false` is the standard pragmatic
// setting for these providers' certificate chains (matches what Neon,
// Supabase, and most managed-Postgres quickstart guides recommend) rather
// than bundling each provider's CA cert individually.
const isLocalDb = /localhost|127\.0\.0\.1/.test(env.DATABASE_URL);

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
  ssl: isLocalDb ? undefined : { rejectUnauthorized: false },
});

pool.on("error", (err) => {
  // Idle client errors (e.g. network blip) shouldn't crash the process.
  console.error("Unexpected PostgreSQL pool error:", err);
});

/** Run a parameterized query against the pool. */
export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
) {
  return pool.query<T>(text, params);
}

/**
 * Run a callback inside a single transaction. Automatically BEGIN/COMMIT,
 * and ROLLBACK on any thrown error. Use this for any multi-statement write
 * that must be atomic (e.g. favorite + counter increment + notification).
 */
export async function withTransaction<T>(
  fn: (client: import("pg").PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
