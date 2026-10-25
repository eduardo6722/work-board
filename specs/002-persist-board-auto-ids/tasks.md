# Tasks: Saved Board with Title-Only Tasks

**Input**: Design documents from `/specs/002-persist-board-auto-ids/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Included. spec.md defines acceptance scenarios for every story, and plan.md plus quickstart.md require domain, HTTP, contract, use-case, Prisma, and web tests. Write the tests for a story first and confirm they fail before that story's implementation.

**Organization**: Tasks are grouped by user story. Stories share `board.ts`, the controller, and the screen, so implement the stories in order.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (US1–US4)
- Every task includes an exact file path

## Path Conventions

- API: `apps/api/src/modules/board/`
- Web: `apps/web/src/features/board/` and `apps/web/src/lib/api/board.ts`
- Contracts: `packages/contracts/src/board/`
- Database: `apps/api/prisma/`
- Feature docs: `specs/002-persist-board-auto-ids/`

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Keep `pnpm test` off PostgreSQL while allowing the new Prisma spec to run under e2e. No new library.

- [X] T001 [P] In `apps/api/jest.config.cjs`, add `src/modules/board/infrastructure/persistence/repositories/prisma-board.repository.spec.ts` to `testPathIgnorePatterns` beside the existing example repository spec. Do not ignore other board specs. Default `pnpm test` must not run `prisma migrate deploy`.
- [X] T002 [P] In `apps/api/test/jest-e2e.json`, extend `testRegex` so `prisma-board.repository.spec.ts` runs together with `prisma-example-item.repository.spec.ts` and `*.e2e-spec.ts`. Keep `globalSetup`.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Domain snapshot, sequence counter, repository port, storage error, and cache key. Every story uses these. Column order stays id order until User Story 3.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T003 [P] Create `apps/api/src/modules/board/application/board-unavailable.error.ts`. Extend `DomainError` from `apps/api/src/shared/errors/domain.error.ts`. Constructor arguments are `message: string`. `code` is exactly `BOARD_UNAVAILABLE`. `httpStatus` is `503`. Do not import Nest, Prisma, Redis, HTTP, or `@repo/contracts`.
- [X] T004 [P] Create `apps/api/src/modules/board/application/board-cache.keys.ts` exporting `boardCacheKeys.state` as the exact string `board:state`.
- [X] T005 [P] Update `apps/api/src/modules/board/domain/board.types.ts`. Keep `Column` as exactly `todo` | `in_progress` | `done`. Extend `Task` with required `sequence: number` (positive integer, assigned once, never changed). Add `BoardTaskView` as `{ id: string; title: string; column: Column }` and point `BoardState.columns` at `BoardTaskView[]` so the derived view has no `sequence`. Add `BoardSnapshot` as `{ tasks: Task[]; history: HistoryEntry[]; nextSequence: number }`. Leave `HistoryEntry` as `TASK_CREATED` with `taskId`, or `TASK_MOVED` with `taskId`, `from`, and `to`. Leave `ActionResult` codes unchanged, including `duplicate_task_id`. Do not import Nest, Prisma, Redis, HTTP, React, Next, or `@repo/contracts`.
- [X] T006 [P] Create `apps/api/src/modules/board/domain/repositories/board.repository.ts` with `BOARD_REPOSITORY` symbol and `BoardRepository`: `currentRevision(): Promise<number>`, `read(wipLimit: number): Promise<BoardState>`, and `run(wipLimit: number, work: (board: Board) => ActionResult): Promise<{ result: ActionResult; state: BoardState }>`. Import only domain types. Do not import Nest, Prisma, Redis, or `@repo/contracts`.
- [X] T007 Add failing tests to `apps/api/src/modules/board/domain/board.spec.ts` for the snapshot and the sequence counter. After two successful `createTask` calls, `toSnapshot().nextSequence` is 3 and task sequences are 1 then 2. Undo of that create leaves `nextSequence` unchanged and the removed sequence is not reused by the next create. `duplicate_task_id` and a title whose `trim().length === 0` do not change tasks, history, or `nextSequence`. `hydrate(snapshot, wipLimit)` restores tasks, history, and `nextSequence`. `getState()` task objects have only `id`, `title`, and `column`. Do not change the existing id-order expectations in this task. Confirm the new tests fail before T008.
- [X] T008 Implement snapshot and sequence in `apps/api/src/modules/board/domain/board.ts` so T007 passes. `nextSequence` starts at 1. Successful `createTask(id, title)` stores `sequence` then increments `nextSequence`. Undo of a create deletes the task and does not decrement `nextSequence`. Empty id or a title whose `trim().length === 0` returns `validation_error` and writes nothing. The stored title is not trimmed. Add `toSnapshot()` and `static hydrate(snapshot, wipLimit)`. `getState()` copies only `id`, `title`, and `column`. Keep `compareTaskIds` so columns stay in UTF-16 id order until User Story 3. Existing wip, move, and undo tests must stay green.
- [X] T009 Create `apps/api/src/modules/board/testing/in-memory-board.repository.ts` implementing `BoardRepository`. Hold one snapshot and a `revision` starting at 0. `read` hydrates with the given `wipLimit` and returns `getState()` without changing `revision`. `run` hydrates, calls `work`, and only when `result.status === "success"` replaces the snapshot from `toSnapshot()` and increments `revision`. `already_in_column`, `nothing_to_undo`, and every error leave the snapshot and `revision` unchanged. Do not import Prisma or Redis.

**Checkpoint**: Domain snapshot, sequence counter, port, and in-memory repository are ready. User stories can begin.

---

## Phase 3: User Story 1 - Work is still there after a restart (Priority: P1) 🎯 MVP

**Goal**: Tasks and undo history survive a new repository instance. A change is reported only after it is saved. A storage failure is an error and does not change the last saved board.

**Independent Test**: Create two tasks, move one to In Progress, build a second repository against the same stored snapshot, and confirm both tasks are in the same columns with undo still reversing that move.

### Tests for User Story 1

- [X] T010 [P] [US1] Add failing `apps/api/src/modules/board/infrastructure/persistence/repositories/prisma-board.repository.spec.ts`. Follow `prisma-example-item.repository.spec.ts`: `ConfigModule` with `validateEnv`, `PrismaService.$connect()`, and `deleteMany` on the board tables in `beforeAll` and `afterAll`. Reset `board_meta` id `default` to `next_sequence` 1 and `revision` 0. Do not call `prisma migrate reset`. Do not delete `example_items`. Do not touch the `work_board` database. Assert: `run` create of two tasks and a move, then a second `PrismaBoardRepository` using the same `PrismaService`, `read`s the same titles, columns, and `canUndo` true; undo on the second instance reverses the move; a `wip_limit_reached` or `validation_error` result does not change `currentRevision()`; a title whose `trim().length === 0` inserts no task row.
- [X] T011 [P] [US1] Add a failing test in `apps/api/src/modules/board/board.http.spec.ts`: create a task, close that app, create a second app, and `GET /api/v1/board` still returns that task and `canUndo` true. This fails while each `BoardModule` owns a new in-memory `Board`.
- [X] T012 [P] [US1] Add a failing test in `apps/web/src/features/board/components/board-view.test.tsx`. Mock `moveTask` to reject with `Error("The board could not be saved.")`. The existing card stays on screen, an alert contains that message, and the view does not switch to the empty-board or load-error screen.

### Implementation for User Story 1

- [X] T013 [US1] Add Prisma models and an additive migration under `apps/api/prisma/`. `BoardMeta` maps to `board_meta` with `id` String `@id` (the only row is `default`), `nextSequence` Int `@map("next_sequence")` not null starting at 1, and `revision` Int not null starting at 0. `BoardTask` maps to `board_tasks` with `id` String `@id`, `title` String not null, `column` String not null, and `sequence` Int not null `@unique`. `BoardHistoryEntry` maps to `board_history_entries` with `position` Int `@id`, `type` String, `taskId` String `@map("task_id")` not null, `fromColumn` String? `@map("from_column")`, and `toColumn` String? `@map("to_column")`. Do not store `wipLimit`. Migration SQL must `INSERT INTO board_meta (id, next_sequence, revision) VALUES ('default', 1, 0)`. Run `pnpm db:migrate` and read the generated SQL. Do not reset a non-test database.
- [X] T014 [US1] Create `apps/api/src/modules/board/infrastructure/persistence/mappers/board.mapper.ts`. Map snapshot tasks and history to those columns and back. Accept column text only when it is `todo`, `in_progress`, or `done`. Accept history `type` only when it is `TASK_CREATED` or `TASK_MOVED`. `fromColumn` and `toColumn` are null for `TASK_CREATED`. Any other stored column or type throws. Do not import `@repo/contracts`.
- [X] T015 [US1] Implement `apps/api/src/modules/board/infrastructure/persistence/repositories/prisma-board.repository.ts` so T010 passes. Inside `prisma.$transaction`, lock the meta row with `SELECT id FROM board_meta WHERE id = 'default' FOR UPDATE`, load tasks and history, `Board.hydrate` with the passed `wipLimit`, run `work`, and on `result.status === "success"` delete and reinsert task and history rows, then update `next_sequence` and increment `revision`. A missing meta row throws. `read` and `currentRevision` do not lock and do not write. Unknown mapper data throws. Do not call Redis.
- [X] T016 [US1] Add `apps/api/src/modules/board/application/use-cases/get-board.use-case.ts`, `create-task.use-case.ts`, `move-task.use-case.ts`, and `undo-board.use-case.ts`. Construct them with `BoardRepository` and `wipLimit` only. `CreateTaskUseCase.execute({ id, title })` calls `board.createTask(id, title)` inside `run`. Move and undo call the matching `Board` methods. Catch a repository or mapper throw and throw `BoardUnavailableError`. Use message `The board could not be loaded.` for a failed read and `The board could not be saved.` for a failed `run`. Do not import `CachePort` yet.
- [X] T017 [US1] Wire `apps/api/src/modules/board/board.module.ts` and `apps/api/src/modules/board/presentation/board.controller.ts`. Remove the `Board` singleton provider. Bind `BOARD_REPOSITORY` to `PrismaBoardRepository` and construct each use case with `useFactory`, injecting the repository and `BOARD_WIP_LIMIT` from `ConfigService`. The controller calls the use cases. Keep parsing `createTaskSchema` and `moveTaskSchema` in the controller. Schema failure still returns HTTP 400 `{ result, board }` using `read` for the current board, or `BOARD_UNAVAILABLE` when that read throws. Keep the status map in `apps/api/src/modules/board/presentation/board-http.ts`, including `duplicate_task_id` at 409. `main.ts` already registers `GlobalExceptionFilter`; do not catch `BoardUnavailableError` in the controller.
- [X] T018 [US1] Point `apps/api/src/modules/board/board.http.spec.ts` at a testing module that provides the controller, the four use cases, and `InMemoryBoardRepository`. Do not import `AppModule`, `PrismaModule`, or `CacheModule`. `beforeEach` uses a fresh repository so existing cases stay isolated. The T011 test passes one repository into two apps. Register `GlobalExceptionFilter` and add a test whose repository `run` throws: `POST /api/v1/tasks` returns 503 `{ statusCode: 503, error: "Service Unavailable", code: "BOARD_UNAVAILABLE", message: "The board could not be saved." }` and the body has no `result` field. Existing create, move, and undo cases still pass with an id in the create body.
- [X] T019 [US1] In `apps/web/src/lib/api/board.ts`, when a mutation response is 503 and the body matches `apiErrorSchema` with `code` `BOARD_UNAVAILABLE`, throw `Error` using that `message`. In `apps/web/src/features/board/hooks/use-move-task.ts`, `use-undo.ts`, and `use-create-task.ts`, `onError` must not call `setQueryData`. In `apps/web/src/features/board/components/board-view.tsx`, show `error.message` in the feedback alert and leave the loaded cards in place. A failed `GET` still uses the existing load-error state. Make T012 pass.

**Checkpoint**: A second repository instance returns the saved tasks and undo stack. Storage failure is HTTP 503 and does not change the cards. Create still accepts an id. Stop here to validate the MVP before title-only create.

---

## Phase 4: User Story 2 - Add a task by title alone (Priority: P1)

**Goal**: The person enters a title. The server assigns a UUID. The screen shows the title and no task identifier. The same title can be created twice.

**Independent Test**: The new-task screen has only a title field. Create `Prepare the report` twice. Both cards show that title, the ids differ, and neither card shows an id.

### Tests for User Story 2

- [X] T020 [P] [US2] Extend `packages/contracts/src/board/board.schema.test.ts`. `createTaskSchema` accepts `{ "title": "Prepare the report" }` and `{ "title": " A " }` without trimming the stored title. It rejects a title that is missing, not a string, `""`, or only spaces, with message `Enter a visible title.` An extra `id` property is stripped and is not on the parsed output. `taskSchema` still requires `id`, `title`, and `column`. `duplicate_task_id` remains in the error-code enum. Confirm these assertions fail before T024.
- [X] T021 [P] [US2] Rewrite `apps/web/src/features/board/components/create-task-dialog.test.tsx`. There is no id input, label, or placeholder. An empty title shows `Enter a visible title.` A successful create closes or resets the dialog. Creating the same title twice is success, not `duplicate_task_id`. A `validation_error` keeps the entered title and does not render a new card.
- [X] T022 [P] [US2] Extend `apps/web/src/features/board/components/board-view.test.tsx` so a card whose `id` is not equal to its `title` shows the title as the heading, the accessible name, and the destination label. The rendered text and accessible name do not contain that `id`.
- [X] T023 [P] [US2] Extend `apps/api/src/modules/board/board.http.spec.ts`. `POST /api/v1/tasks` with `{ "title": "Prepare the report" }` returns 201 `task_created`, the task only in `todo`, and an `id` matching a UUID. A second request with the same title returns 201 and a different `id`. A spaces-only title returns 400 `validation_error` and the same board as before. A body that also sends `id` does not store that `id`.

### Implementation for User Story 2

- [X] T024 [US2] Update `packages/contracts/src/board/task.schema.ts` so `createTaskSchema` is `{ title }` only, using the visible-title refine and message `Enter a visible title.` Do not use `.trim()` as a transform and do not use `.strict()`. Leave `duplicate_task_id` in `packages/contracts/src/board/action-result.schema.ts`. Keep the exports in `packages/contracts/src/index.ts`. Make T020 pass.
- [X] T025 [US2] Change `CreateTaskUseCase` in `apps/api/src/modules/board/application/use-cases/create-task.use-case.ts` so `execute` takes `{ title: string }` only. Inside one `repository.run` callback, call `crypto.randomUUID()` and `board.createTask(id, title)`. If the result is `duplicate_task_id`, try a new UUID, at most 3 attempts, still inside that same callback. After three `duplicate_task_id` results, throw `BoardUnavailableError` with `The board could not be saved.` A `validation_error` returns immediately and is not retried. Do not return `duplicate_task_id` to the controller.
- [X] T026 [US2] Update `apps/api/src/modules/board/presentation/board.controller.ts` so create parses `title` only and passes that to the use case. Update `apps/web/src/features/board/components/create-task-dialog.tsx` and `apps/web/src/features/board/components/task-card.tsx`. The dialog has one title field and no id field. The card heading, destination label, and accessible name use `title`. `id` may remain the drag id `task:${id}` and the move argument. Keep the component section order: states, library hooks, custom hooks, constants, functions, effects, return. Make T021, T022, and T023 pass.
- [X] T027 [US2] Update `apps/web/src/lib/api/board.ts` so `createTask` sends JSON `{ title }` only.

**Checkpoint**: Create no longer asks for an identifier. Two cards may share a title. Restart from User Story 1 still returns both.

---

## Phase 5: User Story 3 - Column order follows when work was added (Priority: P1)

**Goal**: Each column lists tasks by creation sequence, oldest first. Drop position does not reorder a column. Move, limit, and undo stay in force.

**Independent Test**: Create titles `C`, then `A`, then `B`. To Do shows `C`, `A`, `B`. Move `A` to Done. Done shows `A`. To Do shows `C` then `B`.

### Tests for User Story 3

- [X] T028 [P] [US3] Update `apps/api/src/modules/board/domain/board.spec.ts`. Creating ids `C`, then `A`, then `B` yields `getState().columns.todo` in that same order, not `A`, `B`, `C`. Creating `10` then `2` yields `10` then `2`, not text order `10` then `2`. Move the middle task to `done` and the source column keeps creation order. Undo of that move restores the task and the sequence order. Replace the old UTF-16 id-order assertions. Confirm the updated assertions fail before T030.
- [X] T029 [P] [US3] Add the quickstart sequence to `apps/api/src/modules/board/board.http.spec.ts` on one in-memory repository, limit 2. Create titles `C`, `A`, and `B` with no ids in the body. Move using the returned ids. Step 1: To Do is `C`, `A`, `B`. Step 2: move `C` to `in_progress`, code `task_moved`. Step 3: move `A` to `in_progress`, In Progress is `C` then `A` and the count is 2. Step 4: move `B` to `in_progress`, code `wip_limit_reached`, board unchanged. Step 5: undo, `A` returns to To Do, In Progress is `C`, To Do is `A` then `B`. Step 6: move `B` to `done`, code `task_moved`. Step 7: move `B` to `done` again, code `already_in_column`. Step 8: undo, `B` is back in To Do and Done is empty. After step 6, a second app on that same repository still shows `B` only in Done.

### Implementation for User Story 3

- [X] T030 [US3] In `apps/api/src/modules/board/domain/board.ts`, order each column by `sequence` ascending in `getState()`. Remove id-text sorting. Do not add a drop index parameter to `moveTask`. Make T028 and T029 pass.
- [X] T031 [P] [US3] Add a regression assertion to `apps/web/src/features/board/components/board-view.test.tsx`: a column array ordered `C`, `A`, `B` renders in that order. Do not sort cards in `apps/web/src/features/board/components/board-column.tsx` or `board-view.tsx`.

**Checkpoint**: Creation order survives a move, an undo, and a second repository read. The limit and undo codes from the Kanban board still hold.

---

## Phase 6: User Story 4 - A repeat visit matches the saved board (Priority: P2)

**Goal**: A cached board document is returned only when its revision matches `board_meta`. Redis failure still loads the saved board. A successful save updates the cache after commit. Clearing the cache does not delete tasks.

**Independent Test**: Seed the cache with revision 0 and a different title, then read the board. The response is the saved board, not the stale title. A cache `get` failure still returns the saved board.

### Tests for User Story 4

- [X] T032 [P] [US4] Add failing `apps/api/src/modules/board/application/use-cases/board.use-cases.spec.ts` using `InMemoryBoardRepository` and a `CachePort` fake. Cover: cache hit when `revision` equals `currentRevision()` returns that document and does not call `read`; miss (`get` returns null) calls `read` and `set` with `{ revision, board }` and key `board:state`; stale revision calls `read` and overwrites the key; `get` throwing still returns the saved board; `set` throwing after a successful create still returns that saved result; `validation_error` and `already_in_column` do not change `revision` and do not call `set`; `read` throwing rejects with `BoardUnavailableError` and does not call `set`.
- [X] T033 [P] [US4] Create `apps/api/src/modules/board/testing/in-memory-cache.ts` implementing `CachePort` (`get`, `set`, `delete`) for the HTTP spec. Support a test switch that makes `get` or `set` throw.

### Implementation for User Story 4

- [X] T034 [US4] Update `apps/api/src/modules/board/application/use-cases/get-board.use-case.ts` to take `CachePort` and `ttlSeconds`. `get(boardCacheKeys.state)`. Then `currentRevision()`. Return the cached `board` only when `cached.revision === revision`. Otherwise `read`, `set` the envelope `{ revision, board }` with `ttlSeconds`, and return that board. A thrown `get` or `set` is a miss or a skipped store, not `BOARD_UNAVAILABLE`. A thrown `currentRevision` or `read` is `BoardUnavailableError` with `The board could not be loaded.` Do not return a cached document when the revision cannot be read.
- [X] T035 [US4] Update `apps/api/src/modules/board/application/use-cases/create-task.use-case.ts`, `move-task.use-case.ts`, and `undo-board.use-case.ts` to take `CachePort` and `ttlSeconds`. After `run` returns `status` `success`, `set` `{ revision: currentRevision(), board: state }` at `board:state`. A thrown `set` still returns the saved `{ result, state }`. Do not `set` when status is `no_change` or `error`. Do not `set` when `run` throws.
- [X] T036 [US4] Update `apps/api/src/modules/board/board.module.ts` so each use-case factory injects `CACHE_PORT` and `CACHE_TTL_SECONDS` from `ConfigService`. Update `apps/api/src/modules/board/board.http.spec.ts` to provide `InMemoryCache` as `CACHE_PORT`. Do not construct `RedisCacheService` in that spec. Add one HTTP case: the cache starts with `{ revision: 0, board }` whose only task title is `Stale`, the repository has a different saved title, and `GET /api/v1/board` returns the saved title. Make T032 pass.

**Checkpoint**: A stale or missing cache cannot hide the latest saved board. Redis errors do not erase tasks or turn a successful save into an error.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Record the storage decision and run the quickstart checks.

- [X] T037 [P] Add `docs/decisions/0013-persisted-board.md`. State that it supersedes the board-storage paragraphs of `docs/decisions/0012-in-memory-board.md`. Record PostgreSQL as the saved board, the `board_meta` row lock, UUID plus `sequence`, and Redis key `board:state` checked against `revision`. Leave the undo stack rules in ADR 0012 standing. Do not delete ADR 0012.
- [X] T038 [P] Update `docs/architecture/overview.md` so the board path reads and writes PostgreSQL and uses the Redis cache-aside port. The API still listens when PostgreSQL or Redis is down. Board routes fail when the saved board cannot be read. Leave the example feature path intact.
- [X] T039 [P] Update `docs/guides/testing.md`. `pnpm test` does not open PostgreSQL or Redis and does not run `prisma-board.repository.spec.ts`. `pnpm test:e2e` applies migrations to `work_board_test`, runs that spec, and must not reset `work_board`.
- [X] T040 Update `README.md` sections that say the board is only in memory, that a restart clears it, and that board routes do not need PostgreSQL. State that tasks and undo history survive an API restart, that a successful board load needs PostgreSQL, and that Redis failure falls through to the saved board. Keep the limitations for no authentication, no redo, no second board, and no live collaboration. Do not invent repository URL, commit hash, video URL, or time spent. Link `docs/decisions/0013-persisted-board.md`.
- [X] T041 Run the checks in `specs/002-persist-board-auto-ids/quickstart.md`: `pnpm test`, `pnpm lint`, `pnpm typecheck`, `pnpm build`, and `pnpm test:e2e`. Fix failures caused by this feature. Do not reset a non-test database.
- [X] T042 Review the files listed in `specs/002-persist-board-auto-ids/plan.md` with `.cursor/skills/review-code/SKILL.md`. Fix Critical and High findings. Fix or justify Medium findings in the Notes section of this file only after that review exists.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies.
- **Foundational (Phase 2)**: Depends on Setup. Blocks every user story.
- **User Stories (Phases 3–6)**: Depend on Foundational. Implement in numeric order because later stories edit the same domain, use cases, controller, and screen.
- **Polish (Phase 7)**: Depends on User Story 4.

### User Story Dependencies

- **User Story 1 (P1)**: Starts after Foundational. No dependency on later stories. This is the MVP. Create still sends an id.
- **User Story 2 (P1)**: Starts after User Story 1. Title-only create replaces the id field on the route and the screen that User Story 1 already saves.
- **User Story 3 (P1)**: Starts after User Story 2. Ordering tests create tasks through the title-only route. Sequence numbers already exist from Foundational.
- **User Story 4 (P2)**: Starts after User Story 3. Cache tests wrap the use cases that already commit.

### Within Each User Story

- Tests for that story are written and fail before its implementation tasks.
- The migration and mapper land before the Prisma repository.
- Use cases land before the controller wiring.
- The web client lands before the component that calls it when they are split.
- Story complete before moving to the next priority.

### Parallel Opportunities

- T001 and T002 can run together.
- T003, T004, T005, and T006 can run together. T007 waits for T005. T008 waits for T007. T009 waits for T006 and T008.
- After Foundational, story phases stay sequential because they share `board.ts`, the use cases, `board.controller.ts`, and `board-view.tsx`.
- Inside a story, failing tests marked [P] can run together.
- T037, T038, and T039 can run together. T040, T041, and T042 stay sequential.

---

## Parallel Example: User Story 1

```bash
# Failing tests together:
# T010 apps/api/src/modules/board/infrastructure/persistence/repositories/prisma-board.repository.spec.ts
# T011 apps/api/src/modules/board/board.http.spec.ts
# T012 apps/web/src/features/board/components/board-view.test.tsx

