import { Board } from "./board";
import { type BoardState, type Column } from "./board.types";

function ids(board: Board, column: Column): string[] {
  return board.getState().columns[column].map((task) => task.id);
}

function snapshot(board: Board): BoardState {
  return structuredClone(board.getState());
}

describe("Board", () => {
  it("starts empty with a limit of 2 and undo unavailable", () => {
    const state = new Board().getState();

    expect(state.wipLimit).toBe(2);
    expect(state.columns.todo).toEqual([]);
    expect(state.columns.in_progress).toEqual([]);
    expect(state.columns.done).toEqual([]);
    expect(state.canUndo).toBe(false);
  });

  it("uses the constructor limit", () => {
    expect(new Board(3).getState().wipLimit).toBe(3);
  });

  describe("createTask", () => {
    it("adds the task only in To Do and records one undo step", () => {
      const board = new Board();

      const result = board.createTask("A", "Prepare the report");

      expect(result).toMatchObject({ status: "success", code: "task_created" });
      expect(board.getState().columns.todo).toEqual([
        { id: "A", title: "Prepare the report", column: "todo" },
      ]);
      expect(board.getState().columns.in_progress).toEqual([]);
      expect(board.getState().columns.done).toEqual([]);
      expect(board.getState().canUndo).toBe(true);
    });

    it("rejects a duplicate id without changing tasks or history", () => {
      const board = new Board();
      board.createTask("A", "Prepare the report");
      const before = snapshot(board);

      const result = board.createTask("A", "Another title");

      expect(result).toMatchObject({ status: "error", code: "duplicate_task_id" });
      expect(snapshot(board)).toEqual(before);
    });

    it("rejects an id or title with no visible characters", () => {
      const board = new Board();
      const before = snapshot(board);

      expect(board.createTask("   ", "Prepare the report").code).toBe("validation_error");
      expect(board.createTask("A", "   ").code).toBe("validation_error");
      expect(snapshot(board)).toEqual(before);
    });

    it("treats A and a spaced id as different tasks", () => {
      const board = new Board();

      expect(board.createTask("A", "First").code).toBe("task_created");
      expect(board.createTask(" A", "Second").code).toBe("task_created");
      expect(ids(board, "todo")).toEqual(["A", " A"]);
    });

    it("lists tasks in creation order instead of id text order", () => {
      const board = new Board();
      board.createTask("C", "C");
      board.createTask("A", "A");
      board.createTask("B", "B");
      expect(ids(board, "todo")).toEqual(["C", "A", "B"]);

      const numeric = new Board();
      numeric.createTask("10", "Ten");
      numeric.createTask("2", "Two");
      expect(ids(numeric, "todo")).toEqual(["10", "2"]);

      expect(board.moveTask("A", "done").code).toBe("task_moved");
      expect(ids(board, "todo")).toEqual(["C", "B"]);
      expect(ids(board, "done")).toEqual(["A"]);
      expect(board.undo().code).toBe("undo_success");
      expect(ids(board, "todo")).toEqual(["C", "A", "B"]);
    });
  });

  describe("moveTask", () => {
    it("moves a task to another column and records one step", () => {
      const board = new Board();
      board.createTask("A", "Prepare the report");

      const result = board.moveTask("A", "done");

      expect(result).toMatchObject({ status: "success", code: "task_moved" });
      expect(ids(board, "todo")).toEqual([]);
      expect(ids(board, "done")).toEqual(["A"]);
      expect(board.undo().code).toBe("undo_success");
      expect(ids(board, "todo")).toEqual(["A"]);
      expect(board.getState().canUndo).toBe(true);
    });

    it("allows a direct move from To Do to Done", () => {
      const board = new Board();
      board.createTask("A", "Prepare the report");

      expect(board.moveTask("A", "done").code).toBe("task_moved");
      expect(ids(board, "done")).toEqual(["A"]);
      expect(ids(board, "in_progress")).toEqual([]);
    });

    it("does not record a move into the current column", () => {
      const board = new Board();
      board.createTask("A", "Prepare the report");

      expect(board.moveTask("A", "todo")).toMatchObject({
        status: "no_change",
        code: "already_in_column",
      });
      expect(board.undo().code).toBe("undo_success");
      expect(ids(board, "todo")).toEqual([]);
      expect(board.getState().canUndo).toBe(false);
    });

    it("rejects an unknown task and an unknown column without changes", () => {
      const board = new Board();
      board.createTask("A", "Prepare the report");
      const before = snapshot(board);

      expect(board.moveTask("Z", "done")).toMatchObject({
        status: "error",
        code: "task_not_found",
      });
      expect(board.moveTask("A", "not-a-column")).toMatchObject({
        status: "error",
        code: "invalid_column",
      });
      expect(snapshot(board)).toEqual(before);
    });

    it("stops a third task from entering In Progress and allows a task to leave", () => {
      const board = new Board(2);
      board.createTask("A", "A");
      board.createTask("B", "B");
      board.createTask("C", "C");
      expect(board.moveTask("A", "in_progress").code).toBe("task_moved");
      expect(board.moveTask("B", "in_progress").code).toBe("task_moved");
      const before = snapshot(board);

      const refused = board.moveTask("C", "in_progress");

      expect(refused).toMatchObject({ status: "error", code: "wip_limit_reached" });
      expect(snapshot(board)).toEqual(before);
      expect(board.getState().columns.in_progress).toHaveLength(2);

      expect(board.moveTask("A", "done").code).toBe("task_moved");
      expect(board.getState().columns.in_progress).toHaveLength(1);
    });
  });

  describe("undo", () => {
    it("removes a created task and allows that id again", () => {
      const board = new Board();
      board.createTask("A", "Prepare the report");

      expect(board.undo()).toMatchObject({ status: "success", code: "undo_success" });
      expect(ids(board, "todo")).toEqual([]);
      expect(board.createTask("A", "Prepare the report").code).toBe("task_created");
    });

    it("restores the column a task left", () => {
      const board = new Board();
      board.createTask("A", "Prepare the report");
      board.moveTask("A", "done");

      expect(board.undo().code).toBe("undo_success");
      expect(ids(board, "todo")).toEqual(["A"]);
      expect(ids(board, "done")).toEqual([]);
    });

    it("reverses only the newest successful step", () => {
      const board = new Board();
      board.createTask("A", "A");
      board.createTask("B", "B");
      board.moveTask("A", "done");

      board.undo();

      expect(ids(board, "todo")).toEqual(["A", "B"]);
      expect(ids(board, "done")).toEqual([]);
      expect(board.getState().canUndo).toBe(true);
    });

    it("skips a refused move and a same-column move", () => {
      const board = new Board(2);
      board.createTask("A", "A");
      board.createTask("B", "B");
      board.createTask("C", "C");
      board.moveTask("A", "in_progress");
      board.moveTask("B", "in_progress");
      board.moveTask("C", "in_progress");
      board.moveTask("A", "in_progress");

      expect(board.undo().code).toBe("undo_success");
      expect(ids(board, "in_progress")).toEqual(["A"]);
      expect(ids(board, "todo")).toEqual(["B", "C"]);
    });

    it("returns nothing_to_undo when history is empty and does not change the board", () => {
      const board = new Board();
      const before = snapshot(board);

      expect(board.undo()).toMatchObject({ status: "no_change", code: "nothing_to_undo" });
      expect(snapshot(board)).toEqual(before);

      board.createTask("A", "A");
      board.undo();
      const empty = snapshot(board);
      expect(board.undo().code).toBe("nothing_to_undo");
      expect(snapshot(board)).toEqual(empty);
    });

    it("does not re-check the limit when undo moves a task back into In Progress", () => {
      const board = new Board(2);
      board.createTask("A", "A");
      board.createTask("B", "B");
      board.createTask("C", "C");
      board.moveTask("A", "in_progress");
      board.moveTask("B", "in_progress");
      board.moveTask("A", "todo");
      board.moveTask("C", "in_progress");

      expect(board.undo().code).toBe("undo_success");
      expect(board.undo().code).toBe("undo_success");
      expect(ids(board, "in_progress")).toEqual(["A", "B"]);
      expect(board.getState().columns.in_progress).toHaveLength(2);
    });
  });

  describe("official sequence", () => {
    it("matches the seven-step acceptance sequence", () => {
      const board = new Board(2);
      board.createTask("A", "A");
      board.createTask("B", "B");
      board.createTask("C", "C");
      expect(ids(board, "todo")).toEqual(["A", "B", "C"]);

      expect(board.moveTask("A", "in_progress").code).toBe("task_moved");
      expect(ids(board, "in_progress")).toEqual(["A"]);
      expect(ids(board, "todo")).toEqual(["B", "C"]);

      expect(board.moveTask("B", "in_progress").code).toBe("task_moved");
      expect(ids(board, "in_progress")).toEqual(["A", "B"]);
      expect(board.getState().columns.in_progress).toHaveLength(board.getState().wipLimit);
      expect(ids(board, "todo")).toEqual(["C"]);

      const beforeRefusal = snapshot(board);
      expect(board.moveTask("C", "in_progress").code).toBe("wip_limit_reached");
      expect(snapshot(board)).toEqual(beforeRefusal);

      expect(board.undo().code).toBe("undo_success");
      expect(ids(board, "todo")).toEqual(["B", "C"]);
      expect(ids(board, "in_progress")).toEqual(["A"]);

      expect(board.moveTask("C", "done").code).toBe("task_moved");
      expect(ids(board, "done")).toEqual(["C"]);

      const beforeSameColumn = snapshot(board);
      expect(board.moveTask("C", "done").code).toBe("already_in_column");
      expect(snapshot(board)).toEqual(beforeSameColumn);

      expect(board.undo().code).toBe("undo_success");
      expect(ids(board, "in_progress")).toEqual(["A"]);
      expect(ids(board, "todo")).toEqual(["B", "C"]);
      expect(ids(board, "done")).toEqual([]);
      expect(board.getState().columns.in_progress).toHaveLength(1);
      expect(board.getState().wipLimit).toBe(2);
      expect(board.getState().canUndo).toBe(true);
    });
  });

  describe("snapshot", () => {
    it("assigns the next sequence and does not reuse it after undo", () => {
      const board = new Board();

      board.createTask("A", "First");
      board.createTask("B", "Second");

      expect(board.toSnapshot().nextSequence).toBe(3);
      expect(board.toSnapshot().tasks.map((task) => task.sequence)).toEqual([1, 2]);

      expect(board.undo().code).toBe("undo_success");
      expect(board.toSnapshot().nextSequence).toBe(3);

      board.createTask("C", "Third");
      expect(board.toSnapshot().tasks.find((task) => task.id === "C")?.sequence).toBe(3);
      expect(board.toSnapshot().nextSequence).toBe(4);
    });

    it("does not advance the sequence when create is refused", () => {
      const board = new Board();
      board.createTask("A", "First");
      const before = board.toSnapshot();

      expect(board.createTask("A", "Duplicate").code).toBe("duplicate_task_id");
      expect(board.createTask("B", "   ").code).toBe("validation_error");
      expect(board.toSnapshot()).toEqual(before);
    });

    it("restores tasks, history, and the next sequence", () => {
      const board = new Board(4);
      board.createTask("A", "First");
      board.moveTask("A", "done");

      const restored = Board.hydrate(board.toSnapshot(), 4);

      expect(restored.getState()).toEqual(board.getState());
      expect(restored.toSnapshot()).toEqual(board.toSnapshot());
    });

    it("omits sequence from the derived board", () => {
      const board = new Board();
      board.createTask("A", "First");

      expect(board.getState().columns.todo[0]).toEqual({
        id: "A",
        title: "First",
        column: "todo",
      });
    });
  });
});
