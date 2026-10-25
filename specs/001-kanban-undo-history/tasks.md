# Tasks: Kanban Board with Undo History

**Input**: Design documents from `/specs/001-kanban-undo-history/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Included. spec.md defines acceptance scenarios for every story, and plan.md requires domain, HTTP, contract, and web tests. Write the tests for a story first and confirm they fail before that story's implementation.

**Organization**: Tasks are grouped by user story. Stories share `board.ts`, the controller, and `board-view.tsx`, so implement the stories in order even though each story has its own test checkpoint.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (US1–US5)
- Every task includes an exact file path

## Path Conventions

- API: `apps/api/src/modules/board/`
- Web: `apps/web/src/features/board/` and `apps/web/src/lib/api/board.ts`
- Contracts: `packages/contracts/src/board/`
- Feature docs: `specs/001-kanban-undo-history/`

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Add the one missing library. The monorepo, NestJS, Next.js, Zod, TanStack Query, and React Hook Form are already present.

- [X] T001 [P] Add `@dnd-kit/core` to `apps/web/package.json` and install it with pnpm. Do not add `@dnd-kit/sortable`.
- [X] T002 [P] Add `BOARD_WIP_LIMIT=2` to `apps/api/.env.example` with a comment that the value is a positive integer and that Docker is not required for the board.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Configuration, test runner, domain types, and shared Zod documents that every story uses.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T003 [P] Add `BOARD_WIP_LIMIT` to `apps/api/src/config/env.schema.ts` as `z.coerce.number().int().positive().default(2)`. A missing variable becomes 2. A non-positive or non-integer value must reject process start.
- [X] T004 [P] In `apps/api/src/shared/database/prisma.service.ts`, catch a failed `$connect()` in `onModuleInit`, log the failure, and do not rethrow. Leave `PrismaModule` and `ExampleModule` registered. Redis already continues when connect fails. Do not change Redis behavior.
- [X] T005 [P] Remove `globalSetup` from `apps/api/jest.config.cjs` and ignore `src/modules/example/infrastructure/persistence/repositories/prisma-example-item.repository.spec.ts` in that config. Update `testRegex` in `apps/api/test/jest-e2e.json` so that same Prisma repository spec still runs with the e2e config that keeps `globalSetup`. Default `pnpm test` must not run `prisma migrate deploy`.
- [X] T006 [P] Create `apps/api/src/modules/board/domain/board.types.ts` with `Column`, `Task`, `HistoryEntry`, `ActionResult`, and `BoardState` only. Column is exactly `todo` | `in_progress` | `done`. Task fields are `id`, `title`, and `column`, all required. History is internal: `TASK_CREATED` with `taskId`, or `TASK_MOVED` with `taskId`, `from`, and `to`. `ActionResult` is discriminated by `status`: success codes `task_created` | `task_moved` | `undo_success`; no_change codes `already_in_column` | `nothing_to_undo`; error codes `validation_error` | `duplicate_task_id` | `task_not_found` | `invalid_column` | `wip_limit_reached`. `BoardState` is `columns` for those three ids, `wipLimit`, and `canUndo`. Do not import Nest, Prisma, Redis, HTTP, React, or `@repo/contracts`.
- [X] T007 [P] Write failing schema tests in `packages/contracts/src/board/board.schema.test.ts` for the board document, the action-result union, create input, and move input. Cover: create `id` and `title` fail when `trim().length === 0` and are not trimmed when they contain a visible character; move `destination` is a string so `"not-a-column"` still parses; the board document requires `columns.todo`, `columns.in_progress`, `columns.done`, `wipLimit`, and `canUndo`.
- [X] T008 Implement the schemas asserted by T007 in `packages/contracts/src/board/task.schema.ts`, `packages/contracts/src/board/board.schema.ts`, and `packages/contracts/src/board/action-result.schema.ts`, and export the schemas and inferred types from `packages/contracts/src/index.ts`. Infer types with `z.infer`. The create schema must not use `.trim()` as a transform. The action-result schema is a discriminated union on `status` with only the codes listed in T006 for each status.

**Checkpoint**: Env validation, fail-open Prisma startup, database-free unit Jest, domain types, and shared contracts are ready. User stories can begin.

---

## Phase 3: User Story 1 - See the work board (Priority: P1) 🎯 MVP

**Goal**: A person opens one shared board and sees To Do, In Progress, and Done, a 0/2 limit display, a disabled undo control, a waiting state while the board loads, and an error state when it cannot load.

**Independent Test**: Open the board before any tasks exist and confirm the three columns, a work-in-progress display of 0/2, undo unavailable, and an empty state in each column.

### Tests for User Story 1

- [X] T009 [P] [US1] Add failing domain tests in `apps/api/src/modules/board/domain/board.spec.ts` that a `Board` constructed with no argument has `wipLimit` 2, three empty column arrays (`todo`, `in_progress`, `done`), and `canUndo` false. Assert a constructor argument of `3` is returned as `wipLimit`.
- [X] T010 [P] [US1] Add a failing Supertest test in `apps/api/src/modules/board/board.http.spec.ts` that boots `BoardModule` with config, not `AppModule`, and `GET /api/v1/board` returns 200 with empty `todo`, `in_progress`, and `done` arrays, `wipLimit` 2, and `canUndo` false. The test must not open PostgreSQL or Redis.
- [X] T011 [P] [US1] Add a failing render test in `apps/web/src/features/board/components/board-view.test.tsx` for the waiting state, the load-error state with a retry control, and the loaded empty board showing labels `To Do`, `In Progress`, and `Done`, `In Progress — 0/2`, an empty message in each column, and a disabled undo control.

### Implementation for User Story 1

- [X] T012 [P] [US1] Implement `Board` in `apps/api/src/modules/board/domain/board.ts` with `constructor(wipLimit: number = 2)`, private tasks, and a private history stack. `getState()` returns `columns.todo`, `columns.in_progress`, and `columns.done` sorted by UTF-16 code-unit comparison (`<` and `>`), plus `wipLimit` and `canUndo` equal to `history.length > 0`. Do not store a separate utilization field. Do not import `@repo/contracts`.
- [X] T013 [US1] Add `apps/api/src/modules/board/board.module.ts` and `GET /api/v1/board` in `apps/api/src/modules/board/presentation/board.controller.ts`. Provide one singleton `Board` from `BOARD_WIP_LIMIT`. The controller calls `getState()` and returns that document with HTTP 200. Do not attach a Zod schema to the parameter decorator.
- [X] T014 [US1] Import `BoardModule` in `apps/api/src/app.module.ts` without removing `PrismaModule`, `CacheModule`, or `ExampleModule`.
- [X] T015 [P] [US1] Implement `getBoard` in `apps/web/src/lib/api/board.ts` using `NEXT_PUBLIC_API_URL` and parse the JSON with the shared board schema. Do not route this call through `apiFetch` in `apps/web/src/lib/api/client.ts`, because that helper expects `apiErrorSchema` and throws on every non-OK status.
- [X] T016 [US1] Add `boardKeys.state()` returning `["board"]` in `apps/web/src/features/board/hooks/board-query-keys.ts` and `useBoard` in `apps/web/src/features/board/hooks/use-board.ts` that queries `GET /api/v1/board`.
- [X] T017 [US1] Implement `apps/web/src/features/board/components/board-column.tsx`, `apps/web/src/features/board/components/undo-button.tsx`, and `apps/web/src/features/board/components/board-view.tsx`. Show a waiting state before the first board response, an error state with retry when the query fails and no board is available, and otherwise the three columns in order with empty copy `No tasks`. The In Progress heading includes the count and the limit, for example `In Progress — 0/2`. The undo control is visible and disabled when `canUndo` is false. Follow the component body order: states, library hooks, custom hooks, constants, functions, effects, return. Do not add an empty effect.
- [X] T018 [US1] Render the board from `apps/web/src/app/page.tsx` instead of the example board. Leave the example feature files in place.

**Checkpoint**: The empty board loads from the API and matches the User Story 1 test. Stop here to validate the MVP before creates and moves.

---

## Phase 4: User Story 2 - Create a task (Priority: P1)

**Goal**: A person creates a task with an id and a title. It appears only in To Do, sorted by id, and undo becomes available. Invalid and duplicate creates leave the board and history unchanged.

**Independent Test**: Create tasks `A`, `B`, and `C` and confirm all three appear only in To Do, sorted by id, with undo available. Create `A` again and confirm the board does not gain another task.

### Tests for User Story 2

- [X] T019 [P] [US2] Extend `apps/api/src/modules/board/domain/board.spec.ts` with failing create tests. Success returns status `success` and code `task_created`, places the task only in `todo`, and sets `canUndo` true. A second create with the same exact id returns `duplicate_task_id` and does not change tasks or history. An id or title whose `trim().length === 0` returns `validation_error` and changes nothing. `A` and ` A` are different ids when the latter has a visible character. Creating `C`, then `A`, then `B` yields `A`, `B`, `C` in `todo`. Creating `10` and `2` yields `10` then `2`.
- [X] T020 [P] [US2] Extend `apps/api/src/modules/board/board.http.spec.ts` with failing `POST /api/v1/tasks` tests. Body `{ "id": "A", "title": "Prepare the report" }` returns 201 and `{ result, board }` with code `task_created` and the task only in `todo`. A duplicate id returns 409 and `duplicate_task_id` with the same board as before the call. A spaces-only title returns 400 and `validation_error` with the unchanged board. There is no column field in the request.
- [X] T021 [P] [US2] Add failing tests in `apps/web/src/features/board/components/create-task-dialog.test.tsx` for inline schema errors on an empty id or title, a successful submit that closes or resets the dialog, and a `duplicate_task_id` response that keeps the entered values and does not render a new card.

### Implementation for User Story 2

- [X] T022 [US2] Implement `createTask(id, title)` in `apps/api/src/modules/board/domain/board.ts`. Reject when `id` or `title` has `trim().length === 0` with `validation_error`. Reject an existing exact id with `duplicate_task_id`. Otherwise store the task with `column` `todo`, push one `TASK_CREATED` step, and return `task_created`. Finish every check before writing tasks or history.
- [X] T023 [US2] Add `apps/api/src/modules/board/presentation/board-http.ts` mapping `task_created` to 201, `task_moved` / `undo_success` / `already_in_column` / `nothing_to_undo` to 200, `validation_error` / `invalid_column` to 400, `task_not_found` to 404, and `duplicate_task_id` / `wip_limit_reached` to 409. Handle `POST /api/v1/tasks` in `apps/api/src/modules/board/presentation/board.controller.ts` by parsing the body with the shared create schema. Schema failure returns 400 `{ result: { status: "error", code: "validation_error", message }, board }` using the current board. Success and duplicate responses use the same envelope and the mapped status. Do not use `@Body({ schema })`.
- [X] T024 [P] [US2] Add `createTask` to `apps/web/src/lib/api/board.ts`. Parse both OK and expected 400/409 bodies with the mutation schema and return `{ result, board }`. Throw only when the body does not match that schema or the status is outside 200, 201, 400, 404, and 409.
- [X] T025 [US2] Implement `apps/web/src/features/board/hooks/use-create-task.ts` so a returned mutation writes `body.board` with `setQueryData(boardKeys.state(), body.board)` and does not invalidate the board query.
- [X] T026 [US2] Implement `apps/web/src/features/board/components/create-task-dialog.tsx` with React Hook Form, `zodResolver`, and the shared create schema, and render id and title cards from `apps/web/src/features/board/components/task-card.tsx`. Wire the dialog into `apps/web/src/features/board/components/board-view.tsx`. On success, close or reset the dialog and show `result.message`. On refusal, keep the entered values and show the error. Keep the component body order used in T017.

**Checkpoint**: Tasks can be created through the UI and the API. Duplicate and blank creates do not change the board. Undo is available and still does nothing until User Story 4.

---

## Phase 5: User Story 3 - Move a task and respect the work-in-progress limit (Priority: P1)

**Goal**: A person moves a task to any of the three columns by dragging or by a non-drag control. In Progress refuses an incoming task when its length is already `wipLimit`. Refusals and same-column moves do not change history. The card does not change column until the response arrives.

**Independent Test**: With the limit at 2, move two tasks into In Progress, then attempt a third. The third stays in its original column, the display reads 2/2, and undo still points at the second successful move.

### Tests for User Story 3

- [X] T027 [P] [US3] Extend `apps/api/src/modules/board/domain/board.spec.ts` with failing move tests. A move to a different valid column returns `task_moved`, leaves the task in only that column, and pushes one `TASK_MOVED` step. A move from `todo` directly to `done` succeeds. The same column returns `already_in_column` and pushes nothing. An unknown id returns `task_not_found`. A destination other than `todo`, `in_progress`, or `done` returns `invalid_column`. With `wipLimit` 2, the second move into `in_progress` succeeds and the third returns `wip_limit_reached` without changing tasks or history. A move out of a full `in_progress` succeeds and the derived count decreases by one.
- [X] T028 [P] [US3] Extend `apps/api/src/modules/board/board.http.spec.ts` with failing `POST /api/v1/tasks/:id/move` tests for the codes and statuses in T023: `task_moved` 200, `already_in_column` 200, `task_not_found` 404, `invalid_column` 400, `wip_limit_reached` 409, and a missing `destination` 400 `validation_error`. Each body is `{ result, board }`. Assert the refused third move leaves the previous board and `canUndo` unchanged.
- [X] T029 [P] [US3] Extend `apps/web/src/features/board/components/board-view.test.tsx` so a board at 2/2 shows that utilization, keeps In Progress visible, and a `wip_limit_reached` mutation shows an error while the task stays in its original column.

### Implementation for User Story 3

- [X] T030 [US3] Implement `moveTask(id, destination)` in `apps/api/src/modules/board/domain/board.ts`. Apply the checks in this order before any write: missing id → `task_not_found`; destination not one of the three identifiers → `invalid_column`; destination equal to the current column → `already_in_column`; destination `in_progress` while that column's length is already `wipLimit` → `wip_limit_reached`; otherwise set the column, push one `TASK_MOVED` step with `from` and `to`, and return `task_moved`. Moving out of `in_progress` is allowed at any count.
- [X] T031 [US3] Handle `POST /api/v1/tasks/:id/move` in `apps/api/src/modules/board/presentation/board.controller.ts`. Parse the body with the shared move schema. A schema failure returns 400 `validation_error` and the current board. Pass a parsed string destination through to `moveTask` so an unknown destination returns `invalid_column` from the domain. Respond with `{ result, board }` and the status from `apps/api/src/modules/board/presentation/board-http.ts`.
- [X] T032 [P] [US3] Add `moveTask` to `apps/web/src/lib/api/board.ts` using the same mutation parsing rule as T024, and implement `apps/web/src/features/board/hooks/use-move-task.ts` to `setQueryData` the returned board without invalidating.
- [X] T033 [US3] Make cards draggable and columns droppable with `@dnd-kit/core` in `apps/web/src/features/board/components/task-card.tsx`, `apps/web/src/features/board/components/board-column.tsx`, and `apps/web/src/features/board/components/board-view.tsx`. A drop on a column calls the move mutation with that column id. A drop outside a column does nothing. Do not write the query cache before the response, and do not reorder cards by drop index. Add a native select of the three column identifiers and a submit control on the card that calls the same mutation. When the count equals `wipLimit`, In Progress stays visible and droppable. Show `result.message` for success, no-change, and error in one feedback region.

**Checkpoint**: Dragging and the non-drag control follow the same server result. A full In Progress column rejects another incoming task without recording history.

---

## Phase 6: User Story 4 - Undo the last successful change (Priority: P1)

**Goal**: Undo reverses the newest successful create or move, does not record itself, and can be repeated until the history is empty. Empty undo returns code `nothing_to_undo` and does not change the board. The undo control is disabled when nothing can be undone.

**Independent Test**: Create a task, move it, then undo twice. The first undo restores the original column. The second removes the task. A third undo returns `nothing_to_undo`.

### Tests for User Story 4

- [X] T034 [P] [US4] Extend `apps/api/src/modules/board/domain/board.spec.ts` with failing undo tests. Undo of create removes that task, returns `undo_success`, and allows the same id to be created again. Undo of a move restores `from`. One undo reverses only the newest successful step. A refused move or a same-column move is not the step that undo reverses. Undo pushes nothing. Empty history returns status `no_change` and code `nothing_to_undo` without changing tasks or history. Repeating undo until empty, then once more, still returns `nothing_to_undo`. A sequence that respected the limit still respects it after every undo, including a move back into `in_progress`, because undo must not re-check the limit.
- [X] T035 [P] [US4] Extend `apps/api/src/modules/board/board.http.spec.ts` with failing `POST /api/v1/board/undo` tests. A recorded step returns 200 `undo_success` and the restored board. An empty history returns 200, not an error status, with code `nothing_to_undo` and the same board. Two sequential undos on one process share the same board instance.
- [X] T036 [P] [US4] Extend `apps/web/src/features/board/components/board-view.test.tsx` so the undo control is disabled when `canUndo` is false, enabled when `canUndo` is true, and a successful undo plus a `nothing_to_undo` response both show `result.message` and render the returned board.

### Implementation for User Story 4

- [X] T037 [US4] Implement `undo()` in `apps/api/src/modules/board/domain/board.ts`. An empty stack returns `nothing_to_undo` and writes nothing. Otherwise apply the inverse, then pop: `TASK_CREATED` removes that task; `TASK_MOVED` sets the column back to `from`. Return `undo_success`. Do not push a step and do not reject the inverse because `in_progress` is full.
- [X] T038 [US4] Handle `POST /api/v1/board/undo` in `apps/api/src/modules/board/presentation/board.controller.ts` with no request body. Return `{ result, board }` and the status from `apps/api/src/modules/board/presentation/board-http.ts`, including HTTP 200 for `nothing_to_undo`.
- [X] T039 [P] [US4] Add `undo` to `apps/web/src/lib/api/board.ts` and implement `apps/web/src/features/board/hooks/use-undo.ts` to `setQueryData` the returned board without invalidating.
- [X] T040 [US4] Call the undo mutation from `apps/web/src/features/board/components/undo-button.tsx` and `apps/web/src/features/board/components/board-view.tsx`. Disable the control when `canUndo` is false or the board is not loaded. After the response, show `result.message` and render `response.board`.

**Checkpoint**: Create and move can be undone one step at a time. Empty undo is a no-change result with code `nothing_to_undo`.

---

## Phase 7: User Story 5 - Official acceptance sequence (Priority: P1)

**Goal**: The original seven-step sequence matches the spec on a board whose limit is 2, including history that ignores the refused move and the same-column move.

**Independent Test**: From a board that contains only tasks `A`, `B`, and `C` in To Do, run the seven actions and compare the board after each action with the expected result in spec.md User Story 5.

### Tests for User Story 5

- [X] T041 [P] [US5] Add the official sequence to `apps/api/src/modules/board/domain/board.spec.ts`. Start by creating `A`, `B`, and `C`. Then: move `A` to `in_progress` (`task_moved`); move `B` to `in_progress` (`task_moved`, display data 2/2); move `C` to `in_progress` (`wip_limit_reached`, history unchanged); undo (`undo_success`, `B` back in `todo`, only `A` in `in_progress`); move `C` to `done` (`task_moved`); move `C` to `done` again (`already_in_column`, history unchanged); undo (`undo_success`, `C` back in `todo`). The final board has `A` in `in_progress`, `B` then `C` in `todo`, `done` empty, derived count 1 of limit 2, and `canUndo` true.
- [X] T042 [P] [US5] Add the same seven-step sequence to `apps/api/src/modules/board/board.http.spec.ts` on one `BoardModule` process. Assert the HTTP status for each step and that `response.body.board` matches the final domain board, including id order and `canUndo` true.

**Checkpoint**: The official sequence passes in the domain and over HTTP. No extra screen is required for this story.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Submission docs and the validation run from quickstart.md.

- [X] T043 [P] Write `docs/decisions/0012-in-memory-board.md` recording two decisions already made in `specs/001-kanban-undo-history/research.md`: one in-memory `Board` singleton instead of Prisma or Redis, and an operation stack instead of board snapshots. Include why the API still boots when PostgreSQL connect fails.
- [X] T044 [P] Update `docs/architecture/overview.md` so the board flow is described as in-memory and usable when PostgreSQL and Redis are not running. Keep the example feature's database and cache path intact.
- [X] T045 [P] Update `docs/guides/testing.md` so `pnpm test` for the board does not need Docker, and `pnpm test:e2e` still applies migrations to `work_board_test` and runs the Prisma repository spec.
- [X] T046 [P] Write `docs/VIDEO_SCRIPT.md` as an 8–12 minute spoken outline covering the project, the full-stack focus, the architecture, a live scenario different from the official sequence, work-in-progress enforcement, undo, one automated test, the relevant code, two technical decisions, how AI suggestions were checked, and the limitations. Do not add slides and do not claim the video was recorded.
- [X] T047 Update `README.md` for Case 01. Include how to install, configure env, and run the web and API without starting PostgreSQL or Redis; how to run test, lint, and typecheck; the domain, in-memory state, shared contracts, undo, work-in-progress rule, and query-cache sync; the manual demo from `specs/001-kanban-undo-history/quickstart.md`; three real tests and the bugs they catch; two decisions from `specs/001-kanban-undo-history/research.md` with what was checked, the alternatives, how they were investigated, and the conclusion; AI usage that records only work that actually happened; limitations (restart clears state, no collaboration, no persistence, no redo, no authentication, no multi-instance consistency); and blank placeholders for repository URL, commit hash, video URL, and time spent. Do not invent those placeholder values.
- [X] T048 Run the validation commands in `specs/001-kanban-undo-history/quickstart.md`: `pnpm test`, `pnpm lint`, `pnpm typecheck`, and `pnpm build`. Fix board failures before calling the feature complete. `pnpm test:e2e` is not required for this checkpoint.
- [X] T049 Review the board change listed in `specs/001-kanban-undo-history/plan.md` with the code-reviewer workflow in `.cursor/skills/review-code/SKILL.md`. Fix Critical and High findings. Fix or explicitly justify Medium findings in `specs/001-kanban-undo-history/tasks.md` notes only after the review exists.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies.
- **Foundational (Phase 2)**: Depends on Setup. Blocks every user story.
- **User Stories (Phases 3–7)**: Depend on Foundational. Implement in numeric order because later stories extend the same domain, controller, and screen files.
- **Polish (Phase 8)**: Depends on User Story 5.

### User Story Dependencies

- **User Story 1 (P1)**: Starts after Foundational. No dependency on later stories. This is the MVP.
- **User Story 2 (P1)**: Starts after User Story 1. Create tests need the `Board` and `GET /api/v1/board` shell. The dialog mounts on the User Story 1 view.
- **User Story 3 (P1)**: Starts after User Story 2. Move tests create tasks through `createTask`. The card and columns already render.
- **User Story 4 (P1)**: Starts after User Story 3. Undo tests need recorded creates and moves. The disabled undo control already exists from User Story 1.
- **User Story 5 (P1)**: Starts after User Story 4. It adds the official sequence tests and does not add a new screen.

### Within Each User Story

- Tests for that story are written and fail before its implementation tasks.
- Domain behavior lands before the controller route that exposes it.
- The web client function lands before the hook, and the hook lands before the component wiring.
- Tasks marked [P] inside a story touch different files and do not wait on each other.

### Parallel Opportunities

- T001 and T002 can run together.
- T003, T004, T005, T006, and T007 can run together. T008 waits for T007.
- After Foundational, story phases themselves stay sequential because they share `apps/api/src/modules/board/domain/board.ts`, `apps/api/src/modules/board/presentation/board.controller.ts`, and `apps/web/src/features/board/components/board-view.tsx`.
- Inside a story, the failing tests can run together, and the domain implementation can run together with the web client function when both are marked [P].
- T043, T044, T045, and T046 can run together. T047, T048, and T049 stay sequential after the stories.

---

## Parallel Example: User Story 1

```bash
# Failing tests together:
# T009 apps/api/src/modules/board/domain/board.spec.ts
# T010 apps/api/src/modules/board/board.http.spec.ts
# T011 apps/web/src/features/board/components/board-view.test.tsx

