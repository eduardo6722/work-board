# Feature Specification: Saved Board with Title-Only Tasks

**Feature Branch**: `002-persist-board-auto-ids`

**Created**: 2026-10-25

**Status**: Draft

**Input**: User description: "lets add database and chase layers and auto ID generation on backend. remove id field from UI"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Work is still there after a restart (Priority: P1)

A person uses the board, stops the application, and starts it again. The same tasks are in the same columns, with the same titles, and undo can still reverse the latest successful change. The first time the board is used, before anything has been saved, it is empty and undo is unavailable.

**Why this priority**: The board is only trustworthy as a place to keep work if stopping the application does not throw that work away.

**Independent Test**: Create two tasks, move one to In Progress, stop the application, start it again, and confirm both tasks are in the same columns and that one undo reverses that move.

**Acceptance Scenarios**:

1. **Given** nothing has been saved yet, **When** a person opens the board, **Then** To Do, In Progress, and Done are empty, In Progress shows 0/2, and undo is unavailable.
2. **Given** tasks exist and at least one successful change can be undone, **When** the application is stopped and started again, **Then** each task is in the same column with the same title, and undo is still available.
3. **Given** the board was restored after a restart, **When** the person undoes once, **Then** the latest successful change from before the restart is reversed and that result is kept for the next visit.
4. **Given** a change cannot be saved, **When** the person attempts a create, move, or undo, **Then** they see an error, the previous saved board is unchanged, and a later successful visit does not show the unsaved change.

---

### User Story 2 - Add a task by title alone (Priority: P1)

A person adds a task by entering a title. They are not asked for an identifier. The task appears in To Do. The card is named by that title. A second task may use the same title and remains a separate task. An empty title is refused, the saved board stays unchanged, and the entered title remains so it can be corrected.

**Why this priority**: Choosing an identifier is extra work and is the only thing the new-task screen currently asks for besides the title. The system can tell tasks apart without that step.

**Independent Test**: Open the new-task screen and confirm the only input is the title. Add "Prepare the report", then add "Prepare the report" again. Both cards appear in To Do, both are titled "Prepare the report", and neither screen shows a task identifier.

**Acceptance Scenarios**:

1. **Given** the new-task screen, **When** a person looks at it, **Then** it asks for a title and has no identifier input, label, or placeholder.
2. **Given** an empty To Do column, **When** a person creates a task with the title `Prepare the report`, **Then** the outcome is success with code `task_created`, one card titled `Prepare the report` appears only in To Do, undo becomes available, and the new-task screen closes or clears.
3. **Given** a task titled `Prepare the report` already exists, **When** a person creates another task with the same title, **Then** both tasks remain, both show that title, and the create is not refused for a duplicate identifier.
4. **Given** the new-task screen, **When** the title is missing or has no visible characters, **Then** the outcome is an error with code `validation_error`, nothing is saved, and the entered title stays on the screen with an explanation.
5. **Given** a task was created and then removed by undo, **When** a person creates a task again, **Then** the new task is kept as its own task even if the title matches the removed one.
6. **Given** any board a person can see, **When** they read a card or its move control, **Then** the task is named by its title and no task identifier is shown.

---

### User Story 3 - Column order follows when work was added (Priority: P1)

Within a column, tasks appear in the order they were created, oldest first. Dragging a card or choosing a destination does not place it where it was dropped. Moving a task puts it among the destination column's tasks by creation order. The work-in-progress limit, refused moves, and undo behave as they do today, with tasks recognized from their cards rather than from typed identifiers.

**Why this priority**: People previously predicted column order from identifiers they chose. After those identifiers leave the screen, creation order is the order they can see and check.

**Independent Test**: Create titles `C`, then `A`, then `B`. Confirm To Do shows `C`, `A`, `B`. Move the middle card to Done and confirm Done shows `A` and To Do shows `C` then `B`.

**Acceptance Scenarios**:

1. **Given** three tasks are created in the order `C`, `A`, then `B`, **When** the person views To Do, **Then** the cards appear as `C`, then `A`, then `B`.
2. **Given** those three tasks are in To Do, **When** the person drags `A` onto Done at any drop position, **Then** Done contains only `A` and To Do shows `C` then `B`.
3. **Given** the work-in-progress limit is 2 and two tasks are already in In Progress, **When** the person moves a third task into In Progress, **Then** the outcome is `wip_limit_reached`, that task stays in its column, and undo availability is unchanged.
4. **Given** the latest successful change was a move, **When** the person undoes, **Then** the task returns to the column it left and the columns are still in creation order.
5. **Given** the person uses the non-drag destination control, **When** the move is accepted or refused, **Then** the result matches a drag to that same column.

