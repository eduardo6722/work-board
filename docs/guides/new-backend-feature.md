# New backend feature

Follow `.cursor/skills/create-backend-feature/SKILL.md`.

1. Confirm the requirement belongs in the API.
2. Add or update `@repo/contracts` schemas if HTTP shapes change.
3. Create domain entities, invariants, and a repository contract.
4. Implement use cases against those contracts.
5. Implement Prisma persistence and optional cache-aside.
6. Add a thin controller that validates with shared Zod schemas.
7. Wire providers in the feature module.
8. Add unit, integration, and e2e tests as appropriate.
9. Request a `code-reviewer` review.
