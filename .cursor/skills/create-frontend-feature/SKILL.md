---
name: create-frontend-feature
description: Creates a Next.js feature with shared contracts, TanStack Query, React Hook Form, and required component order. Use when adding a frontend screen or client data flow.
---

# Create frontend feature

## When to use

Adding UI, forms, or client server-state around an existing API contract.

## Preconditions

- Shared Zod schemas exist in `@repo/contracts`.
- Prefer Server Components unless hooks are required.

## Workflow

1. Review the shared contract.
2. Add API functions with `apiFetch`.
3. Add a query-key factory and Query/Mutation hooks.
4. Implement forms with `zodResolver` (do not pin a single `useForm<T>` generic).
5. Build UI with `@repo/ui`. Follow component order via `create-react-component`.
6. Handle loading, empty, error, and success states.
7. Add tests.
8. Invoke the `code-reviewer` subagent.

## Validation

- [ ] No duplicated DTO types
- [ ] Query keys are consistent
- [ ] Mutations invalidate queries
- [ ] Component order is valid
