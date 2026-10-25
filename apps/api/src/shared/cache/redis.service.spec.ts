import { ConfigService } from "@nestjs/config";

import { type Env } from "../../config/env.schema";
import { RedisCacheService } from "./redis.service";

const store = new Map<string, string>();

jest.mock("ioredis", () => {
  return jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    connect: jest.fn().mockResolvedValue(undefined),
    disconnect: jest.fn(),
    get: jest.fn(async (key: string) => store.get(key) ?? null),
    set: jest.fn(async (key: string, value: string) => {
      store.set(key, value);
      return "OK";
    }),
    del: jest.fn(async (key: string) => {
      store.delete(key);
      return 1;
    }),
    ping: jest.fn(async () => "PONG"),
  }));
});

describe("RedisCacheService", () => {
  const config = {
    get: jest.fn((key: string) => {
      if (key === "REDIS_URL") {
        return "redis://localhost:6379";
      }
      if (key === "CACHE_TTL_SECONDS") {
        return 60;
      }
      return undefined;
    }),
  } as unknown as ConfigService<Env, true>;

  beforeEach(() => {
    store.clear();
  });

  it("round-trips JSON values and supports invalidation", async () => {
    const cache = new RedisCacheService(config);
    await cache.set("examples:item:1", { id: "1" });
    await expect(cache.get<{ id: string }>("examples:item:1")).resolves.toEqual({
      id: "1",
    });
    await cache.delete("examples:item:1");
    await expect(cache.get("examples:item:1")).resolves.toBeNull();
  });
});
