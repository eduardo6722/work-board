# ADR 0004: Prisma infrastructure isolation

## Context

Prisma types are persistence details.

## Decision

Use Prisma ORM 7 with the PostgreSQL driver adapter. Keep models and `PrismaService` in infrastructure. Map to domain entities.

## Alternatives

Using Prisma models as domain entities, or a second ORM.

## Consequences

Generated client is gitignored and regenerated in CI. Domain tests do not need Prisma.
