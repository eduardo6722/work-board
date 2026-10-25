# Feature Specification: Kanban Board with Undo History

**Feature Branch**: `001-kanban-undo-history`

**Created**: 2026-10-25

**Status**: Draft

**Input**: User description: "Case 01 — a small Kanban board with exactly three columns (To Do, In Progress, Done), task creation, movement with a work-in-progress limit, and last-in-first-out undo of successful creates and moves. The original Case 01 rules are the acceptance criteria. The board is a mini task board, not a project-management platform."

## Clarifications

### Session 2026-10-25

- Q: Which language and column vocabulary must the whole project use? → A: English only. Column identifiers are `todo`, `in_progress`, and `done`, displayed as To Do, In Progress, and Done. Empty undo uses `nothing_to_undo`.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - See the work board (Priority: P1)

A person opens the board and sees one shared workspace with three fixed columns: To Do, In Progress, and Done. Each column lists its tasks. In Progress shows how many tasks it holds and how many it allows. The person can tell whether undo is available. Columns with no tasks show that they are empty. While the board is still being retrieved, the person sees a waiting state. If the board cannot be retrieved, the person sees an error state instead of a misleading empty board.

**Why this priority**: Nothing else on the board is trustworthy until the person can see the confirmed columns, tasks, capacity, and undo availability.

**Independent Test**: Open the board before any tasks exist and confirm the three columns, a work-in-progress display of 0 out of the limit, undo unavailable, and an empty state in each column.

**Acceptance Scenarios**:

1. **Given** a newly started board with the default limit, **When** a person views it, **Then** the columns To Do (`todo`), In Progress (`in_progress`), and Done (`done`) are all visible, each has no tasks, In Progress shows 0/2, and undo is unavailable.
2. **Given** tasks exist in more than one column, **When** a person views the board, **Then** each task appears in exactly one column with its ID and title, and tasks inside each column are ordered by ascending ID.
3. **Given** the board is still loading, **When** a person views it, **Then** a waiting state is shown rather than three empty columns that look final.
4. **Given** the board cannot be loaded, **When** a person views it, **Then** an error state is shown rather than an empty board.

---

### User Story 2 - Create a task (Priority: P1)

A person adds a task by entering an ID and a title. The task always appears in To Do. The ID and title stay as entered for the life of the task. A successful create can be undone later. An invalid or duplicate create leaves the board and the undo history unchanged, keeps the entered values available for correction, and explains what was wrong.

**Why this priority**: Creating work is the first change a person can make, and every later rule depends on unique tasks that start in To Do.

**Independent Test**: Create three tasks with IDs A, B, and C and confirm all three appear only in To Do, sorted by ID, with undo available. Then repeat an ID and confirm the board does not gain a fourth task.

**Acceptance Scenarios**:

1. **Given** an empty board, **When** a person creates a task with ID `A` and title `Prepare the report`, **Then** the outcome is success with code `task_created`, the task appears only in To Do, and undo becomes available.
2. **Given** task `A` already exists, **When** a person creates another task with ID `A`, **Then** the outcome is an error with code `duplicate_task_id`, the existing task is unchanged, and no new undo step is added.
3. **Given** the create form, **When** the ID or the title is missing or has no visible characters, **Then** the outcome is an error with code `validation_error`, nothing is added to the board, and the form explains which value is invalid.
4. **Given** a rejected create, **When** the person looks at the form, **Then** the relevant entered values are still there and no card is shown for a task that was not created.
5. **Given** a successful create, **When** the board refreshes, **Then** the form is closed or cleared and the new card is visible in To Do in ID order.

---

### User Story 3 - Move a task and respect the work-in-progress limit (Priority: P1)

