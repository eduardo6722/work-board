# Data Model: Saved Board with Title-Only Tasks

Domain types stay in `apps/api/src/modules/board/domain/`. HTTP types stay in `@repo/contracts`. The domain does not import the contract package. Persistence rows are mapped in infrastructure.

This model replaces the in-memory lifetime, the person-supplied id, and UTF-16 id ordering from `specs/001-kanban-undo-history/data-model.md`. Column identifiers, undo step kinds, and the work-in-progress check are unchanged.

## Column

Fixed set. No other value is a column.

| Identifier | Label |
| --- | --- |
| `todo` | To Do |
| `in_progress` | In Progress |
| `done` | Done |

## Task

| Field | Required | Stored | On the HTTP document | Rule |
| --- | --- | --- | --- | --- |
| `id` | yes | yes | yes | UUID assigned inside the locked create. Unique among tasks currently on the board. Never changed. Never shown in the UI. Not reused after undo removes the task. |
| `title` | yes | yes | yes | Non-empty after trim. Surrounding spaces are kept. Never changed. This is the name a person sees. |
| `column` | yes | yes | yes | One of the three identifiers. `todo` on create. Changed only by a successful move or by undo of a move. |
| `sequence` | yes | yes | no | Positive integer assigned once at create from `next_sequence`. Never changed and never reused. Columns are ordered by this value, oldest first. |

A task leaves the board only when its create is undone. Identical titles are allowed.

## Undo step

| Field | Rule |
| --- | --- |
| `position` | Zero-based index in the stack. The highest position is the newest step. Rebuilt when a successful change is saved. |
| `type` | `TASK_CREATED` or `TASK_MOVED`. |
| `taskId` | The task `id`. |
| `fromColumn` | Null for a create. The column left, for a move. |
| `toColumn` | Null for a create. The column entered, for a move. |

Only a successful create or a successful move pushes a step. Undo pops one step and does not push. A refusal or a no-change pushes nothing.

## Board aggregate

One board. There is no board id in the HTTP document.

| Field | Rule |
| --- | --- |
| `wipLimit` | Positive integer from `BOARD_WIP_LIMIT` at hydration. Default 2. Not stored. Not changed by an action. |
| tasks | The current task rows. |
| history | The undo stack. |
| `nextSequence` | Next integer to assign. Starts at 1. Increases on successful create. Does not decrease on undo. |
| `revision` | Integer on the meta row. Starts at 0. Increases by 1 only when a successful create, move, or undo commits. |

Derived view (`getState()`), which is the HTTP board document:

| Field | Rule |
| --- | --- |
| `columns.todo`, `columns.in_progress`, `columns.done` | Tasks in that column, ordered by `sequence` ascending. Each task object is `{ id, title, column }`. |
| `wipLimit` | The hydrated limit. |
| `canUndo` | True when the history stack is not empty. |

## Persistence

Table names use the Prisma `@@map` values.

### `board_meta`

| Column | Rule |
| --- | --- |
| `id` | Primary key. The only row is `default`, inserted by the migration. |
| `next_sequence` | Integer, not null, starts at 1. |
| `revision` | Integer, not null, starts at 0. |

Writes lock this row with `FOR UPDATE` before reading tasks and history.

### `board_tasks`

| Column | Rule |
| --- | --- |
| `id` | Primary key, UUID string. |
| `title` | Text, not null. |
| `column` | Text, not null. Mapper accepts only `todo`, `in_progress`, and `done`. |
| `sequence` | Integer, not null, unique. |

### `board_history_entries`

| Column | Rule |
| --- | --- |
| `position` | Integer primary key. |
| `type` | `TASK_CREATED` or `TASK_MOVED`. |
| `task_id` | Text, not null. |
| `from_column` | Text, null for a create. |
| `to_column` | Text, null for a create. |

A successful commit deletes the previous task and history rows and inserts the snapshot from the aggregate, then updates `next_sequence` and `revision`. A refusal, a no-change, or a rolled-back transaction leaves the three tables as they were.

Unknown column text or an unknown history type on read is a storage failure, not a board the person can use.

## Cache envelope

Not a domain type and not an HTTP body.

| Field | Rule |
| --- | --- |
| Key | `board:state` |
| `revision` | Must equal `board_meta.revision` or the envelope is ignored. |
| `board` | The HTTP board document. |
| TTL | `CACHE_TTL_SECONDS`, default 60. |

Redis is not the only copy. Clearing the key does not delete rows.

## State transitions

```text
[no rows yet]
  migration → meta(default, next_sequence=1, revision=0), no tasks, no history

empty board
  create(title) success → task in todo, one TASK_CREATED step, next_sequence + 1, revision + 1
  create blank title → validation_error, no write
  undo → nothing_to_undo, no write

task on the board
  move to another column under the limit → column changes, one TASK_MOVED step, revision + 1
  move to the same column → already_in_column, no write
  move unknown id → task_not_found, no write
  move to a non-column → invalid_column, no write
  move into in_progress at the limit → wip_limit_reached, no write

newest step is TASK_CREATED
  undo → that task row is gone, step is gone, next_sequence unchanged, revision + 1

newest step is TASK_MOVED
  undo → task column returns to fromColumn, step is gone, revision + 1
  undo does not re-check the work-in-progress limit
```

PostgreSQL unavailable on read or on commit stops the transition and returns `BOARD_UNAVAILABLE`. The previous committed revision stays the saved board.

## Validation

- Create HTTP body is `{ "title": string }`. It fails when `title` is missing, not a string, or `trim().length === 0`. The stored title is not trimmed.
- Move HTTP body is still `{ "destination": string }`. A string that is not one of the three column ids is `invalid_column` from the domain, not a schema failure. A missing destination is `validation_error`.
- The screen must not send `id` on create and must not render `id`, including the card heading, the destination label, and the accessible name.