# Then, in parallel, the domain and the web reader:
# T012 apps/api/src/modules/board/domain/board.ts
# T015 apps/web/src/lib/api/board.ts
```

## Parallel Example: User Story 2

```bash
# T019 apps/api/src/modules/board/domain/board.spec.ts
# T020 apps/api/src/modules/board/board.http.spec.ts
# T021 apps/web/src/features/board/components/create-task-dialog.test.tsx

# After those tests exist:
# T022 apps/api/src/modules/board/domain/board.ts
# T024 apps/web/src/lib/api/board.ts
```

## Parallel Example: User Story 3

```bash
# T027 apps/api/src/modules/board/domain/board.spec.ts
# T028 apps/api/src/modules/board/board.http.spec.ts
# T029 apps/web/src/features/board/components/board-view.test.tsx

# After those tests exist:
# T030 apps/api/src/modules/board/domain/board.ts
# T032 apps/web/src/lib/api/board.ts
```

## Parallel Example: User Story 4

```bash
# T034 apps/api/src/modules/board/domain/board.spec.ts
# T035 apps/api/src/modules/board/board.http.spec.ts
# T036 apps/web/src/features/board/components/board-view.test.tsx

# After those tests exist:
# T037 apps/api/src/modules/board/domain/board.ts
# T039 apps/web/src/lib/api/board.ts
```

## Parallel Example: User Story 5

```bash
# T041 apps/api/src/modules/board/domain/board.spec.ts
# T042 apps/api/src/modules/board/board.http.spec.ts
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 and Phase 2.
2. Complete Phase 3.
3. Stop and validate the empty board, waiting state, and error state against the User Story 1 independent test.

