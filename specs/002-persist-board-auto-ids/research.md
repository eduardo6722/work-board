# Research: Saved Board with Title-Only Tasks

## Persisted aggregate

**Decision**: Store the one board in PostgreSQL with Prisma 7 and the existing `@prisma/adapter-pg` adapter. Three tables: `board_meta` (one row, id `default`), `board_tasks`, and `board_history_entries`. A successful create, move, or undo replaces the task and history rows inside one interactive transaction that holds `SELECT … FOR UPDATE` on `board_meta`.

**Rationale**: The running model is already one aggregate: every action loads the tasks and the undo stack, mutates them, and returns the whole board. Relational rows keep identifiers, titles, columns, sequence, and history queryable and mappable without putting a Prisma type in the domain. The row lock makes one writer finish before the next starts, which matches "the last fully saved change is what the next view shows" without adding collaboration.

**Alternatives considered**:

- Leave the in-memory singleton and write through on a timer. A crash between actions still loses work, which fails the restart scenario.
- One JSON document column. Fewer tables, but it bypasses the repository mapping used by the example feature and makes sequence and history harder to check in SQL.
- A task row only, with undo rebuilt from an event log the client stores. Undo would not survive a second browser, and the spec keeps history with the board.

## Work-in-progress limit

**Decision**: Keep `BOARD_WIP_LIMIT` as process configuration, default 2. Do not store it. Hydrate `Board` with that value on every read and write.

**Rationale**: The spec says the limit stays a preset and is not something the person saves. A later process with a lower limit still shows the tasks already in In Progress and refuses further moves in. That only works if the limit is applied when the aggregate is built, not frozen in a row from the first run.

**Alternatives considered**:

- Persist the limit on `board_meta`. A changed environment variable would not take effect, which contradicts the edge case in the spec.
- Let the person edit the limit. Out of scope for both specifications.

## Identifiers and column order

**Decision**: The create use case assigns `crypto.randomUUID()` inside the locked transaction. The domain still receives that id and still rejects an id it already holds. The use case retries up to three times, then fails the request. Each successful create also takes the next integer `sequence` from `board_meta.next_sequence` and never returns that counter on undo. `getState()` orders each column by `sequence` ascending. The HTTP task document stays `{ id, title, column }` and omits `sequence`.

**Rationale**: The person does not type or read an identifier, and a removed identity must not be reused. A UUID is not derived from the title and is not reused after undo. UUID text order is not creation order (`10` before `2` was the old id rule). A monotonic sequence is the visible order and survives a restart. The move route and drag source still need `id` in the JSON even though the screen must not render it.

**Alternatives considered**:

- User-visible sequential labels such as `1`, `2`, `3` on the card. The spec removes identifier text from the screen. A visible number would bring back an id heading.
- Sort by `createdAt`. Two creates in the same millisecond can tie. Sequence does not.
- Generate the UUID in the browser. The spec assigns identity on the server, and a client id would be an identifier the person, or the page, supplies.

## Cache freshness

**Decision**: One Redis key, `board:state`. The value is `{ revision, board }`, where `board` is the HTTP board document and `revision` is `board_meta.revision`. TTL is the existing `CACHE_TTL_SECONDS` (default 60). `GetBoardUseCase` reads the key through `CachePort`, then reads the current revision. It returns the cached document only when the revisions match. Otherwise it loads the aggregate, stores the new envelope, and returns that document. A Redis `get` failure is a miss. After a successful commit, the use case stores the new envelope. If that `set` fails, the next read sees a miss or a revision mismatch and loads PostgreSQL. Domain refusals and no-change results do not increment `revision`.

**Rationale**: ADR 0005 and the caching skill require cache-aside, an explicit key, TTL, invalidation on write, and fail-open reads. TTL alone can still serve the previous board after a save, which fails the spec. The revision check is one primary-key read and is what makes a hit safe. Replacing the envelope after commit is the invalidation. There is no second server cache tier. The browser TanStack Query cache from the Kanban feature stays: mutations still `setQueryData` with `response.board` and do not invalidate that key.

**Alternatives considered**:

- Delete the key on write and fill it on the next read. Correct, but a reader between delete and the following read pays a full load, and a crashed process can leave the old key until TTL if delete never ran. The revision check covers that leftover.
- Cache the full undo stack. The HTTP document only needs `canUndo`. History stays in PostgreSQL.
- Skip Redis and rely on the browser cache. A new visit, a retry, or a second process would not have the short-lived server copy the spec asks for.

## Failure behavior

**Decision**: `PrismaService` still logs a failed connect and does not stop the API. Board read and write failures become `BoardUnavailableError` (`code` `BOARD_UNAVAILABLE`, HTTP 503) in the existing API error shape. The mutation envelope is not used for that failure, and the client must not apply a new board. Validation and domain refusals still return `{ result, board }` with the current saved document. Redis errors never become `BOARD_UNAVAILABLE`.

**Rationale**: The spec requires an error when the saved board cannot be read or the change cannot be saved, and it forbids reporting success for a change that was not saved. Reusing `validation_error` would be a false reason. The global filter already renders `DomainError` as `{ statusCode, error, code, message }`.

**Alternatives considered**:

- HTTP 500 `INTERNAL_ERROR` for both bugs and a down database. Callers could not tell a storage outage from a defect, and the message would be the generic unexpected-error text.
- A new board result code inside the mutation envelope. The loaded board would be mixed with a failure to reach storage, and the spec does not add a result code.

## Tests without a database

**Decision**: Domain tests construct `Board` in memory. Use-case tests and `board.http.spec.ts` use an in-memory `BoardRepository` and an in-memory `CachePort`. They do not import `AppModule`. `prisma-board.repository.spec.ts` runs under `pnpm test:e2e` against `work_board_test`, same as the example repository spec. Extend the e2e `testRegex` so this file is included. Do not point that spec at the `work_board` database.

**Rationale**: `pnpm test` today proves the board while Docker is stopped. Persistence still needs a real PostgreSQL proof. Splitting the Prisma spec onto the existing e2e config keeps both guarantees.

**Alternatives considered**:

- Move board HTTP tests into e2e. Every create and undo case would need Docker, and `pnpm test` would stop covering the routes.
- Mock `PrismaClient` in the HTTP spec. That tests the mock, not the route behavior, and the testing standard says to fake at the repository boundary instead.

## What this replaces

**Decision**: Add `docs/decisions/0013-persisted-board.md` during implementation. It supersedes the board-storage paragraphs of ADR 0012. ADR 0012 still describes operation undo: push on successful create and move, pop on undo, do not re-check the limit on undo. The example feature's Prisma and Redis path is unchanged.

**Rationale**: ADR 0012 says board routes never touch PostgreSQL or Redis and that a restart clears the board. Those statements become false. The undo rules do not.

**Alternatives considered**:

- Edit ADR 0012 in place. The historical decision would disappear, including why the first version was in memory.
- Leave the overview diagram saying the board is in memory. Operators would follow the wrong startup story.
