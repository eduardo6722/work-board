---
name: create-backend-feature
description: Creates a NestJS Clean Architecture feature inside apps/api with domain, use cases, Prisma, controllers, and tests. Use when adding a backend module or API endpoint.
---

# Create backend feature

## When to use

Adding or extending an API feature in `apps/api`.

## Preconditions

- Confirm the HTTP contract. Create/update `@repo/contracts` first if needed.
- Do not put domain code in a Turborepo package.

## Workflow

1. Analyze requirements and identify domain concepts.
2. Add shared contracts if the HTTP boundary changes.
3. Implement domain entities, invariants, and errors.
4. Define the repository contract and injection token.
5. Implement use cases against the contract (no Prisma/Redis imports).
6. Implement Prisma repository + mapper.
7. Add cache-aside only when a read path benefits; invalidate on writes.
8. Implement a thin controller with `@Body({ schema })` / `@Param({ schema })`.
9. Bind providers in `<feature>.module.ts` with `useFactory`.
10. Add tests. Run lint, typecheck, and tests.
11. Run architecture review, then the `code-reviewer` subagent.

## Constraints

- Domain: no Nest, Prisma, Redis, HTTP, or `@repo/contracts`.
- Controllers map HTTP ↔ use-case input/output only.

## Validation

- [ ] Feature module compiles
- [ ] Domain tests cover invariants
- [ ] Use-case tests use fakes
- [ ] HTTP validation uses shared Zod schemas