### Incremental Delivery

1. Setup and Foundational unlock the board types, contracts, and database-free test run.
2. User Story 1 delivers a visible empty board.
3. User Story 2 delivers create, validation, and duplicate rejection.
4. User Story 3 delivers movement, both controls, and the work-in-progress limit.
5. User Story 4 delivers undo and `nothing_to_undo`.
6. User Story 5 locks the official sequence.
7. Polish records the decisions and proves `pnpm test`, `pnpm lint`, `pnpm typecheck`, and `pnpm build`.

### Parallel Team Strategy

One implementer should take the stories in order. Two people can split only the [P] tasks inside the current story: one on the domain file, one on the web client or a test file that the other person is not editing. Do not assign User Story 3 and User Story 4 to different people at the same time.

---

## Notes

- [P] tasks use different files and do not depend on incomplete tasks.
- Code review on 2026-10-25 returned no Critical or High findings. The Medium finding was fixed by pinning `BOARD_WIP_LIMIT` to 2 inside the board HTTP test. The Low findings were fixed by describing the last enabled undo click as `undo_success`, and by prefixing drag ids with `task:` and `column:`.
- [US1] through [US5] map to the stories in `specs/001-kanban-undo-history/spec.md`.
- Utilization is `columns.in_progress.length`. Do not add a stored count field.
- History stays inside the domain. HTTP board documents expose `canUndo` only.
- Do not add authentication, editing, deletion, redo, a second board, or a limit control on the screen.
