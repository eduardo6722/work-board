# ADR 0006: TanStack Query

## Context

The web app needs client-side server state, loading/error handling, and mutation invalidation.

## Decision

Use TanStack Query with native `fetch`. No additional global state library in Phase 1.

## Alternatives

SWR, Redux, server-only data fetching.

## Consequences

Query keys must stay consistent. Server Components remain default for non-interactive views.
