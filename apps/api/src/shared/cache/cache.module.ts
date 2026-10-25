import { Global, Module } from "@nestjs/common";

import { CACHE_PORT } from "./cache.port";
import { RedisCacheService } from "./redis.service";

@Global()
@Module({
  providers: [
    RedisCacheService,
    {
      provide: CACHE_PORT,
      useExisting: RedisCacheService,
    },
  ],
  exports: [CACHE_PORT, RedisCacheService],
})
export class CacheModule {}