---

### User Story 4 - A repeat visit matches the saved board (Priority: P2)

A person who leaves and comes back, without relying on a restart, sees the saved board. After a successful create, move, or undo, the next view shows that result rather than an older copy. If the short-lived copy used for repeat views is unavailable, the person can still open the board and change it, and the saved result is what they see next. Losing only that short-lived copy does not remove tasks or undo history.

**Why this priority**: A fast repeat view is useful only when it agrees with the saved board. Saving work remains the source of truth when the fast copy cannot be used.

**Independent Test**: Create a task, leave the board, and open it again. The task is there. Then make the short-lived copy unavailable, create another task, and open the board again. Both tasks are there.

**Acceptance Scenarios**:

1. **Given** a saved board has not changed, **When** a person opens it again, **Then** the columns, titles, order, work-in-progress display, and undo availability match that saved board.
2. **Given** a person just completed a successful create, move, or undo, **When** they open the board again, **Then** they see the saved result and not the board from before that change.
3. **Given** the short-lived copy used for repeat views is unavailable, **When** a person opens the board, **Then** they see the saved board, including a waiting state while it loads and an error state if the saved board itself cannot be read.
4. **Given** the short-lived copy is unavailable, **When** a person successfully creates a task, **Then** the task is on the board at the next visit.
5. **Given** tasks and undo history have been saved, **When** only the short-lived copy is cleared, **Then** the tasks, columns, and undo availability are unchanged at the next visit.

---

### Edge Cases

- A create, move, or undo is saved completely or not at all. A refusal or a failure leaves tasks and undo history as they were before the attempt.
- The first visit, with nothing saved, is an empty board. An empty board that was saved on purpose stays empty after a restart.
- Stopping the application does not discard tasks or undo history. Clearing only the short-lived copy does not discard them either.
- If the saved board cannot be read, the person sees an error state rather than an empty board or a stale copy.
- If a change cannot be saved, the person sees an error and is not told that the change succeeded.
- Titles may match. Each card still moves and undoes on its own. The move control belongs to that card.
- A title of only spaces is rejected. A title with visible characters keeps its leading and trailing spaces.
- Undoing a create removes that task. A later create is a new task, even when the title is the same. The removed task's identity is not given out again.
- Creation order is fixed when the task is created. Moving the task does not make it newer or older. Drop position does not change column order.
- The work-in-progress limit stays a preset, defaulting to 2. If a later run uses a lower limit while In Progress already holds more tasks than that limit, those tasks stay visible and further moves into In Progress are refused until the count is under the limit.
- Two people are not offered a live shared editing session. The last change that was fully saved is what the next view shows.
- Column names stay To Do, In Progress, and Done. Removing the task identifier does not remove those columns or their labels.
- Same-column moves, unknown destinations, moves of tasks that are no longer on the board, and undo when nothing remains follow the existing board rules and codes: `already_in_column`, `invalid_column`, `task_not_found`, and `nothing_to_undo`.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Tasks and undo history MUST remain saved across stopping and starting the application. The first use, when nothing has been saved, MUST be an empty board with the three columns, the preset work-in-progress limit, and undo unavailable.
- **FR-002**: A successful create, move, or undo MUST be saved before the person is told it succeeded. If saving fails, the person MUST see an error and the last saved tasks and undo history MUST stay unchanged.
- **FR-003**: A person MUST be able to create a task by entering a title only. The system MUST assign an identity the person does not provide. The new task MUST start in To Do. A successful create MUST add exactly one undo step and MUST report success code `task_created`.
- **FR-004**: The new-task screen MUST ask for a title and MUST NOT include an identifier input, label, or placeholder. After a successful create, the screen MUST close or clear. After a refused create, the entered title MUST remain.
- **FR-005**: Every card and its move control MUST name the task by its title. A person viewing the board MUST NOT see a task identifier.
- **FR-006**: A create MUST be refused with code `validation_error` when the title is missing or has no visible characters. A refused create MUST NOT change tasks or undo history. A create MUST NOT be refused because another task already has the same title.
- **FR-007**: Each task MUST keep a single identity for as long as it is on the board. That identity MUST NOT change when the task moves. An identity removed by undoing a create MUST NOT be assigned to a later task.
- **FR-008**: Tasks in a column MUST appear in creation order, oldest first. Creation order and drop position MUST NOT be replaced by identifier text order.
- **FR-009**: Move, work-in-progress, undo, waiting, error, and empty-column behavior from the Kanban board specification MUST remain in force, except where this specification replaces a person-supplied identifier, identifier display, identifier sort order, the duplicate-identifier create error, or clearing the board on restart.
- **FR-010**: A repeat view of an unchanged saved board MUST show the same columns, titles, order, work-in-progress display, and undo availability. After a successful change, the next view MUST show the saved board rather than an older copy.
- **FR-011**: If the short-lived copy used for repeat views is unavailable or has been cleared, opening and changing the board MUST still use the saved board. The next view MUST show the saved result. Clearing that copy MUST NOT remove tasks or undo history.
- **FR-012**: If the saved board cannot be read, the person MUST see an error state rather than an empty board or an older copy.
- **FR-013**: Text a person can read MUST remain English. The new-task screen MUST NOT label any input as an identifier.

