---
name: write-tests
description: Writes behavior-focused Jest, Vitest, and Supertest tests with safe test-database usage. Use when adding or changing tests.
---

# Write tests

1. Identify observable behaviors.
2. Choose level: domain/unit, use case with fakes, persistence integration, HTTP e2e, UI component.
3. Mock only external boundaries.
4. Use `TEST_DATABASE_URL` / `work_board_test` for persistence. Never reset non-test databases.
5. Run the relevant `pnpm test` / `pnpm test:e2e` command.
6. Report what ran and what failed.

Assert behavior, not private method calls.
