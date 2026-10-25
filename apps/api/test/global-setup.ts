import { execSync } from "node:child_process";
import { resolve } from "node:path";

import "./setup-env";

export default function migrateTestDatabase(): void {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl?.includes("work_board_test")) {
    throw new Error(
      "Refusing to apply test migrations because DATABASE_URL does not point at work_board_test.",
    );
  }

  execSync("pnpm exec prisma migrate deploy", {
    cwd: resolve(__dirname, ".."),
    stdio: "inherit",
    env: process.env,
  });
}
