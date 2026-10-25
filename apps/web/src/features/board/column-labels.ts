export const COLUMN_ORDER = ["todo", "in_progress", "done"] as const;

export type ColumnId = (typeof COLUMN_ORDER)[number];

export const COLUMN_LABELS: Record<ColumnId, string> = {
  todo: "To Do",
  in_progress: "In Progress",
  done: "Done",
};

export function isColumnId(value: string): value is ColumnId {
  return COLUMN_ORDER.some((column) => column === value);
}
