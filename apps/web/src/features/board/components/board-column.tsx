"use client";

import { useDroppable } from "@dnd-kit/core";
import { type Task } from "@repo/contracts";

import { COLUMN_LABELS, type ColumnId } from "../column-labels";
import BoardIcon from "./board-icon";
import TaskCard from "./task-card";

type BoardColumnProps = {
  columnId: ColumnId;
  tasks: Task[];
  wipLimit: number;
  isSaving: boolean;
  onMove: (taskId: string, destination: string) => void;
};

export default function BoardColumn({
  columnId,
  tasks,
  wipLimit,
  onMove,
  isSaving,
}: BoardColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: `column:${columnId}` });

  const isFull = columnId === "in_progress" && tasks.length >= wipLimit;
  const descriptions = {
    todo: "Ideas into action",
    in_progress: "Good things in the making",
    done: "A little victory, every time",
  };
  const emptyMessages = {
    todo: "A fresh start awaits. Create a task to get going.",
    in_progress: "One thing at a time. Move a task here to find your focus.",
    done: "Good work belongs here. Your completed tasks will land here.",
  };
  const heading =
    columnId === "in_progress"
      ? `In Progress — ${String(tasks.length)}/${String(wipLimit)}`
      : COLUMN_LABELS[columnId];

  return (
    <section
      ref={setNodeRef}
      aria-labelledby={`column-${columnId}`}
      data-full={isFull ? "true" : "false"}
      data-over={isOver ? "true" : "false"}
      data-column={columnId}
      className="board-column"
    >
      <div className="column-header">
        <div className="column-title">
          <span className="column-dot">
            {columnId === "done" ? <BoardIcon name="check" /> : null}
          </span>
          <h2 id={`column-${columnId}`} aria-label={heading}>
            {COLUMN_LABELS[columnId]}
          </h2>
          <span className="column-count" aria-hidden="true">
            {tasks.length}
          </span>
        </div>
        {columnId === "in_progress" ? (
          <span className="wip-count" title="Work in progress limit">
            {tasks.length}/{wipLimit} WIP
          </span>
        ) : null}
      </div>
      <p className="column-description">{descriptions[columnId]}</p>
      {isFull ? (
        <p className="wip-notice">At capacity · finish a task to make room</p>
      ) : null}
      <div className="column-tasks">
        {tasks.map((task) => (
          <TaskCard key={task.id} task={task} onMove={onMove} isSaving={isSaving} />
        ))}
        {tasks.length === 0 ? (
          <div className="column-empty">
            <span className="empty-icon">
              <BoardIcon
                name={
                  columnId === "done" ? "check" : columnId === "todo" ? "plus" : "arrow"
                }
              />
            </span>
            <p>No tasks</p>
            <span>{emptyMessages[columnId]}</span>
          </div>
        ) : null}
      </div>
    </section>
  );
}
