import { COLUMNS, type BoardSnapshot, type Column, type HistoryEntry, type Task } from "../../../domain/board.types";

export type BoardTaskRow = {
  id: string;
  title: string;
  column: string;
  sequence: number;
};

export type BoardHistoryRow = {
  position: number;
  type: string;
  taskId: string;
  fromColumn: string | null;
  toColumn: string | null;
};

function requireColumn(value: string): Column {
  const column = COLUMNS.find((candidate) => candidate === value);
  if (!column) {
    throw new Error(`Unknown column ${value}`);
  }
  return column;
}

function toHistoryEntry(row: BoardHistoryRow): HistoryEntry {
  if (row.type === "TASK_CREATED") {
    return { type: "TASK_CREATED", taskId: row.taskId };
  }
  if (row.type === "TASK_MOVED") {
    return {
      type: "TASK_MOVED",
      taskId: row.taskId,
      from: requireColumn(row.fromColumn ?? ""),
      to: requireColumn(row.toColumn ?? ""),
    };
  }
  throw new Error(`Unknown history type ${row.type}`);
}

export class BoardMapper {
  static toSnapshot(
    nextSequence: number,
    tasks: BoardTaskRow[],
    history: BoardHistoryRow[],
  ): BoardSnapshot {
    return {
      nextSequence,
      tasks: tasks.map((row) => ({
        id: row.id,
        title: row.title,
        column: requireColumn(row.column),
        sequence: row.sequence,
      })),
      history: [...history].sort((left, right) => left.position - right.position).map(toHistoryEntry),
    };
  }

  static toTaskRows(tasks: Task[]): BoardTaskRow[] {
    return tasks.map((task) => ({
      id: task.id,
      title: task.title,
      column: task.column,
      sequence: task.sequence,
    }));
  }

  static toHistoryRows(history: HistoryEntry[]): BoardHistoryRow[] {
    return history.map((entry, position) => {
      if (entry.type === "TASK_CREATED") {
        return {
          position,
          type: entry.type,
          taskId: entry.taskId,
          fromColumn: null,
          toColumn: null,
        };
      }
      return {
        position,
        type: entry.type,
        taskId: entry.taskId,
        fromColumn: entry.from,
        toColumn: entry.to,
      };
    });
  }
}
