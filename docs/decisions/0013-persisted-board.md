# ADR 0013: Persisted board

## Context

The Kanban board started as one in-memory aggregate per API process. Restarting the process cleared tasks and undo history, and board routes did not use PostgreSQL or Redis. People now need the same board after a restart, a title-only create, and a repeat view that matches the last saved change.

ADR 0012 still describes the undo stack: push `TASK_CREATED` or `TASK_MOVED` on success, pop on undo, and do not re-check the work-in-progress limit.

## Decision

This decision supersedes the board-storage paragraphs of ADR 0012.

Store the one board in PostgreSQL: `board_meta` (row id `default`), `board_tasks`, and `board_history_entries`. A successful create, move, or undo runs inside a transaction that locks `board_meta` with `SELECT … FOR UPDATE`, then replaces the task and history rows. `revision` increments only on that commit. `next_sequence` assigns creation order and is not reused after undo. The work-in-progress limit stays `BOARD_WIP_LIMIT` and is not a column.

The create use case assigns `crypto.randomUUID()` inside that transaction. The person sends a title only. The HTTP task still includes `id` so a card can be moved. The screen does not render it. Columns are ordered by `sequence`, not by id text.

Redis key `board:state` holds `{ revision, board }` with `CACHE_TTL_SECONDS`. A read uses that copy only when `revision` equals `board_meta.revision`. A Redis read or write failure falls through to PostgreSQL. A PostgreSQL read or commit failure returns HTTP 503 `BOARD_UNAVAILABLE` and does not report success. The API process still starts when PostgreSQL or Redis is down.

## Alternatives

- Keep the in-memory singleton. Rejected. A restart would still drop the board.
- One JSON document column. Rejected. The example feature mapped rows to domain values, and sequence plus history are easier to check as columns.
- Serve Redis until TTL without a revision check. Rejected. A leftover key could show the board from before the latest save.
- Hide the task id from the HTTP document. Rejected. Drag and `POST /api/v1/tasks/:id/move` need it.

## Consequences

Restarting the API keeps tasks and undo history. Restarting or flushing Redis does not remove them. Board routes need PostgreSQL for a successful load. The example feature's Prisma and Redis path was left unchanged. Two API processes that share the database share one saved board. Live collaborative editing is still out of scope.

ADR 0014 removes the example feature this record left in place.
