// Deliberately has NO imports. ES module import statements are hoisted
// above other top-level code, so if this file imported anything from
// src/config/db (which transitively imports src/config/env), that import
// would run *before* these assignments due to hoisting — even though it's
// written after them in source order. Keeping this file import-free
// guarantees these env vars are set before tests/setup.ts (loaded next,
// per the setupFiles order in vitest.config.ts) ever touches the DB config.

process.env.NODE_ENV = "test";
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  "postgresql://postgres:postgres@localhost:5432/statusapp_test";
process.env.JWT_ACCESS_SECRET ??= "test_access_secret_at_least_16_chars";
process.env.JWT_REFRESH_SECRET ??= "test_refresh_secret_at_least_16_chars";
process.env.CORS_ORIGIN ??= "*";
process.env.UPLOAD_DIR ??= "tests/tmp-uploads";
