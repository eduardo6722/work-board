# ADR 0007: React component organization

## Context

Inconsistent component internals make reviews noisy.

## Decision

Require states → library hooks → custom hooks → constants → functions → effects → return. Prefer named default function declarations. Enforce with a Cursor rule, skill, ESLint AST rule, and the code reviewer.

## Alternatives

Rely on personal style, or regex rewriters.

## Consequences

Hooks rules still win. shadcn primitives are exempt.