A person moves a task into any of the three columns by dragging its card or by choosing the destination without dragging. Both paths ask for the same confirmed result. A move into the task's current column changes nothing and does not become an undo step. A move of an unknown task, or a destination that is not one of the three columns, is refused. In Progress accepts incoming tasks only while it is below its limit. Moving a task out of In Progress is allowed even when that column is full. A refused move leaves every task where it was and does not add an undo step. After an accepted move, the card appears in the destination column in ID order, not in the position where it was dropped.

**Why this priority**: Moving work, and stopping In Progress from going over capacity, is the core of the board.

**Independent Test**: With the limit at 2, move two tasks into In Progress, then attempt a third. The third stays in its original column, the display reads 2/2, and undo still points at the second successful move.

**Acceptance Scenarios**:

1. **Given** task `A` is in To Do, **When** a person moves it to In Progress, **Then** the outcome is success with code `task_moved`, `A` appears only in In Progress, and one undo step is added.
2. **Given** task `A` is in To Do, **When** a person moves it directly to Done, **Then** the move succeeds without requiring a stop in In Progress.
3. **Given** task `A` is already in In Progress, **When** a person moves it to In Progress again, **Then** the outcome is no change with code `already_in_column`, the board is unchanged, and no undo step is added.
4. **Given** no task has ID `Z`, **When** a person tries to move `Z`, **Then** the outcome is an error with code `task_not_found` and the board and undo history stay unchanged.
5. **Given** a destination that is not `todo`, `in_progress`, or `done`, **When** a person tries to move a task there, **Then** the outcome is an error with code `invalid_column` and the board and undo history stay unchanged.
6. **Given** the limit is 2 and In Progress already contains two tasks, **When** a person moves another task into In Progress, **Then** the outcome is an error with code `wip_limit_reached`, that task stays where it was, the column remains visible and shows 2/2, and no undo step is added.
7. **Given** In Progress is full, **When** a person moves one of its tasks to To Do or Done, **Then** the move succeeds and the displayed count decreases by one.
8. **Given** a person drags a card to a column that refuses the move, **When** the refusal is shown, **Then** the card is still in its original column and an error is visible.
9. **Given** a person uses the non-drag destination control, **When** the move is accepted or refused, **Then** the result matches the same rules as a drag to that column.

---

### User Story 4 - Undo the last successful change (Priority: P1)

A person undoes the latest successful create or move. Undo of a create removes that task. Undo of a move puts that task back in the column it left. Undo itself is not recorded as a new step. The person can undo repeatedly until nothing remains to undo. When nothing remains, the outcome uses the exact code `nothing_to_undo` and the board stays as it is. The undo control is visible and is disabled when undo is unavailable. Each undo leaves the board still obeying unique IDs, the three columns, ID order, and the work-in-progress limit.

**Why this priority**: Undo is the safety net for the only two changes this board allows, and the empty-history result is an explicit acceptance rule.

**Independent Test**: Create a task, move it, then undo twice. The first undo restores the original column. The second removes the task. A third undo returns `nothing_to_undo`.

**Acceptance Scenarios**:

1. **Given** a task was just created, **When** the person undoes, **Then** the outcome is success with code `undo_success`, that task disappears, and its ID may be created again.
2. **Given** a task was just moved from To Do to Done, **When** the person undoes, **Then** the task is back in To Do only and the undo step for that move is gone.
3. **Given** several successful creates and moves, **When** the person undoes once, **Then** only the latest successful change is reversed.
4. **Given** the latest attempt was a refused move or a same-column move, **When** the person undoes, **Then** that attempt is skipped because it was never recorded, and the previous successful change is reversed instead.
5. **Given** there is nothing to undo, **When** the person undoes, **Then** the outcome is no change with code `nothing_to_undo`, and tasks and history stay as they were.
6. **Given** there is nothing to undo, **When** the person views the board, **Then** the undo control is disabled.
7. **Given** a sequence of successful changes that respected the limit, **When** the person undoes them one by one, **Then** every intermediate board still respects the limit, because each undo returns to the board as it was before that change.

---

