# Video script

Spoken outline for an 8–12 minute walkthrough. No slides. This file is the outline only. The video has not been recorded.

## 0:00 Project

Introduce Work Board as a small Kanban board: To Do, In Progress, and Done. One person creates a task, moves it, and undoes the last successful change. In Progress holds at most two tasks by default.

## 1:00 Full-stack focus

Show the browser on port 3000 and the API on port 3001. The home page is the board. The API exposes `GET /api/v1/board`, `POST /api/v1/tasks`, `POST /api/v1/tasks/:id/move`, and `POST /api/v1/board/undo`. PostgreSQL stores the board. Redis answers a repeat view only when the cached revision still matches.

## 2:30 Architecture

Walk the path from the Next.js screen, through TanStack Query and `@repo/contracts`, to the NestJS controller and the `Board` domain. PostgreSQL is the saved copy. Point out that the domain file does not import Nest, Prisma, or the contracts package. The screen writes `response.board` into the query cache and does not move a card before that response.

## 4:00 Live scenario

Use a sequence that is not the official seven-step table:

1. Create `C` "Close the register", `A` "Open the register", and `B` "Count items". To Do shows `A`, `B`, `C`.
2. Drag `A` to In Progress. The heading reads 1/2.
3. Move `B` with the select and Move button. The heading reads 2/2.
4. Drag `C` onto In Progress. Read the error. `C` stays in To Do.
5. Move `A` to Done with the select. The heading reads 1/2.
6. Drag `C` to In Progress. The heading reads 2/2.
7. Undo twice: `C` returns to To Do, then `A` returns to In Progress.
8. Undo until the button disables. Those clicks return `undo_success`. The disabled button does not call undo again. `nothing_to_undo` is the HTTP result when undo is requested with an empty history.

## 7:00 Work-in-progress and undo

Explain that only a move into In Progress checks the limit, that a refused move is not undoable, and that undo restores the previous column even when that column is full. Empty undo returns HTTP 200 and code `nothing_to_undo`.

## 8:00 One automated test

Open `apps/api/src/modules/board/domain/board.spec.ts` and run the official sequence test. Say what it locks: the third move into In Progress is refused, the following undo restores `B` rather than the refused move, and the same-column move is not undone.

## 9:00 Relevant code

Show `createTask`, `moveTask`, and `undo` in `apps/api/src/modules/board/domain/board.ts`, the status map in `board-http.ts`, and `setQueryData` in the web mutation hooks.

## 10:00 Two decisions

1. One in-memory board instead of Prisma or Redis, because the board must run without those services and must forget its tasks on restart.
2. An operation stack instead of copying the whole board, because create and move each have one inverse and the client only needs `canUndo`.

Mention that a failed PostgreSQL connect is logged and does not stop the API from listening.

## 11:00 How AI suggestions were checked

The implementation followed the feature spec, plan, and task list. Column ids were checked against `todo`, `in_progress`, and `done`. The empty-undo code was checked against `nothing_to_undo`. Undo was checked so it does not call the move limit again. `pnpm test`, lint, typecheck, and build were the acceptance commands. Suggestions that would add auth, redo, persistence, or a second board were not taken.

## 11:30 Limitations

Restart clears the board. There is no collaboration, no persistence, no redo, no authentication, and no shared state across multiple API processes.
