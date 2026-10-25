# ADR 0001: Turborepo and pnpm

## Context

The project needs a TypeScript monorepo with apps and shared packages, cached builds, and a single lockfile.

## Decision

Use pnpm workspaces and Turborepo. Pin `packageManager` and Node `>=22.12.0`.

## Alternatives

npm/yarn workspaces, Nx, Lerna.

## Consequences

Workspace packages use `workspace:*`. Turbo caches `build`/`lint`/`test` but not `dev`.