### User Story 5 - Official acceptance sequence (Priority: P1)

A reviewer can reproduce the original challenge sequence on a board whose limit is 2 and confirm the board, the refusals, the no-change, and the undo results below.

**Why this priority**: This sequence is the challenge's definition of a correct board. It ties creation, the limit, failed moves, no-change moves, undo, and ID order into one check.

**Independent Test**: Run the seven actions below from a board that already contains only tasks A, B, and C in To Do, and compare the board after each action with the expected result.

**Acceptance Scenarios**:

1. **Given** the limit is 2 and tasks `A`, `B`, and `C` have been created, in that order, with any titles, **When** the board is viewed, **Then** all three are in To Do in order `A`, `B`, `C`, In Progress and Done are empty, the display is 0/2, and undo is available because the creates succeeded.
2. **Given** that starting board, **When** `A` is moved to `in_progress`, **Then** the outcome is `task_moved`, `A` is the only task in In Progress, and `B` and `C` remain in To Do.
3. **Given** the result of the previous step, **When** `B` is moved to `in_progress`, **Then** the outcome is `task_moved`, In Progress shows `A` then `B` and reads 2/2, and `C` remains in To Do.
4. **Given** In Progress is full, **When** `C` is moved to `in_progress`, **Then** the outcome is `wip_limit_reached`, `C` remains in To Do, In Progress is still `A` then `B`, and the undo history does not include this attempt.
5. **Given** the refused move of `C`, **When** the person undoes, **Then** the outcome is `undo_success`, `B` returns to To Do, In Progress contains only `A` and reads 1/2, and `C` stays in To Do. The refused move was not what was undone.
6. **Given** that board, **When** `C` is moved to `done`, **Then** the outcome is `task_moved`, `C` is the only task in Done, `A` stays in In Progress, and `B` stays in To Do.
7. **Given** `C` is in Done, **When** `C` is moved to `done` again, **Then** the outcome is `already_in_column`, every column stays the same, and no undo step is added.
8. **Given** that no-change move, **When** the person undoes, **Then** the outcome is `undo_success` and `C` returns to To Do. The no-change move was not what was undone.
9. **Given** the sequence has finished, **When** the board is viewed, **Then** In Progress contains `A`, To Do contains `B` then `C`, Done is empty, the display is 1/2, tasks are in ascending ID order, and undo is still available because earlier successful changes remain.

---

### Edge Cases

