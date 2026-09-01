import { createApp } from "./app";
import { env } from "./config/env";
import { pool } from "./config/db";

// Phase 5: never let an unexpected error silently kill the process without
// a trace, and never let one uncaught rejection leave the process in a
// half-broken state that keeps serving requests. Log with full context and
// exit so the process manager (systemd/PM2/Docker) restarts a clean process.
process.on("uncaughtException", (err) => {
  console.error("[FATAL] Uncaught exception:", err);
  process.exit(1);
});
process.on("unhandledRejection", (reason) => {
  console.error("[FATAL] Unhandled promise rejection:", reason);
  process.exit(1);
});

const app = createApp();

const server = app.listen(env.PORT, () => {
  console.log(`🚀 Status App API listening on http://localhost:${env.PORT}`);
  console.log(`   Health check: http://localhost:${env.PORT}/api/health`);
});

async function shutdown(signal: string) {
  console.log(`\n${signal} received: closing server...`);
  // Force-exit if graceful shutdown hangs (e.g. a stuck DB connection) so
  // deploys/restarts never wait forever on a process that won't die.
  const forceExitTimer = setTimeout(() => {
    console.error("Graceful shutdown timed out after 10s, forcing exit.");
    process.exit(1);
  }, 10_000);
  forceExitTimer.unref();

  server.close(async () => {
    await pool.end();
    clearTimeout(forceExitTimer);
    process.exit(0);
  });
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
