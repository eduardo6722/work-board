# ADR 0003: Shared Zod contracts

## Context

Frontend and backend must validate the same HTTP shapes.

## Decision

Put Zod schemas in `@repo/contracts` and infer types from them. NestJS 12 validates with `StandardSchemaValidationPipe`. The web app uses `zodResolver`.

## Alternatives

class-validator DTOs, OpenAPI-first codegen, duplicating interfaces.

## Consequences

Transport contracts stay independent of domain entities. Schema changes must be released through the contracts package.
