# Contract: Board screen

The home page shows this screen. Copy and layout stay simple. Column labels and the behavior below are required. Exact message sentences may vary. Outcome handling follows `result.code` from [board-api.md](./board-api.md).

This screen replaces the id field, the id heading, and the duplicate-id refusal in `specs/001-kanban-undo-history/contracts/board-ui.md`.

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

- The visible name is `title` only. The card heading, the destination label, and the accessible name use the title.
- `id` is not rendered as text. It may be the drag source key and the move request path.
- Two cards may show the same title. Each card's move control acts on that card.
- Does not offer edit, delete, priority, assignee, or due date.
- Can be dragged with `@dnd-kit/core`.
- Offers a non-drag destination choice for the three columns and a way to submit that choice. The choice shows column labels, not raw identifiers, as the visible options.

## Create dialog

- React Hook Form and `zodResolver` with the shared create schema.
- One field: title. No id input, label, or placeholder.
- Inline message when the title is empty or only spaces.
- Success: close or reset the dialog, show the success message, show the new card only in To Do.
- Refusal (`validation_error`): keep the entered title, show the error, do not add a card.
- The same title as an existing card is success, not a refusal.

## Undo

- Visible undo button.
- Disabled when `canUndo` is false or the board has not loaded.
- Enabled when `canUndo` is true.
- After a mutation-envelope response, the board and the feedback region follow the body.

## Waiting and failure to load

- Before the first successful board response, show a waiting state rather than three empty columns.
- If the board request fails and there is no board to show, show an error state with a way to retry. This includes HTTP 503 `BOARD_UNAVAILABLE`.
- A refused move or create is not this error state. It is feedback on the loaded board.
- A create, move, or undo that fails outside the mutation envelope, including `BOARD_UNAVAILABLE` and a network failure, shows an error in the feedback region and leaves the cards where they were. It must not clear the board into an empty success state.

## Interaction rules

- Drag end on a column calls the move endpoint with that card's id and that column id. Drag end outside a column does nothing.
- The non-drag control calls the same move endpoint for its own card.
- The card stays in its current column until the response arrives. The next render uses `response.board` only for a parsed mutation envelope.
- A `wip_limit_reached` response shows an error and the unchanged board.
- Same-column drop or choice shows the no-change message and does not enable a new undo step.
- Feedback is associated with the action so a screen reader can hear success and errors.

## Query cache

- Query key factory: `boardKeys.state()` → `["board"]`.
- `useBoard` loads `GET /api/v1/board`.
- Create, move, and undo write `response.board` into that cache with `setQueryData` when the body is a mutation envelope.
- They do not also invalidate the key.
- A storage-unavailable response does not write the query cache.