- Creating or moving never applies part of the change. If the action is refused or is a no-change, the task list and the undo history are identical to how they were before the action.
- The work-in-progress limit is checked only for moves into In Progress. Creates do not enter that column. Moves out of it are allowed at any count.
- Undo of a move back into In Progress is not refused for capacity. Later changes are undone first, so the restored board is a board that was already allowed.
- Same-column moves and empty undo are expected no-change results, not broken requests. Their codes are `already_in_column` and `nothing_to_undo`.
- An unknown task and an unknown column are errors. They do not create a task and do not add history.
- IDs are compared as exact text. `A` and `a` are different IDs. Ordering is ordinary ascending text order, so `A` comes before `B`, and `10` comes before `2`.
- Drop position and creation order never reorder a column. After tasks are created as `C`, then `A`, then `B`, To Do shows `A`, `B`, `C`.
- Undoing the creation of a task that was later moved removes it only after those later moves have been undone, because undo always takes the newest successful step.
- Repeating undo after the history is empty keeps returning `nothing_to_undo` and does not change the board.
- The limit is a positive whole number fixed before use. The default is 2. A full column stays visible.
- Stopping and starting the application again begins with an empty board. Work from the previous run is gone.
- Two people are not offered a live shared editing session. Actions are applied one after another on the single running board.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The board MUST contain exactly three columns, labeled To Do, In Progress, and Done, with the exact identifiers `todo`, `in_progress`, and `done`.
- **FR-002**: A task MUST have a unique non-empty ID, a non-empty title, and exactly one column. The ID and the title MUST NOT change after creation. The task MUST NOT carry priority, due date, assignee, or comments.
- **FR-003**: A person MUST be able to create a task from an ID and a title. The new task MUST start in `todo`. A successful create MUST add exactly one undo step and MUST report success code `task_created`.
- **FR-004**: A create MUST be refused with code `validation_error` when the ID or the title is missing or has no visible characters. A create MUST be refused with code `duplicate_task_id` when the ID already exists. A refused create MUST NOT change tasks or undo history.
- **FR-005**: A person MUST be able to move an existing task to any of the three columns, including a column that is not adjacent, either by dragging the card or by choosing the destination without dragging.
- **FR-006**: A successful move to a different column MUST place the task only in that column, MUST add exactly one undo step, and MUST report success code `task_moved`.
- **FR-007**: A move to the task's current column MUST report no change with code `already_in_column` and MUST NOT add an undo step.
- **FR-008**: A move of an unknown task MUST report error code `task_not_found`. A destination outside the three identifiers MUST report error code `invalid_column`. Neither outcome MUST change tasks or undo history.
- **FR-009**: In Progress MUST have a fixed positive whole-number capacity, defaulting to 2 when no other limit is set before use. People MUST NOT change the limit while using the board. The column MUST show the current count and the limit together, for example 2/2, and MUST remain visible when it is full.
- **FR-010**: A move into `in_progress` MUST be refused with code `wip_limit_reached` when that column already contains as many tasks as its limit. Moves out of `in_progress` MUST be allowed. A refused move MUST NOT change tasks or undo history.
- **FR-011**: The confirmed board MUST list, for each column, that column's tasks in ascending ID text order. Creation order and drop position MUST NOT override that order.
- **FR-012**: The confirmed board MUST also show the work-in-progress limit, the current In Progress count, and whether undo is available. The screen a person sees after each action MUST match that confirmed board.
- **FR-013**: Every create, move, and undo MUST end in exactly one outcome: success, no change, or error. The outcome MUST include a stable code and a short human-readable message. Codes MUST be exactly `task_created`, `task_moved`, `task_not_found`, `duplicate_task_id`, `invalid_column`, `wip_limit_reached`, `already_in_column`, `undo_success`, `nothing_to_undo`, or `validation_error`.
- **FR-014**: Only a successful create or a successful move MUST add an undo step. Failed actions and no-change actions MUST NOT add a step. Undo MUST reverse exactly one step, newest first, and MUST NOT add a step for itself.
- **FR-015**: Undoing a create MUST remove that task. Undoing a move MUST restore the column the task left. After a create is undone, that ID MUST be available for a new task.
- **FR-016**: Undo MUST be repeatable until no steps remain. When no steps remain, undo MUST report no change with the exact code `nothing_to_undo` and MUST leave tasks and history unchanged.
- **FR-017**: Undo MUST leave the board consistent: unique IDs, valid columns, ascending ID order, and the work-in-progress limit. An undo MUST NOT be rejected because In Progress is currently full.
- **FR-018**: The undo control MUST be visible and MUST be disabled when no undo step remains. After an undo, the control MUST follow the updated availability.
- **FR-019**: A refused drag or menu move MUST leave the card in its original column and MUST show the error. An accepted move MUST show the card only in the confirmed column.
- **FR-020**: The board MUST keep its tasks and undo history across successive actions in the same running session, and MUST start empty, with the configured limit, when the application starts again.
- **FR-021**: The person MUST see a waiting state while the board is loading, an error state when it cannot be loaded, and an English empty state for a column that has no tasks, for example "No tasks".
- **FR-022**: After a successful create, the create form MUST close or clear and MUST show a success message. After a refused create, the relevant input MUST remain and MUST show the error, without displaying a card for the rejected task.
- **FR-023**: Text a person can read MUST be English, including labels, buttons, headings, notifications, empty states, and error messages. Portuguese wording MUST NOT appear.

