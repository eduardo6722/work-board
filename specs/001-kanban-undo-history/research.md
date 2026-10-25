# Research: Kanban Board with Undo History

## 1. Where board state lives

- **Decision**: One in-memory `Board` instance per API process. NestJS constructs it once as a singleton and injects that same object into the board controller. No Prisma model, no Redis key, no repository interface.
- **Rationale**: The spec requires one shared board that survives successive actions and disappears when the process stops. The aggregate is the state. A repository around it would store a second copy or add a port with one implementation. The existing example module uses a repository because it has a real persistence boundary. This feature does not.
- **Alternatives considered**:
  - Prisma plus PostgreSQL, matching `create-backend-feature`. Rejected because the board must run without a database and the challenge forbids persistence.
  - Redis as the board store. Rejected for the same reason, and because Redis is already a cache, not the source of truth.
  - Snapshotting the board inside a generic store. Rejected. The domain object can hold tasks and the undo stack directly.

## 2. How the API starts without PostgreSQL or Redis

- **Decision**: Leave `PrismaModule`, `CacheModule`, and `ExampleModule` in the application. Change `PrismaService.onModuleInit` so a failed `$connect()` is logged and does not abort bootstrap. Redis already logs and continues when `connect()` fails. Board routes never inject either client. `DATABASE_URL` and `REDIS_URL` stay required strings so the existing example configuration still validates. They do not need a live server.
- **Rationale**: Today `PrismaService.onModuleInit` rethrows, so `pnpm dev` never listens if PostgreSQL is down. Redis is already fail-open. Health already reports a down database as degraded. Reviewers can copy `.env.example`, skip Docker, and use the board. Example routes still need PostgreSQL when someone calls them.
- **Alternatives considered**:
  - Removing Prisma and Redis from `AppModule`. Rejected. That rebuilds the boilerplate and breaks the example feature.
  - Documenting Docker as mandatory. Rejected. The board is required to start while those services are not running.
  - A second Nest entrypoint that only loads the board. Rejected as extra composition for one feature.

## 3. Undo representation

- **Decision**: An operation stack on the `Board`, last in first out. A successful create pushes `{ type: "TASK_CREATED", taskId }`. A successful move pushes `{ type: "TASK_MOVED", taskId, from, to }`. Failures and no-change moves push nothing. Undo pops one entry and reverses it. Undo does not push.
- **Rationale**: The spec reverses exactly one successful create or move. Those two operations have an obvious inverse: delete that id, or put the task back in `from`. A full board snapshot would also work but stores every task on every change and makes the inverse less obvious. Event sourcing, redo, and a command bus are out of scope.
- **Alternatives considered**:
  - Cloning the entire board after each success. Rejected as unnecessary copying for two operation kinds.
  - Storing history in the HTTP contract. Rejected. Clients need `canUndo`, not the stack. The stack stays inside the domain.

## 4. Expected outcomes versus exceptions

- **Decision**: `Board` methods return a result value (`success`, `no_change`, or `error`) and never throw for duplicate ids, missing tasks, bad columns, the work-in-progress limit, same-column moves, or empty undo. The controller maps that result to HTTP status and a body of `{ result, board }`. Unexpected bugs still fall through `GlobalExceptionFilter`.
- **Rationale**: The spec treats these as normal outcomes. A no-change undo must use code `nothing_to_undo` and must not look like a crashed request. The response has to include the confirmed board even when the action is refused. The example module throws `DomainError` because those failures are only an error document. That shape cannot carry the board, so this module does not copy it.
- **Alternatives considered**:
  - Throw `DomainError` and let the global filter render `apiErrorSchema`. Rejected. That drops the board body and turns `already_in_column` and `nothing_to_undo` into HTTP errors.
  - HTTP 200 for every outcome, including refusals. Rejected. Unknown tasks and conflicts should use 404 and 409 so a caller can tell refusal from success without reading only the body. No-change stays 200.

## 5. Validation shape

- **Decision**: Shared Zod schemas in `@repo/contracts` validate create and move input. Board controller actions parse the body themselves and, on failure, return HTTP 400 with `{ result: { status: "error", code: "validation_error", ... }, board }`. They do not attach a schema to `@Body()`, so the global validation pipe keeps its current `VALIDATION_ERROR` envelope for the example module. The domain repeats the non-empty checks. Unknown move destinations are a string at the schema boundary and become `invalid_column` in the domain, not a schema enum failure.
- **Rationale**: The spec's code is `validation_error`, and a rejected create must still report the unchanged board. The global pipe returns `VALIDATION_ERROR` without a board, and the example e2e test asserts that code. Mapping only the board routes preserves both contracts. Keeping destination as a string is what makes `invalid_column` reachable.
- **Alternatives considered**:
  - Changing the global pipe code to `validation_error`. Rejected. It would break the example API contract.
  - Enum-restricting destination in Zod only. Rejected. Invalid destinations would never reach the domain code the spec names.

## 6. Work-in-progress limit configuration

