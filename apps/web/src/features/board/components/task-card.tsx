"use client";

import { useDraggable } from "@dnd-kit/core";
import { type Task } from "@repo/contracts";
import { Button } from "@repo/ui/components/button";
import { type FormEvent } from "react";

import BoardIcon from "./board-icon";

import { COLUMN_LABELS, COLUMN_ORDER } from "../column-labels";

type TaskCardProps = {
  task: Task;
  isSaving: boolean;
  onMove: (taskId: string, destination: string) => void;
};

export default function TaskCard({ task, onMove, isSaving }: TaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `task:${task.id}`,
    disabled: isSaving,
  });

  const style = transform
    ? { transform: `translate3d(${String(transform.x)}px, ${String(transform.y)}px, 0)` }
    : undefined;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const destination = String(
      new FormData(event.currentTarget).get("destination") ?? "",
    );
    onMove(task.id, destination);
  };

  return (
    <article
      ref={setNodeRef}
      style={style}
      aria-label={`Task ${task.title}`}
      data-dragging={isDragging}
      data-complete={task.column === "done"}
      className="task-card"
    >
      <div className="task-card-top">
        <span className="task-status">
          {task.column === "done" ? (
            <BoardIcon name="check" />
          ) : (
            <span className="task-status-dot" />
          )}
          {COLUMN_LABELS[task.column]}
        </span>
        <button
          type="button"
          className="task-drag-handle"
          aria-label={`Drag ${task.title}`}
          disabled={isSaving}
          {...listeners}
          {...attributes}
        >
          <BoardIcon name="grip" />
        </button>
      </div>
      <h3 className="task-title">{task.title}</h3>
      <form className="task-move-form" onSubmit={handleSubmit}>
        <label className="task-destination">
          <span className="sr-only">Destination for {task.title}</span>
          <select name="destination" defaultValue={task.column} disabled={isSaving}>
            {COLUMN_ORDER.map((columnId) => (
              <option key={columnId} value={columnId}>
                {COLUMN_LABELS[columnId]}
              </option>
            ))}
          </select>
        </label>
        <Button
          type="submit"
          size="sm"
          variant="ghost"
          disabled={isSaving}
          className="task-move-button"
        >
          Move <BoardIcon name="arrow" />
        </Button>
      </form>
    </article>
  );
}
