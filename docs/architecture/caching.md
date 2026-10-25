# Caching

Redis is used with cache-aside. Controllers and domain entities do not talk to Redis.

- Port: `CachePort` in `apps/api/src/shared/cache/cache.port.ts`
- Implementation: `RedisCacheService`
- Key: `board:state`, holding `{ revision, board }`
- TTL: `CACHE_TTL_SECONDS` (default 60)

A read uses that copy only when `revision` equals `board_meta.revision`. A miss or Redis failure reads PostgreSQL. A successful create, move, or undo writes the new revision and board. Cache get and set failures are logged and swallowed by the cache adapter.

Redis outages must not block database-backed reads. A PostgreSQL failure on a board route still returns an error.
