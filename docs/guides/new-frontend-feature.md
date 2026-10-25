# New frontend feature

Follow `.cursor/skills/create-frontend-feature/SKILL.md`.

1. Reuse `@repo/contracts` instead of duplicating types.
2. Add API functions in `src/lib/api/` or `src/features/<feature>/`.
3. Add TanStack Query hooks with a query-key factory.
4. Build forms with React Hook Form and `zodResolver`.
5. Keep Server Components by default; mark Client Components only when needed.
6. Follow the mandatory React component body order.
7. Cover loading, empty, error, and success states.
8. Add component tests and request a `code-reviewer` review.