- **Decision**: `BOARD_WIP_LIMIT` on the API env schema: coerced positive integer, default `2`. The singleton `Board` is constructed with that value. The UI does not edit it. A non-positive value prevents process start.
- **Rationale**: The spec fixes the limit before use and defaults it to 2. Env validation is the existing configuration boundary (`env.schema.ts`). No extra settings endpoint.
- **Alternatives considered**:
  - A hardcoded constant only. Rejected. The spec says the limit is configurable before use, with 2 as the default.
  - A runtime control on the board. Rejected by the spec.

## 7. ID ordering

- **Decision**: Sort with JavaScript's UTF-16 code-unit order (`<` and `>`), not `localeCompare` and not numeric compare. `A` comes before `B` before `a`. `10` comes before `2`. The same comparison decides equality for duplicate ids (exact string match, no trim, no case fold).
- **Rationale**: The spec requires deterministic text order, including `10` before `2`. `localeCompare` can follow the runtime locale. Numeric compare would put `2` before `10`, which the spec forbids. The domain sorts when it builds the view, so insertion order and drag position cannot leak.
- **Alternatives considered**:
  - `localeCompare`. Rejected. It follows the runtime locale and is not stable across machines.
  - Preserving drop index. Rejected by the spec.

## 8. Empty text

- **Decision**: A schema refinement rejects a string whose `trim()` length is 0, without transforming the value. `A` and ` A` stay different when the latter has a visible character. The domain uses the same rule.
- **Rationale**: Matches the spec assumption. The example schema uses `.trim()`, which would collapse ids. The board schema must not copy that.
- **Alternatives considered**:
  - Trim-and-save. Rejected. It would change ids the person entered.
  - Accept spaces-only titles. Rejected. The spec treats them as empty.

## 9. Client updates

- **Decision**: TanStack Query holds the board. Mutations wait for the HTTP response, then `setQueryData` with `response.board`. No optimistic cache write and no follow-up invalidation. Drag-and-drop uses `@dnd-kit/core` only. A refused drop leaves the card in the column from the response.
- **Rationale**: The spec says the screen matches the confirmed board. Optimistic movement would show a card in In Progress before the limit check, then jump it back. Invalidation plus a slow GET can overwrite the mutation response. `@dnd-kit/sortable` exists to reorder cards, which this board must not do.
- **Alternatives considered**:
  - Optimistic updates with rollback. Rejected. Extra states for a rule the server must decide.
  - Invalidate-only. Rejected. The mutation body is already the confirmed board.
  - Manual order via sortable. Rejected by the spec.

## 10. Tests without a database

- **Decision**: Board domain tests and board HTTP tests run under the default API Jest config and must not open PostgreSQL or Redis. The HTTP test boots `BoardModule` with config, not `AppModule`. Remove `globalSetup` from `apps/api/jest.config.cjs`. Keep migration setup on `apps/api/test/jest-e2e.json`. Move `prisma-example-item.repository.spec.ts` onto that e2e run so `pnpm test` does not migrate or connect. `pnpm test:e2e` still requires Docker and `work_board_test`.
- **Rationale**: Both current Jest configs run `prisma migrate deploy` before any spec. A board unit test would refuse to start without PostgreSQL even though it never touches it. The Prisma repository spec is the only default-suite file that needs a live database. Redis unit tests already mock `ioredis`.
- **Alternatives considered**:
  - Leaving `globalSetup` and requiring Docker for every test. Rejected. It blocks the mandatory domain scenario when Docker is off.
  - Mocking Prisma inside the board test while still booting `AppModule`. Rejected. The board test should not construct the database client at all.

## 11. Frontend placement

- **Decision**: The home page renders the board feature. Example feature files and example routes stay in the repo. HTTP helpers for the board live in `apps/web/src/lib/api/board.ts`, matching `docs/architecture/frontend.md`. Hooks and components live under `apps/web/src/features/board/`. A native select plus a move button is the non-drag control, using existing `@repo/ui` primitives. Add `@dnd-kit/core` to `apps/web`.
- **Rationale**: Reviewers should see the board first. Deleting the example feature is unrelated cleanup. A new dropdown primitive is unnecessary for three destinations.
- **Alternatives considered**:
  - A new `/board` route and an unchanged example home page. Rejected. The challenge demo should be the first screen.
  - `@dnd-kit/sortable` plus a dropdown component. Rejected. More UI than the interactions require.

## 12. Documentation of the decisions

- **Decision**: During implementation, add `docs/decisions/0012-in-memory-board.md` for in-memory state and operation undo, update the architecture overview so the board path does not imply PostgreSQL, and cover both investigated decisions in `README.md`. Add `docs/VIDEO_SCRIPT.md` as the demonstration outline. Do not claim a video was recorded.
- **Rationale**: Repository rules ask for an ADR when a decision changes the architecture. The challenge also wants the same decisions, the AI usage notes, and the video outline in the submission docs. Those files are implementation deliverables, not design-time code.
- **Alternatives considered**:
  - README only, no ADR. Rejected. Fail-open startup and an in-memory aggregate are architecture changes a later reader needs beside the other ADRs.
