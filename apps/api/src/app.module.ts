import { resolve } from "node:path";

import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

import { validateEnv } from "./config/env.schema";
import { BoardModule } from "./modules/board/board.module";
import { HealthModule } from "./modules/health/health.module";
import { CacheModule } from "./shared/cache/cache.module";
import { PrismaModule } from "./shared/database/prisma.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      // Both src/ and dist/ are directly inside the API app.
      envFilePath: resolve(__dirname, "../.env"),
      validate: validateEnv,
    }),
    PrismaModule,
    CacheModule,
    HealthModule,
    BoardModule,
  ],
})
export class AppModule {}
