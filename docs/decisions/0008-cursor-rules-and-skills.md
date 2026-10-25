# ADR 0008: Cursor rules and skills

## Context

AI-assisted development needs project-specific workflows.

## Decision

Check in `.cursor/rules/` and `.cursor/skills/` plus root `AGENTS.md`. Skills omit `disable-model-invocation` so they can be discovered.

## Alternatives

Prompt-only conventions, user-level skills only.

## Consequences

Rules stay concise and glob-scoped. Skills point at architecture docs rather than duplicating them.
