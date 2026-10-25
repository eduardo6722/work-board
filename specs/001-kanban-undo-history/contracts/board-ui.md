# Contract: Board screen

The home page shows this screen. Copy and layout stay simple. Column labels and the behavior below are required. Exact message sentences may vary. Outcome handling follows `result.code` from `contracts/board-api.md`.

## Regions

- A board title, for example "Kanban Board".
- A create control that opens a dialog.
- An undo button.
- One feedback region for the latest action.
- Three columns, always present, in this order: To Do, In Progress, Done.

## Column

- Heading uses the English display label.
- The In Progress heading includes the current count and the limit, for example `In Progress — 2/2`.
- When the count equals the limit, the column looks full and stays visible and droppable.
- A column with no tasks shows an empty message, for example "No tasks".
- Tasks render in the order received. The client does not sort again and does not reorder on drop.

## Task card

- Shows `id` and `title`.
- Does not offer edit, delete, priority, assignee, or due date.
- Can be dragged with `@dnd-kit/core`.
- Offers a non-drag destination choice for the three columns and a way to submit that choice.

## Create dialog

- React Hook Form and `zodResolver` with the shared create schema.
- Fields: id and title. Inline messages for schema failures.
- Success: close or reset the dialog, show the success message, show the new card only in To Do.
- Refusal (`duplicate_task_id` or `validation_error` from the server): keep the entered values, show the error, do not add a card.

## Undo

- Visible undo button.
- Disabled when `canUndo` is false or the board has not loaded.
- Enabled when `canUndo` is true.
- After the response, the board and the feedback region follow the body.

## Waiting and failure to load

- Before the first successful board response, show a waiting state rather than three empty columns.
- If the board request fails and there is no board to show, show an error state with a way to retry.
- A refused move or create is not this error state. It is feedback on the loaded board.

## Interaction rules

- Drag end on a column calls the move endpoint with that column id. Drag end outside a column does nothing.
- The non-drag control calls the same move endpoint.
- The card stays in its current column until the response arrives. The next render uses `response.board`.
- A `wip_limit_reached` response shows an error and the unchanged board.
- Same-column drop or choice shows the no-change message and does not enable a new undo step.
- Feedback is associated with the action so a screen reader can hear success and errors.

## Query cache

- Query key factory: `boardKeys.state()` → `["board"]`.
- `useBoard` loads `GET /api/v1/board`.
- Create, move, and undo write `response.board` into that cache with `setQueryData`.
- They do not also invalidate the key.
