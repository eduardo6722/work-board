# ADR 0012: In-memory board and operation undo

## Context

The Kanban board is one shared workspace for the running API process. Tasks and undo history disappear when the process stops. The board must still answer when PostgreSQL and Redis are not running. The example feature continued to use both.

## Decision

Keep one in-memory `Board` singleton per process. NestJS constructs it from `BOARD_WIP_LIMIT` and injects that same object into the board controller. There is no Prisma model, Redis key, or repository for the board.

Undo is an operation stack on that object. A successful create pushes `{ type: "TASK_CREATED", taskId }`. A successful move pushes `{ type: "TASK_MOVED", taskId, from, to }`. Failures and no-change moves push nothing. Undo applies the inverse and then pops. Undo does not push a step and does not re-check the work-in-progress limit.

`PrismaService.onModuleInit` logs a failed `$connect()` and does not rethrow, so the API can listen while PostgreSQL is down. Redis already continues when its connection fails. Board routes never inject either client.

## Alternatives

- Prisma or Redis as the board store. Rejected. The board must run without those processes, and a repository would only wrap the one in-memory implementation.
- A full board snapshot after every success. Rejected. The two successful operations already have a direct inverse, and the HTTP contract exposes `canUndo` rather than the stack.
- Removing Prisma and Redis from the application. Rejected. The example feature still depended on them.

## Consequences

Restarting the API clears the board. Two processes do not share tasks. The example routes still needed a live database when they were called. Board tests run without Docker.

ADR 0013 supersedes the in-memory store. ADR 0014 removes the example feature this record left in place.
