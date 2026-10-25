# Spec-driven development

GitHub Spec Kit 1.2.3 is initialized in this repository for Cursor. The Specify CLI is a host tool installed with uv. It is not a pnpm workspace dependency.

```bash
uv tool install specify-cli --force --from git+https://github.com/github/spec-kit.git@v1.2.3
specify init --here --force --non-interactive --integration cursor-agent --script sh
specify version
```

Initialization created `.specify/` and Cursor skills under `.cursor/skills/speckit-*`. Do not hand-edit those generated skills or templates. Refresh the Cursor integration with `specify integration upgrade cursor-agent`.

The file `.specify/memory/constitution.md` is still the upstream template. Placeholder principles are not project rules. Do not invent product specifications, user stories, or feature plans.

When real requirements exist, run these skills in Cursor chat, one at a time, and review each result before continuing:

1. `/speckit-constitution` — record principles that are already true for this repository.
2. `/speckit-specify` — specify one bounded feature.
3. `/speckit-clarify` — resolve ambiguous requirements.
4. `/speckit-plan` — plan against Clean Architecture, `@repo/contracts`, React component organization, and the existing test setup.
5. `/speckit-tasks` — generate tasks.
6. `/speckit-analyze` — check consistency across the spec, plan, and tasks.
7. `/speckit-implement` — implement against this repository's architecture.
8. Validate with `pnpm lint`, `pnpm typecheck`, and `pnpm test`.
9. Run the Code Reviewer Agent.
10. Fix issues.
11. `/speckit-converge` — compare the codebase with the artifacts and repeat implementation until the feature is complete.

Optional: `/speckit-checklist` after planning. `/speckit-taskstoissues` remains only for migration; new issue sync belongs to the Spec Kit GitHub extension, which is not installed.
