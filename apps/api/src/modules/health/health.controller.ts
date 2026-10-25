import { Controller, Get, HttpStatus, Res } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { type Response } from "express";

import { RedisCacheService } from "../../shared/cache/redis.service";
import { PrismaService } from "../../shared/database/prisma.service";

@ApiTags("health")
@Controller("health")
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisCacheService,
  ) {}

  @Get()
  @ApiOperation({ summary: "Service health" })
  async check(@Res({ passthrough: true }) response: Response) {
    const database = await this.checkDatabase();
    const redis = await this.redis.ping();
    const status = database ? "ok" : "degraded";

    if (!database) {
      response.status(HttpStatus.SERVICE_UNAVAILABLE);
    }

    return {
      status,
      checks: {
        database: database ? "up" : "down",
        redis: redis ? "up" : "down",
      },
    };
  }

  private async checkDatabase(): Promise<boolean> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }
}
