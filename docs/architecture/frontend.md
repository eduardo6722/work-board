# Frontend architecture

`apps/web` uses the Next.js App Router.

- Server Components are the default.
- Client Components are used when interactivity requires hooks, forms, or TanStack Query.
- Feature code lives under `src/features/<feature>/`.
- Shared API access lives in `src/lib/api/`.
- Providers live in `src/providers/`.

## Server state

TanStack Query owns client-side server state. The board query key is `boardKeys.state()`. A successful create, move, or undo writes the returned board with `setQueryData`.

## Forms

React Hook Form + `zodResolver` consume schemas from `@repo/contracts`. Do not pass a single `useForm<T>` generic when Zod input and output types differ; let the resolver infer both.

## API client

`apiFetch` uses native `fetch`, talks to `NEXT_PUBLIC_API_URL`, and parses failures with `apiErrorSchema`.

## UI

Reusable primitives come from `@repo/ui`. Application screens compose those primitives. See [react-components.md](./react-components.md) for the mandatory component body order.
