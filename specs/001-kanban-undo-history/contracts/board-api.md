# Contract: Board HTTP API

Base path: `/api/v1`, already applied by the Nest global prefix. Schemas live in `packages/contracts/src/board/` and are exported from `packages/contracts/src/index.ts`. The domain does not import this package.

JSON field names are camel case as below. Column identifiers stay the exact strings `todo`, `in_progress`, and `done`.

## Shared: board

```json
{
  "columns": {
    "todo": [{ "id": "A", "title": "Prepare the report", "column": "todo" }],
    "in_progress": [],
    "done": []
  },
  "wipLimit": 2,
  "canUndo": true
}
```

Rules:

- Each task appears in the array of its `column` and in no other array.
- Each array is sorted by id using UTF-16 code-unit order.
- `wipLimit` is a positive integer.
- `canUndo` is true when at least one successful create or move has not been undone.

## Shared: action result

Discriminated by `status`.

| `status` | Allowed `code` |
| --- | --- |
| `success` | `task_created`, `task_moved`, `undo_success` |
| `no_change` | `already_in_column`, `nothing_to_undo` |
| `error` | `validation_error`, `duplicate_task_id`, `task_not_found`, `invalid_column`, `wip_limit_reached` |

`message` is a short human-readable string. Clients must branch on `code`, not on `message`.

## Shared: mutation response

Returned by every create, move, and undo, including refusals and no-change.

```json
{
  "result": { "status": "success", "code": "task_created", "message": "Task created." },
  "board": {}
}
```

`board` is the shared board document after the action. On refusal or no-change it equals the board from before the action.

## GET `/api/v1/board`

- Request body: none.
- Success: `200` and the board document.
- This route does not use the mutation envelope.

## POST `/api/v1/tasks`

Request:

```json
{ "id": "A", "title": "Prepare the report" }
```

| Condition | HTTP | `result.status` | `result.code` |
| --- | --- | --- | --- |
| Created in `todo` | 201 | `success` | `task_created` |
| Id or title missing, not a string, or only spaces | 400 | `error` | `validation_error` |
| Id already on the board | 409 | `error` | `duplicate_task_id` |

The request has no column field. Clients cannot choose the starting column.

Schema rules: `id` and `title` are strings that fail validation when `trim().length === 0`. The schema does not trim the stored value.

## POST `/api/v1/tasks/:id/move`

Request:

```json
{ "destination": "in_progress" }
```

`:id` is the task id, exact match, including spaces if the id was created with them.

| Condition | HTTP | `result.status` | `result.code` |
| --- | --- | --- | --- |
| Moved to a different valid column | 200 | `success` | `task_moved` |
| Destination equals the current column | 200 | `no_change` | `already_in_column` |
| No task with that id | 404 | `error` | `task_not_found` |
| Destination is not one of the three identifiers | 400 | `error` | `invalid_column` |
| Destination is `in_progress` and that column is at `wipLimit` | 409 | `error` | `wip_limit_reached` |
| Body is not an object, or `destination` is missing or not a string | 400 | `error` | `validation_error` |

`destination` is a string in the schema so an unknown value reaches the domain and returns `invalid_column`.

## POST `/api/v1/board/undo`

- Request body: none.
- History has a step: `200`, `success`, `undo_success`, and the restored board.
- History is empty: `200`, `no_change`, `nothing_to_undo`, and the same board. This is not an error status.

## Status mapping

| Code | HTTP |
| --- | --- |
| `task_created` | 201 |
| `task_moved` | 200 |
| `undo_success` | 200 |
| `already_in_column` | 200 |
| `nothing_to_undo` | 200 |
| `validation_error` | 400 |
| `invalid_column` | 400 |
| `task_not_found` | 404 |
| `duplicate_task_id` | 409 |
| `wip_limit_reached` | 409 |

Unexpected failures use the existing `apiErrorSchema` envelope and HTTP 500. Board business outcomes do not use that envelope.

## Client parsing

The board HTTP helper treats a body that matches the mutation schema as data for 200, 201, 400, 404, and 409. It throws only when the body does not match, or the status is something else. The web example client stays on `apiErrorSchema` and is not reused for these responses.

## Out of scope for this contract

No auth headers, no pagination, no task patch or delete, no limit update, no history listing, no websocket.
