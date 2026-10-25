import "reflect-metadata";
import { config as loadEnv } from "dotenv";
import { resolve } from "node:path";

loadEnv({ path: resolve(__dirname, "../.env"), quiet: true });

process.env.NODE_ENV = "test";
process.env.PORT ??= "3001";
process.env.CORS_ORIGIN ??= "http://localhost:3000";
process.env.CACHE_TTL_SECONDS ??= "60";
process.env.REDIS_URL ??= "redis://localhost:6379";

const fallbackTestDatabaseUrl =
  "postgresql://workboard:workboard@localhost:5432/work_board_test?schema=public";
const testDatabaseUrl = process.env.TEST_DATABASE_URL ?? fallbackTestDatabaseUrl;

if (!testDatabaseUrl.includes("work_board_test")) {
  throw new Error(
    'Refusing to run tests against a non-test database. TEST_DATABASE_URL must include "work_board_test".',
  );
}

process.env.DATABASE_URL = testDatabaseUrl;