### Key Entities

- **Board**: The single shared workspace for the running session. It holds the three columns, the fixed work-in-progress limit, the tasks, and the undo availability.
- **Column**: One of the three fixed stages, identified exactly by `todo`, `in_progress`, or `done`, and labeled To Do, In Progress, or Done.
- **Task**: A unit of work identified by a unique ID and a title. It belongs to exactly one column. New tasks belong to To Do. ID and title do not change.
- **Undo step**: One recorded successful create or successful move. Steps are removed newest first. Refusals and no-change actions are not steps. Undo does not create a step.
- **Action outcome**: The result of one create, move, or undo. It is success, no change, or error, plus one of the stable codes in FR-013 and a short message a person can read.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A person can open a new board and recognize all three columns, the 0/2 work-in-progress display, and a disabled undo control on first view.
- **SC-002**: A person can create a valid task and see it only in To Do in under 30 seconds, including the success message.
- **SC-003**: When In Progress is at its limit, 100% of further moves into that column are refused, the moved task stays in its original column, and undo availability is unchanged by the refusal.
- **SC-004**: Dragging a task and choosing the same destination without dragging produce the same confirmed column, the same outcome code, and the same undo availability.
- **SC-005**: After the official sequence in User Story 5, the board shows `A` in In Progress, `B` then `C` in To Do, no tasks in Done, a 1/2 display, and undo still available.
- **SC-006**: In that same official sequence, the refused move and the same-column move add zero undo steps, and each undo reverses only the latest successful move.
- **SC-007**: Asking to undo when nothing can be undone returns the exact code `nothing_to_undo` in 100% of attempts and leaves every task in place.
- **SC-008**: For any set of tasks in a column, a reader sees them in ascending ID text order. A column filled as `C`, then `A`, then `B` is shown as `A`, `B`, `C`.
- **SC-009**: Undoing every successful change on a board returns to an empty board that still respects the limit at every step, and one further undo returns `nothing_to_undo`.
- **SC-010**: A person can tell from the In Progress heading whether the column is full without trying a move, and a refused move still explains the refusal.

## Assumptions

- The product is one shared board for the running application. There are no accounts, sign-in, or separate boards.
- People use the board one action at a time. Live collaboration and keeping several running copies in agreement are out of scope.
- Work exists only while the application is running. Restarting clears the board. There is no saved history from a previous run.
- The work-in-progress limit is chosen before use and then left alone. The default is 2. The board does not offer a control to edit the limit.
- A value is empty when it has no characters or only spaces. Leading and trailing spaces on an otherwise visible ID or title are kept, so `A` and ` A` are different IDs if both contain visible characters besides the spaces. A spaces-only value is rejected.
- ID order is ordinary ascending text order, not numeric order and not the order of creation or dragging.
- Free-text outcome messages are short and clear. The stable codes above are the exact result names. Message wording may vary as long as the code and the board result match this specification.
- Empty undo uses status no change, not error, because nothing is wrong with the board. The required code remains `nothing_to_undo`.
- Same-column move uses status no change and code `already_in_column`.
- All user-facing copy, identifiers, result codes, tests, comments, and documentation are English. Column identifiers are exactly `todo`, `in_progress`, and `done`. Display labels are To Do, In Progress, and Done.
- The visible board title names this workspace clearly, for example "Kanban Board". The exact title wording is not a behavioral rule.
- There is no redo, no manual reordering, no editing, no deletion except by undoing a create, and no comments, labels, attachments, priorities, due dates, assignees, or notifications.
- A waiting state, an error state, and a per-column empty state are part of the board a person sees. How those states are built is left to planning.
- This specification records what people can do and what outcomes they can rely on. Storage technology, screen structure, and delivery notes such as a written walkthrough are planning and delivery concerns, not additional board behavior.
