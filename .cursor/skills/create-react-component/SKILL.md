---
name: create-react-component
description: Creates or refactors project-owned React function components using the mandatory section order. Use when adding or editing React components in apps/web.
---

# Create React component

Consult `.cursor/rules/react-component-structure.mdc` before finishing.

## Required order

1. States
2. Library hooks (`useForm`, `useQuery`, `useRouter`, `useRef`, `useMemo`, …)
3. Custom hooks (application hooks)
4. Constants and derived values
5. Functions and handlers
6. Effects
7. Return

Prefer `export default function ComponentName()`.

Do not add an effect merely to populate the effects section. Hooks rules always win. Server Components must remain server components if they have no client hooks.

If a hook needs a computed value, compute it before that hook. Early returns are allowed after all hooks.

## Template

```tsx
"use client";

export default function ComponentName() {
  // 1. STATES

  // 2. LIBRARY HOOKS

  // 3. CUSTOM HOOKS

  // 4. CONSTANTS

  // 5. FUNCTIONS

  // 6. EFFECTS

  // 7. RETURN
  return null;
}
```

See [examples.md](examples.md) for useState, RHF, Query, custom hooks, effects, conditionals, and Server Components.

## Before finishing

- [ ] Section order is correct
- [ ] No unnecessary effects or state
- [ ] No business logic buried in JSX
- [ ] Accessible semantic HTML
- [ ] Explicit props typing
