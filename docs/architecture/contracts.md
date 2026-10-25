# Shared contracts

`@repo/contracts` is the source of truth for HTTP request and response shapes.

- Zod schemas define runtime validation.
- TypeScript types are inferred with `z.infer`, `z.input`, and `z.output`.
- The package has no NestJS, Next.js, React, Prisma, or domain dependencies.

Transport validation is not domain validation. Domain invariants remain in `apps/api` entities and use cases.

When a contract changes, update the schema, export it from `packages/contracts/src/index.ts`, consume it from both apps, and add representative valid/invalid tests.
