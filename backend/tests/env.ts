// Deliberately has NO imports. ES module import statements are hoisted
// above other top-level code, so if this file imported anything from
// src/config/db (which transitively imports src/config/env), that import
// would run *before* these assignments due to hoisting — even though it's
// written after them in source order. Keeping this file import-free
// guarantees these env vars are set before tests/setup.ts (loaded next,
// per the setupFiles order in vitest.config.ts) ever touches the DB config.

process.env.NODE_ENV = "test";
process.env.DATABASE_URL =postgresql://neondb_owner:npg_ToFH4GgKWIA6@ep-small-union-zak3q4wy-pooler.c-2.eu-west-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require
  process.env.TEST_DATABASE_URL ??
  "postgresql://postgres:postgres@localhost:5432/statusapp_test";
process.env.JWT_ACCESS_SECRET ??= "2567289875932e3c12ae85ac85cf703f40292dc2122126f602ddfec05a719256";
process.env.JWT_REFRESH_SECRET ??= "c2715510560f081c997959369b38ec1755269a6ae895bf67d4c1c3688f0279c4";
process.env.CORS_ORIGIN ??= "*";
process.env.UPLOAD_DIR ??= "tests/tmp-uploads";