# After those tests exist:
# T013 apps/api/prisma/schema.prisma
# T019 apps/web/src/lib/api/board.ts
```

## Parallel Example: User Story 2

```bash
# T020 packages/contracts/src/board/board.schema.test.ts
# T021 apps/web/src/features/board/components/create-task-dialog.test.tsx
# T022 apps/web/src/features/board/components/board-view.test.tsx
# T023 apps/api/src/modules/board/board.http.spec.ts

# After those tests exist:
# T024 packages/contracts/src/board/task.schema.ts
# T025 apps/api/src/modules/board/application/use-cases/create-task.use-case.ts
```

## Parallel Example: User Story 3

```bash
# T028 apps/api/src/modules/board/domain/board.spec.ts
# T029 apps/api/src/modules/board/board.http.spec.ts

# After those tests exist:
# T030 apps/api/src/modules/board/domain/board.ts
# T031 apps/web/src/features/board/components/board-view.test.tsx
```

## Parallel Example: User Story 4

```bash
# T032 apps/api/src/modules/board/application/use-cases/board.use-cases.spec.ts
# T033 apps/api/src/modules/board/testing/in-memory-cache.ts
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 and Phase 2.
2. Complete Phase 3.
3. Stop and validate the second-repository test: same titles, same columns, undo still reverses the last move.
4. Create still asks for an id at this checkpoint. That is expected.

