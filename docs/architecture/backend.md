# Backend architecture

NestJS is the backend framework and composition root. Clean Architecture lives inside `apps/api`. Layers are not extracted into Turborepo packages.

## Layers

```text
modules/<feature>/
  domain/           entities, repository contracts, domain errors
  application/      use cases and use-case inputs
  infrastructure/   Prisma repositories, mappers, cache adapters
  presentation/     controllers and HTTP mappers
  <feature>.module.ts
```

### Domain

Pure TypeScript. Encapsulates invariants. Does not import NestJS, Prisma, Redis, HTTP, React, Next.js, or `@repo/contracts`.

### Application

Use cases orchestrate repositories and cache ports. They do not import Prisma or Redis clients and do not depend on controllers.

### Infrastructure

Prisma implementations satisfy repository contracts. Redis implements `CachePort`. Mappers convert persistence records to domain entities.

### Presentation

Thin NestJS controllers. Shared Zod schemas validate HTTP input. Controllers map validated payloads into use-case inputs and map entities to response DTOs.

## Composition

`board.module.ts` binds tokens:

- `BOARD_REPOSITORY` → `PrismaBoardRepository`
- `CACHE_PORT` → `RedisCacheService`, provided by `CacheModule`
- Use cases are constructed with `useFactory` so the classes stay framework-free

## Errors

Domain errors are translated by `GlobalExceptionFilter` into the shared `apiErrorSchema` shape. Validation failures use NestJS 12 `StandardSchemaValidationPipe` with a custom `exceptionFactory`.

## HTTP surface

- `GET /api/v1/board`
- `POST /api/v1/tasks`
- `POST /api/v1/tasks/:id/move`
- `POST /api/v1/board/undo`
- `GET /health`
- Swagger UI at `/docs`

Mutation endpoints are unrestricted. Do not expose them in production without authentication.
