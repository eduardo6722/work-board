# Contract: Board HTTP API

Base path: `/api/v1`, already applied by the Nest global prefix. Schemas live in `packages/contracts/src/board/` and are exported from `packages/contracts/src/index.ts`. The domain does not import this package.

This contract replaces the create body, id ordering, and empty-on-restart behavior in `specs/001-kanban-undo-history/contracts/board-api.md`. Move, undo, column ids, and the other result codes stay.

JSON field names are camel case as below. Column identifiers stay the exact strings `todo`, `in_progress`, and `done`.

## Shared: board

```json
{
  "columns": {
    "todo": [
      { "id": "0b1d6c2e-7a0a-4f0e-9c1a-6d5e4f3a2b10", "title": "Prepare the report", "column": "todo" }
    ],
    "in_progress": [],
    "done": []
  },
  "wipLimit": 2,
  "canUndo": true
}
```

Rules:

- Each task appears in the array of its `column` and in no other array.
- `id` is the server-assigned identity. Clients use it only to call the move route. They do not display it.
- Each array is ordered by creation, oldest first. Clients do not sort again.
- `title` is the text the person entered, including surrounding spaces when the trimmed title is non-empty.
- Two tasks may share a `title`. Their `id` values differ.
- `wipLimit` is a positive integer from process configuration, not from the saved row.
- `canUndo` is true when at least one successful create or move has not been undone.
- The document does not include sequence, revision, or undo steps.

## Shared: action result

Discriminated by `status`.

| `status` | Allowed `code` |
| --- | --- |
| `success` | `task_created`, `task_moved`, `undo_success` |
| `no_change` | `already_in_column`, `nothing_to_undo` |
| `error` | `validation_error`, `task_not_found`, `invalid_column`, `wip_limit_reached` |

`duplicate_task_id` remains a legal member of the schema union so older fixtures still parse. Create does not return it. Clients must not require a person to fix a duplicate id.

`message` is a short human-readable string. Clients must branch on `code`, not on `message`.

## Shared: mutation response

Returned by create, move, and undo when the saved board was read and the action completed as a domain result, including refusals and no-change.

```json
{
  "result": { "status": "success", "code": "task_created", "message": "Task created." },
  "board": {}
}
```

`board` is the shared board document after the action. On refusal or no-change it equals the saved board from before the action.

## Storage unavailable

Used when the saved board cannot be read or a change cannot be committed. Not used when Redis alone is unavailable.

- HTTP `503`
- Body is the shared API error, not the mutation envelope:

```json
{
  "statusCode": 503,
  "error": "SERVICE_UNAVAILABLE",
  "code": "BOARD_UNAVAILABLE",
  "message": "The board could not be saved."
}
```

A read failure uses the same status and code. `message` says the board could not be loaded. Clients do not treat this body as a new board.

## GET `/api/v1/board`

- Request body: none.
- Success: `200` and the board document.
- The handler may return a cached document only when its revision equals the saved revision.
- If the cache is empty, stale, or unreadable, the handler loads the saved board. A cache failure is not `BOARD_UNAVAILABLE`.
- If the saved board cannot be read: `503` and `BOARD_UNAVAILABLE`.
- This route does not use the mutation envelope.

## POST `/api/v1/tasks`

Request:

```json
{ "title": "Prepare the report" }
```

| Condition | HTTP | Body |
| --- | --- | --- |
| Created in `todo` | 201 | `result.code` `task_created`, and the new task only in `todo` |
| Title missing, not a string, or only spaces | 400 | `result.code` `validation_error` and the unchanged board |
| Saved board cannot be read or the create cannot be committed | 503 | `BOARD_UNAVAILABLE` |

The request has no `id` and no column. An extra `id` property is ignored by the schema and is not stored. The response task `id` is a new UUID. Creating the same title again returns another `201` and another id.

Schema rule: `title` fails validation when `trim().length === 0`. The schema does not trim the stored value.

## POST `/api/v1/tasks/:id/move`

Request:

```json
{ "destination": "in_progress" }
```

`:id` is the task id from the board document.

| Condition | HTTP | `result.code` |
| --- | --- | --- |
| Moved to a different column | 200 | `task_moved` |
| Destination is the current column | 200 | `already_in_column` |
| No task has that id | 404 | `task_not_found` |
| Destination is not one of the three column ids | 400 | `invalid_column` |
| Destination is `in_progress` and that column is already at `wipLimit` | 409 | `wip_limit_reached` |
| `destination` missing or not a string | 400 | `validation_error` |
| Saved board cannot be read or the move cannot be committed | 503 | API error `BOARD_UNAVAILABLE` |

A move into a column that is not adjacent is allowed. A move out of a full In Progress column is allowed. The task is placed by creation sequence, not by a drop index. The request has no index field.

## POST `/api/v1/board/undo`

- Request body: none.
- Newest successful create: `200`, `undo_success`, that task is absent, later creates may reuse the title and must receive a new id.
- Newest successful move: `200`, `undo_success`, the task is back in the column it left. This is allowed even when In Progress is full.
- Nothing to undo: `200`, `nothing_to_undo`, board unchanged.
- Saved board cannot be read or the undo cannot be committed: `503`, `BOARD_UNAVAILABLE`.

Undo does not add a step. Repeating undo until the stack is empty, then once more, still returns `nothing_to_undo`.

## Persistence across processes

Two API processes that use the same database share one saved board. A response is success only after the commit. The following read, including a read served from the cache, matches that committed board. Restarting an API process does not clear tasks or undo history. Restarting or flushing Redis does not clear them either.
