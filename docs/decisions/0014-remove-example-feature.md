# ADR 0014: Remove the example feature

## Context

The repository shipped a reference `ExampleItem` slice: an API module, a web feature, Zod contracts, and the `example_items` table. That slice was the sample Prisma and Redis path. The Kanban board now uses those same boundaries, and the sample routes are not part of the product.

## Decision

Remove `apps/api/src/modules/example`, `apps/web/src/features/example`, `packages/contracts/src/examples`, and the `example_items` table. PostgreSQL and Redis stay for the board. `pnpm test:e2e` runs the board Prisma repository spec.

## Alternatives

- Keep the slice as a template. Rejected. It duplicated the board's persistence and cache path and left extra routes on the API.

## Consequences

`/api/v1/examples` is gone. ADR 0012 and ADR 0013 described the example feature as still present. That part no longer applies. ADR 0005's list and get-by-id invalidation described the same slice. The board cache is the revision check in ADR 0013.
