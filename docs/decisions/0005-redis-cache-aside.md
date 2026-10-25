# ADR 0005: Redis cache-aside

## Context

The reference feature needs a reusable caching pattern without caching every request.

## Decision

Use Redis through `CachePort`. Cache-aside for list and get-by-id. Explicit invalidation on create. Fail open to PostgreSQL.

## Alternatives

HTTP response caching, write-through, or caching in controllers.

## Consequences

Stale data is bounded by TTL plus invalidation. Redis outages degrade to database reads.

ADR 0013 uses this port for the board with a revision check. ADR 0014 removes the reference feature whose list and get-by-id keys this record describes.
