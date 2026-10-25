---
name: implement-caching
description: Implements Redis cache-aside with TTL, key conventions, invalidation, and fail-open reads. Use when adding or changing API caching.
---

# Implement caching

1. Identify a read path that is safe to cache.
2. Define keys (`feature:collection`, `feature:item:{id}`).
3. Choose TTL from config.
4. Read cache then database (cache-aside).
5. Invalidate on writes.
6. Swallow Redis errors in the adapter so DB reads still succeed.
7. Test hit, miss, invalidation, and failure.

Do not inject Redis into controllers or domain entities. Do not cache every request.
