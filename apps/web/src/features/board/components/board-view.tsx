"use client";

import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { Button } from "@repo/ui/components/button";
import { useState } from "react";

import { COLUMN_ORDER, isColumnId } from "../column-labels";
import { useBoard } from "../hooks/use-board";
import { useMoveTask } from "../hooks/use-move-task";
import { useUndo } from "../hooks/use-undo";
import BoardColumn from "./board-column";
import BoardIcon from "./board-icon";
import BoardShell from "./board-shell";
import CreateTaskDialog from "./create-task-dialog";
import UndoButton from "./undo-button";

export default function BoardView() {
  const [feedback, setFeedback] = useState<string | null>(null);
  const [feedbackIsError, setFeedbackIsError] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );
  const boardQuery = useBoard();
  const moveTask = useMoveTask();
  const undoTask = useUndo();

  const board = boardQuery.data;
  const totalTasks = board
    ? COLUMN_ORDER.reduce((sum, id) => sum + board.columns[id].length, 0)
    : 0;
  const completedTasks = board?.columns.done.length ?? 0;
  const completion = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const isSaving = moveTask.isPending || undoTask.isPending;

  const handleFeedback = (message: string) => {
    setFeedback(message);
    setFeedbackIsError(false);
  };
  const handleActionError = (error: unknown) => {
    setFeedback(error instanceof Error ? error.message : "The board could not be saved.");
    setFeedbackIsError(true);
  };
  const handleMove = (taskId: string, destination: string) => {
    moveTask.mutate(
      { id: taskId, destination },
      {
        onSuccess: (body) => {
          setFeedback(body.result.message);
          setFeedbackIsError(body.result.status === "error");
        },
        onError: handleActionError,
      },
    );
  };
  const handleDragEnd = (event: DragEndEvent) => {
    const overId = event.over?.id;
    const activeId = event.active.id;
    if (
      typeof overId !== "string" ||
      typeof activeId !== "string" ||
      !overId.startsWith("column:") ||
      !activeId.startsWith("task:")
    ) {
      return;
    }
    const destination = overId.slice("column:".length);
    const taskId = activeId.slice("task:".length);
    if (!isColumnId(destination) || taskId.length === 0) {
      return;
    }
    handleMove(taskId, destination);
  };
  const handleUndo = () => {
    undoTask.mutate(undefined, {
      onSuccess: (body) => {
        setFeedback(body.result.message);
        setFeedbackIsError(body.result.status === "error");
      },
      onError: handleActionError,
    });
  };
  const handleRetry = () => {
    void boardQuery.refetch();
  };

  return (
    <BoardShell>
      <header className="board-header">
        <div>
          <p className="eyebrow">A CLEAR SPACE FOR WHAT’S NEXT</p>
          <h1>
            Your work, in flow<span>.</span>
          </h1>
          <p className="board-description">
            Make a plan. Find your focus. Move things forward.
          </p>
        </div>
        {board ? <CreateTaskDialog onFeedback={handleFeedback} /> : null}
      </header>
      {!board ? (
        boardQuery.isError ? (
          <section className="board-state board-error">
            <span className="state-symbol">!</span>
            <h2>Let’s get you back on track</h2>
            <p role="alert">The board could not be loaded.</p>
            <p>Your tasks will appear here once the connection is restored.</p>
            <Button type="button" onClick={handleRetry}>
              Retry
            </Button>
          </section>
        ) : (
          <section className="board-loading" aria-busy="true">
            <p role="status">Loading the board</p>
            <div className="loading-columns" aria-hidden="true">
              {COLUMN_ORDER.map((id) => (
                <div className="loading-column" key={id}>
                  <div />
                  <div />
                  <div />
                </div>
              ))}
            </div>
          </section>
        )
      ) : (
        <>
          <section className="board-overview" aria-label="Board overview">
            <div className="overview-intro">
              <span className="overview-icon">
                <BoardIcon name="leaf" />
              </span>
              <div>
                <h2>Small steps. Real progress.</h2>
                <p>
                  {totalTasks === 0
                    ? "Your next great idea starts with a task."
                    : `${String(totalTasks - completedTasks)} tasks to go. One thing at a time.`}
                </p>
              </div>
            </div>
            <div className="overview-progress">
              <div>
                <span>Overall progress</span>
                <strong>{completion}%</strong>
              </div>
              <div
                className="progress-track"
                role="progressbar"
                aria-label="Tasks completed"
                aria-valuenow={completion}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <span style={{ width: `${String(completion)}%` }} />
              </div>
              <p>
                {completedTasks} of {totalTasks} tasks completed
              </p>
            </div>
          </section>
          <div className="board-toolbar">
            <div className="board-view-label">
              <BoardIcon name="board" />
              <h2>Board view</h2>
              <span className="total-count">{totalTasks}</span>
            </div>
            <UndoButton canUndo={board.canUndo && !isSaving} onUndo={handleUndo} />
          </div>
          {feedback ? (
            <p
              className="board-feedback"
              data-error={feedbackIsError}
              role={feedbackIsError ? "alert" : "status"}
            >
              {feedback}
            </p>
          ) : null}
          {boardQuery.isError ? (
            <div className="board-feedback" role="alert">
              The board could not be refreshed. Showing the last loaded tasks.{" "}
              <Button variant="ghost" onClick={handleRetry}>
                Retry
              </Button>
            </div>
          ) : null}
          <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
            <div className="board-columns" aria-busy={isSaving}>
              {COLUMN_ORDER.map((columnId) => (
                <BoardColumn
                  key={columnId}
                  columnId={columnId}
                  tasks={board.columns[columnId]}
                  wipLimit={board.wipLimit}
                  onMove={handleMove}
                  isSaving={isSaving}
                />
              ))}
            </div>
          </DndContext>
          <footer className="board-footer">
            <span>
              <span className="footer-dot" />A little more done, a little more clarity.
            </span>
            <span>Drag cards to move them, or use the move controls.</span>
          </footer>
        </>
      )}
    </BoardShell>
  );
}
