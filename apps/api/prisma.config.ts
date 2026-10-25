import { config as loadEnv } from "dotenv";
import { resolve } from "node:path";
import { defineConfig, env } from "prisma/config";

loadEnv({ path: resolve(__dirname, ".env"), quiet: true });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
