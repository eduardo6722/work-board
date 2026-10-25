import { describe, expect, it } from "vitest";

import { actionResultSchema, boardMutationSchema } from "./action-result.schema";
import { boardSchema } from "./board.schema";
import { createTaskSchema, moveTaskSchema } from "./task.schema";

const emptyBoard = {
  columns: {
    todo: [],
    in_progress: [],
    done: [],
  },
  wipLimit: 2,
  canUndo: false,
};

describe("createTaskSchema", () => {
  it("accepts a title and strips an extra id", () => {
    expect(createTaskSchema.parse({ title: "Prepare the report" })).toEqual({
      title: "Prepare the report",
    });
    const spaced = createTaskSchema.parse({ title: " A ", id: "supplied" });
    expect(spaced).toEqual({ title: " A " });
    expect("id" in spaced).toBe(false);
  });

  it("rejects a title with no visible characters", () => {
    expect(createTaskSchema.safeParse({}).success).toBe(false);
    expect(createTaskSchema.safeParse({ title: "" }).success).toBe(false);
    const spaces = createTaskSchema.safeParse({ title: "   " });
    expect(spaces.success).toBe(false);
    if (!spaces.success) {
      expect(spaces.error.issues[0]?.message).toBe("Enter a visible title.");
    }
  });
});

describe("moveTaskSchema", () => {
  it("accepts any string destination, including an unknown column", () => {
    expect(moveTaskSchema.parse({ destination: "not-a-column" })).toEqual({
      destination: "not-a-column",
    });
  });

  it("rejects a missing destination", () => {
    expect(moveTaskSchema.safeParse({}).success).toBe(false);
  });
});

describe("boardSchema", () => {
  it("requires the three columns, the limit, and undo availability", () => {
    expect(boardSchema.parse(emptyBoard)).toEqual(emptyBoard);
    const { canUndo: _canUndo, ...withoutUndo } = emptyBoard;
    expect(boardSchema.safeParse(withoutUndo).success).toBe(false);
    expect(
      boardSchema.safeParse({
        columns: { todo: [], in_progress: [] },
        wipLimit: 2,
        canUndo: false,
      }).success,
    ).toBe(false);
  });
});

describe("actionResultSchema", () => {
  it("accepts each status only with its own codes", () => {
    expect(
      actionResultSchema.parse({
        status: "success",
        code: "task_created",
        message: "Task created.",
      }).code,
    ).toBe("task_created");
    expect(
      actionResultSchema.safeParse({
        status: "success",
        code: "nothing_to_undo",
        message: "Nothing to undo.",
      }).success,
    ).toBe(false);
    expect(
      actionResultSchema.parse({
        status: "no_change",
        code: "nothing_to_undo",
        message: "Nothing to undo.",
      }).code,
    ).toBe("nothing_to_undo");
  });

  it("wraps a result with the board", () => {
    const parsed = boardMutationSchema.parse({
      result: { status: "error", code: "duplicate_task_id", message: "Duplicate." },
      board: emptyBoard,
    });
    expect(parsed.result.code).toBe("duplicate_task_id");
    expect(parsed.board.wipLimit).toBe(2);
  });
});
