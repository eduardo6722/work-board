# Roadmap

## Phase 1 — Foundation and architecture

**Status:** complete. Validated locally with typecheck, tests, e2e, production build, and a live API/web smoke test. See remaining limitations in the Phase 1 completion notes in `README.md`.

**Objective:** Deliver a reusable full-stack monorepo boilerplate.

**Scope:** Turborepo, Next.js, NestJS, Prisma, PostgreSQL, Redis, shared contracts, shadcn/ui, tests, Docker Compose, GitHub Actions, documentation, Cursor rules/skills, Code Reviewer Agent. The reference `ExampleItem` slice from this phase was removed once the board owned persistence and caching. See [ADR 0014](decisions/0014-remove-example-feature.md).

**Dependencies:** Node 22.12+, Docker, pnpm.

**Acceptance:** Definition of Done in the Phase 1 master prompt, including passing lint/typecheck/tests/build and an independent review with no unresolved Critical or High findings.

## Phase 2 — Application specification

**Status:** Spec Kit 1.2.3 scaffolding is initialized. The constitution is still the upstream template, and no feature specs, plans, or tasks exist.

**Objective:** Define the real product with GitHub Spec Kit.

**Scope:** constitution, feature specs, plans, and tasks. Do not invent those artifacts before real requirements exist.

**Dependencies:** Phase 1 complete.

## Phase 3 — Core application development

**Status:** not started.

**Objective:** Implement real features incrementally on top of Phase 1 architecture.

**Acceptance:** each feature uses shared contracts, Clean Architecture, frontend conventions, tests, and independent review.

## Phase 4 — Quality, security, and observability

**Status:** not started.

**Scope:** broader tests, security hardening, observability, performance, advanced caching.

## Phase 5 — Production deployment

**Status:** not started.

**Scope:** deployment pipeline, managed data stores, monitoring, backups, runbooks. Authentication is a prerequisite before public exposure.