### Key Entities

- **Saved board**: The single workspace that remains after the application stops. It holds the tasks and the undo history. The work-in-progress limit stays a preset and is not edited by the person.
- **Task**: A unit of work with a system-assigned identity, a title, one column, and a creation order. The person supplies and sees the title. The identity is not entered and not shown.
- **Undo step**: One recorded successful create or successful move, kept with the saved board and removed newest first.
- **Short-lived copy**: A temporary copy of the saved board used so a repeat view can be shown quickly. It must match the saved board after a successful change and must not be the only place tasks exist.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: After a person creates two tasks, moves one, and starts the application again, both tasks are in the same columns with the same titles, and one undo reverses that move.
- **SC-002**: A person can add a valid task by entering only a title and see that card in To Do in under 30 seconds, with no identifier to type or read.
- **SC-003**: On the new-task screen, the number of identifier inputs is zero, and 100% of successful creates leave only the title as something the person entered.
- **SC-004**: Creating the same title twice keeps two separate cards, and each card can be moved without moving the other.
- **SC-005**: Tasks created as `C`, then `A`, then `B` appear in To Do in that same order. After `A` is moved to Done, To Do shows `C` then `B`.
- **SC-006**: In 100% of successful creates, moves, and undoes, a following visit shows the saved result rather than the board from before that change.
- **SC-007**: When the short-lived copy cannot be used, a person can still open the saved board and add a task, and that task is present on the next visit.
- **SC-008**: When a change cannot be saved, 100% of those attempts show an error, and a later visit does not include the unsaved change.
- **SC-009**: A saved board of 100 tasks, with undo history for their successful changes, reappears complete after a restart, with no missing task and no task in the wrong column.
- **SC-010**: A repeat view of an unchanged saved board shows the same tasks, order, and undo availability in under 1 second for a board of 100 tasks.

## Assumptions

- "Database" in the request means the saved board that survives a restart. "Cache" means one short-lived copy used for repeat views. The request does not add a second copy layer. Storage products and structure are planning concerns.
- This feature updates the Kanban board. Where it conflicts with that specification, this specification wins. Columns, the default limit of 2, drag and non-drag moves, undo codes, English copy, and the rule that refused actions change nothing all remain.
- The earlier rules that a person types a task identifier, that a duplicate identifier is refused with `duplicate_task_id`, that cards show that identifier, that columns sort by identifier text, and that a restart clears the board are replaced by this specification.
- There is one shared board. There are no accounts, sign-in, or separate boards. Live collaboration is out of scope. The last fully saved change is the one the next view shows.
- Undo history is saved with the tasks. A restart continues the same undo sequence rather than starting over with a full board and an empty history.
- The work-in-progress limit remains a preset chosen before use. The default is 2. The person still has no control to edit it.
- The system chooses each task identity. The format is not visible and is not a behavior rule, as long as each current task has one stable identity and a removed identity is not reused.
- Identical titles are allowed. Cards stay distinguishable as separate tasks because each move control acts on its own card.
- A waiting state, an error state, and a per-column empty state stay part of the board a person sees.
- No redo, title editing, manual reordering, or deletion other than undoing a create is added.
