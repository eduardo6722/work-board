import {
  COLUMNS,
  type ActionResult,
  type BoardSnapshot,
  type BoardState,
  type BoardTaskView,
  type Column,
  type HistoryEntry,
  type Task,
} from "./board.types";

function isColumn(value: string): value is Column {
  return COLUMNS.some((column) => column === value);
}

function copyView(task: Task): BoardTaskView {
  return { id: task.id, title: task.title, column: task.column };
}

function copyStoredTask(task: Task): Task {
  return { id: task.id, title: task.title, column: task.column, sequence: task.sequence };
}

function copyHistory(entry: HistoryEntry): HistoryEntry {
  if (entry.type === "TASK_CREATED") {
    return { type: "TASK_CREATED", taskId: entry.taskId };
  }
  return { type: "TASK_MOVED", taskId: entry.taskId, from: entry.from, to: entry.to };
}

export class Board {
  private readonly tasks = new Map<string, Task>();
  private readonly history: HistoryEntry[] = [];
  private nextSequence = 1;

  constructor(private readonly wipLimit: number = 2) {}

  static hydrate(snapshot: BoardSnapshot, wipLimit: number): Board {
    const board = new Board(wipLimit);
    board.nextSequence = snapshot.nextSequence;
    for (const task of snapshot.tasks) {
      board.tasks.set(task.id, copyStoredTask(task));
    }
    for (const entry of snapshot.history) {
      board.history.push(copyHistory(entry));
    }
    return board;
  }

  toSnapshot(): BoardSnapshot {
    return {
      tasks: [...this.tasks.values()].map(copyStoredTask),
      history: this.history.map(copyHistory),
      nextSequence: this.nextSequence,
    };
  }

  getState(): BoardState {
    const columns: BoardState["columns"] = {
      todo: [],
      in_progress: [],
      done: [],
    };

    const ordered = [...this.tasks.values()].sort((left, right) => left.sequence - right.sequence);
    for (const task of ordered) {
      columns[task.column].push(copyView(task));
    }

    return {
      columns,
      wipLimit: this.wipLimit,
      canUndo: this.history.length > 0,
    };
  }

  createTask(id: string, title: string): ActionResult {
    if (id.trim().length === 0) {
      return {
        status: "error",
        code: "validation_error",
        message: "Enter a visible id.",
      };
    }

    if (title.trim().length === 0) {
      return {
        status: "error",
        code: "validation_error",
        message: "Enter a visible title.",
      };
    }

    if (this.tasks.has(id)) {
      return {
        status: "error",
        code: "duplicate_task_id",
        message: "A task with this id already exists.",
      };
    }

    const sequence = this.nextSequence;
    this.nextSequence += 1;
    this.tasks.set(id, { id, title, column: "todo", sequence });
    this.history.push({ type: "TASK_CREATED", taskId: id });

    return {
      status: "success",
      code: "task_created",
      message: "Task created.",
    };
  }

  moveTask(id: string, destination: string): ActionResult {
    const task = this.tasks.get(id);
    if (!task) {
      return {
        status: "error",
        code: "task_not_found",
        message: "Task not found.",
      };
    }

    if (!isColumn(destination)) {
      return {
        status: "error",
        code: "invalid_column",
        message: "Destination is not a column.",
      };
    }

    if (task.column === destination) {
      return {
        status: "no_change",
        code: "already_in_column",
        message: "Task is already in that column.",
      };
    }

    if (destination === "in_progress" && this.columnCount("in_progress") >= this.wipLimit) {
      return {
        status: "error",
        code: "wip_limit_reached",
        message: "In Progress is full.",
      };
    }

    const from = task.column;
    task.column = destination;
    this.history.push({ type: "TASK_MOVED", taskId: id, from, to: destination });

    return {
      status: "success",
      code: "task_moved",
      message: "Task moved.",
    };
  }

  undo(): ActionResult {
    const entry = this.history.at(-1);
    if (!entry) {
      return {
        status: "no_change",
        code: "nothing_to_undo",
        message: "Nothing to undo.",
      };
    }

    if (entry.type === "TASK_CREATED") {
      this.tasks.delete(entry.taskId);
    } else {
      const task = this.tasks.get(entry.taskId);
      if (task) {
        task.column = entry.from;
      }
    }

    this.history.pop();

    return {
      status: "success",
      code: "undo_success",
      message: "Undone.",
    };
  }

  private columnCount(column: Column): number {
    let count = 0;
    for (const task of this.tasks.values()) {
      if (task.column === column) {
        count += 1;
      }
    }
    return count;
  }
}
