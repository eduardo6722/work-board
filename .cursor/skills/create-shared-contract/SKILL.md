---
name: create-shared-contract
description: Adds Zod request/response schemas to @repo/contracts and infers TypeScript types. Use when changing API payloads shared by web and API.
---

# Create shared contract

1. Identify request, response, params, and error shapes.
2. Add Zod schemas under `packages/contracts/src`.
3. Export inferred types. Handle `z.input` vs `z.output` when using transforms/coercion.
4. Export from `src/index.ts`.
5. Consume in NestJS controllers and React Hook Form.
6. Add valid and invalid schema tests.
7. Review compatibility with existing clients.

Do not put domain entities or Prisma models in this package.
