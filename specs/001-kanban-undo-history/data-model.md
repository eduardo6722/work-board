# Data Model: Kanban Board with Undo History

Domain types live in `apps/api/src/modules/board/domain/`. HTTP types are inferred from `@repo/contracts` and are not imported by the domain. Field names match on purpose so the HTTP mapper is a direct projection.

## Column

Fixed set. No other value is a column.

| Identifier | Label |
| --- | --- |
| `todo` | To Do |
| `in_progress` | In Progress |
| `done` | Done |

## Task

| Field | Required | Rule |
| --- | --- | --- |
| `id` | yes | Exact non-empty string. Unique on the board. Never changed. `trim().length > 0`. Surrounding spaces are kept. |
| `title` | yes | Same non-empty rule as `id`. Never changed. |
| `column` | yes | One of the three identifiers. Set to `todo` on create. Changed only by a successful move or by undo of a move. |

A task is not deleted except by undoing its create. After that undo, the id may be created again.

Relationships: a task belongs to one board and one column. The column does not store a separate list as the source of truth. The board stores tasks and derives the three lists.

## Board

One instance per process.

| Field | Rule |
| --- | --- |
| `wipLimit` | Positive integer captured in the constructor. Default 2 from `BOARD_WIP_LIMIT`. Not changed by any action. |
| tasks | Map or equivalent keyed by exact `id`. |
| history | Stack of undo steps. Empty at start. |

Derived view (`getState()`), which is also the HTTP board document:

| Field | Rule |
| --- | --- |
| `columns.todo` | Tasks in that column, sorted by id. |
| `columns.in_progress` | Same. |
| `columns.done` | Same. |
| `wipLimit` | The constructor value. |
| `canUndo` | `history.length > 0`. |

Utilization is `columns.in_progress.length`. It is not a second stored field. The UI prints that length and `wipLimit` together.

### ID sort

Compare ids with UTF-16 code-unit order. Build each column list by sorting with that order on every `getState()` call. Do not store display order.

Examples: `["C", "A", "B"]` is shown as `A`, `B`, `C`. `10` is before `2`. `A` is before `a`.

## Undo step

Internal. Not part of the HTTP board document.

| Variant | Fields | Inverse |
| --- | --- | --- |
| `TASK_CREATED` | `taskId` | Remove that task. |
| `TASK_MOVED` | `taskId`, `from`, `to` | Set that task's column to `from`. |

Only a successful create or a successful move to a different column pushes one step. Undo pops one step after the inverse is applied. Undo pushes nothing.

Because undo is last-in-first-out, the inverse always restores a board that already satisfied the limit and unique ids. Undo does not re-check the limit and does not fail when In Progress is full.

## Action result

Returned by create, move, and undo. Not stored.

| Status | Code | When |
| --- | --- | --- |
| `success` | `task_created` | Task added in `todo`, one step pushed. |
| `success` | `task_moved` | Column changed, one step pushed. |
| `success` | `undo_success` | One step reversed and popped. |
| `no_change` | `already_in_column` | Destination equals the current column. |
| `no_change` | `nothing_to_undo` | History is empty. |
| `error` | `validation_error` | Id or title has no visible characters. Also the HTTP mapping when the shared schema rejects a body. |
| `error` | `duplicate_task_id` | Id already present. |
| `error` | `task_not_found` | Move id is absent. |
| `error` | `invalid_column` | Destination is not one of the three identifiers. |
| `error` | `wip_limit_reached` | Destination is `in_progress` and that column's length is already `wipLimit`. |

Every error and every no-change leaves tasks and history as they were. Checks finish before any write.

## State transitions

```text
create(id, title)
  invalid id or title -> validation_error
  id exists           -> duplicate_task_id
  else                -> task in todo, push TASK_CREATED, task_created

move(id, destination)
  id missing          -> task_not_found
  destination unknown -> invalid_column
  destination = current -> already_in_column
  destination = in_progress AND count >= wipLimit -> wip_limit_reached
  else                -> column = destination, push TASK_MOVED, task_moved

undo()
  history empty       -> nothing_to_undo
  top is TASK_CREATED -> remove task, pop, undo_success
  top is TASK_MOVED   -> column = from, pop, undo_success
```

Moves from `in_progress` to either other column are allowed at any count. A create never places a task in `in_progress`. A move may jump from `todo` to `done`.

## HTTP documents

Defined in `contracts/board-api.md`. They mirror the derived board and the action result. They do not include the history stack, timestamps, priority, assignee, or due date.

## Process lifecycle

| Moment | Board |
| --- | --- |
| Process start | Empty tasks, empty history, limit from env. |
| Later requests in that process | Same instance. |
| Process stop | State discarded. |
| Next start | Empty again. |