### Incremental Delivery

1. Setup and Foundational unlock the snapshot, sequence counter, and repository port.
2. User Story 1 saves the board and reports storage failure without dropping the last good cards.
3. User Story 2 removes the id field and assigns the UUID on the server.
4. User Story 3 shows creation order instead of id text order.
5. User Story 4 keeps the repeat view aligned with the saved revision.
6. Polish records the decision and runs `pnpm test` and `pnpm test:e2e`.

### Parallel Team Strategy

One implementer should take the stories in order. Two people can split only the [P] tasks inside the current story when they do not edit the same file. Do not assign User Story 2 and User Story 3 to different people at the same time.

---

## Notes

- Code review on 2026-10-25 found one High issue: a slow save could cache an older board under a newer revision. `run` now returns the revision from the commit, and the cache stores that pair. A Medium finding, a read mixing two commits, was fixed by holding `FOR SHARE` on `board_meta` for the whole read. Create failures now show an alert. The re-review passed with no remaining Critical or High findings.
- [P] tasks use different files and do not depend on incomplete tasks.
- [US1] through [US4] map to the stories in `specs/002-persist-board-auto-ids/spec.md`.
- `wipLimit` stays `BOARD_WIP_LIMIT`. It is not a database column.
- HTTP task objects stay `{ id, title, column }`. `sequence` and `revision` stay off that document.
- `duplicate_task_id` stays in the schema union and the 409 map. The create route does not return it.
- Do not add authentication, editing, deletion, redo, a second board, or a limit control on the screen.
