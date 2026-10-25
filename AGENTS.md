# AGENTS

This repository is a full-stack boilerplate with GitHub Spec Kit initialized for later product work. Do not invent product features or specifications.

## Stack and layout

- `apps/web` — Next.js App Router
- `apps/api` — NestJS Clean Architecture
- `packages/contracts` — Zod HTTP contracts
- `packages/ui` — shadcn/ui primitives
- Docs: `docs/architecture/`, `docs/guides/`, `docs/decisions/`

## Boundaries

- Domain code in `apps/api` stays free of Nest, Prisma, Redis, HTTP, and `@repo/contracts`.
- Shared API shapes live in `@repo/contracts`, not in duplicated DTOs.
- UI primitives contain no business logic.

## React

Project-owned components follow states → library hooks → custom hooks → constants → functions → effects → return. Use `.cursor/skills/create-react-component/SKILL.md` and `.cursor/rules/react-component-structure.mdc`.

## Commands

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm build
```

## Cursor

Follow project rules in `.cursor/rules/`. Use skills in `.cursor/skills/` for repeatable workflows. After meaningful implementation, invoke the `code-reviewer` subagent (`.cursor/agents/code-reviewer.md`). Do not declare major work complete with unresolved Critical or High findings.

Group related edits into one review after relevant validation. Supply explicit changed files, a change summary, a diff or baseline when available, and validation results. Review only applicable conventions and dependencies; do not repeat reviews solely for commits or pushes. Without an initial commit, use the task's file list rather than all untracked files.

Default review budget: 120 seconds and at most 6 read/search batches, with no executable validation. Put this budget and the instruction to return `INCOMPLETE` for uncovered scope directly in the subagent task message. Do not automatically chain review passes or declare an incomplete review complete. Deeper review requires an explicit request; prompt budgets cannot guarantee a hard runtime limit.

## Spec Kit

Spec Kit 1.2.3 is initialized for Cursor. Skills live in `.cursor/skills/speckit-*`. Invoke them in chat, for example `/speckit-constitution`.

`.specify/memory/constitution.md` is still the upstream template. Placeholder principles are not project rules. Do not hand-edit generated Spec Kit skills or templates. See `docs/guides/spec-driven-development.md`.
