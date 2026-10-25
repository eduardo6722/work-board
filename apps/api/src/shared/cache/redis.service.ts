import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Redis from "ioredis";

import { type Env } from "../../config/env.schema";
import { type CachePort } from "./cache.port";

@Injectable()
export class RedisCacheService implements CachePort, OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisCacheService.name);
  private readonly client: Redis;
  private readonly defaultTtlSeconds: number;

  constructor(configService: ConfigService<Env, true>) {
    this.client = new Redis(configService.get("REDIS_URL", { infer: true }), {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
    });
    this.defaultTtlSeconds = configService.get("CACHE_TTL_SECONDS", { infer: true });
    this.client.on("error", (error) => {
      this.logger.warn(`Redis error: ${error.message}`);
    });
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.client.connect();
      this.logger.log("Connected to Redis");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown Redis error";
      this.logger.warn(
        `Redis is unavailable (${message}). Cache-aside reads will fall through to the database.`,
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    this.client.disconnect();
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const payload = await this.client.get(key);
      if (!payload) {
        return null;
      }
      return JSON.parse(payload) as T;
    } catch (error) {
      this.logger.warn(`Cache get failed for ${key}: ${String(error)}`);
      return null;
    }
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    try {
      await this.client.set(
        key,
        JSON.stringify(value),
        "EX",
        ttlSeconds ?? this.defaultTtlSeconds,
      );
    } catch (error) {
      this.logger.warn(`Cache set failed for ${key}: ${String(error)}`);
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await this.client.del(key);
    } catch (error) {
      this.logger.warn(`Cache delete failed for ${key}: ${String(error)}`);
    }
  }

  async ping(): Promise<boolean> {
    try {
      return (await this.client.ping()) === "PONG";
    } catch {
      return false;
    }
  }
}
