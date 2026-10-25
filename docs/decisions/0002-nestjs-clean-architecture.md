# ADR 0002: NestJS Clean Architecture

## Context

The API needs long-term maintainability without extracting a custom framework.

## Decision

Keep Clean Architecture inside `apps/api`. NestJS is the composition root. Feature modules bind repository and cache tokens with `useFactory`.

## Alternatives

Hexagonal packages per layer, a generic base repository, or treating NestJS as an outer adapter only.

## Consequences

Domain stays pure. Use cases stay framework-free. Controllers stay thin.
