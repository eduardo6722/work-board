import { type Board } from "@repo/contracts";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getBoard, moveTask, undo } from "@/lib/api/board";

import BoardView from "./board-view";

vi.mock("@/lib/api/board", () => ({
  getBoard: vi.fn(),
  createTask: vi.fn(),
  moveTask: vi.fn(),
  undo: vi.fn(),
}));

const emptyBoard: Board = {
  columns: { todo: [], in_progress: [], done: [] },
  wipLimit: 2,
  canUndo: false,
};

function renderBoard() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return render(<BoardView />, { wrapper });
}

describe("BoardView", () => {
  beforeEach(() => {
    vi.mocked(getBoard).mockReset();
    vi.mocked(moveTask).mockReset();
    vi.mocked(undo).mockReset();
  });

  it("shows a waiting state before the board arrives", () => {
    vi.mocked(getBoard).mockImplementation(() => new Promise(() => undefined));
    renderBoard();

    expect(screen.getByRole("status")).toHaveTextContent("Loading the board");
    expect(screen.queryByRole("heading", { name: "To Do" })).not.toBeInTheDocument();
  });

  it("shows an error state with retry when the board cannot load", async () => {
    const user = userEvent.setup();
    vi.mocked(getBoard).mockRejectedValue(new Error("down"));
    renderBoard();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "The board could not be loaded.",
    );
    await user.click(screen.getByRole("button", { name: "Retry" }));
    expect(getBoard).toHaveBeenCalledTimes(2);
  });

  it("shows the empty board, the limit, and a disabled undo control", async () => {
    vi.mocked(getBoard).mockResolvedValue(emptyBoard);
    renderBoard();

    expect(await screen.findByRole("heading", { name: "To Do" })).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "In Progress — 0/2" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Done" })).toBeInTheDocument();
    expect(screen.getAllByText("No tasks")).toHaveLength(3);
    expect(screen.getByRole("button", { name: "Undo" })).toBeDisabled();
  });

  it("keeps a full In Progress column visible and leaves a refused task in place", async () => {
    const user = userEvent.setup();
    const fullBoard: Board = {
      columns: {
        todo: [{ id: "C", title: "Count items", column: "todo" }],
        in_progress: [
          { id: "A", title: "Open the register", column: "in_progress" },
          { id: "B", title: "Close the register", column: "in_progress" },
        ],
        done: [],
      },
      wipLimit: 2,
      canUndo: true,
    };
    vi.mocked(getBoard).mockResolvedValue(fullBoard);
    vi.mocked(moveTask).mockResolvedValue({
      result: {
        status: "error",
        code: "wip_limit_reached",
        message: "In Progress is full.",
      },
      board: fullBoard,
    });
    renderBoard();

    expect(
      await screen.findByRole("heading", { name: "In Progress — 2/2" }),
    ).toBeInTheDocument();
    const todo = screen.getByRole("region", { name: "To Do" });
    await user.selectOptions(
      within(todo).getByLabelText("Destination for Count items"),
      "in_progress",
    );
    await user.click(within(todo).getByRole("button", { name: "Move" }));

    expect(await screen.findByText("In Progress is full.")).toBeInTheDocument();
    expect(within(todo).getByText("Count items")).toBeInTheDocument();
    expect(
      within(screen.getByRole("region", { name: "In Progress — 2/2" })).queryByText(
        "Count items",
      ),
    ).not.toBeInTheDocument();
  });

  it("keeps the card and shows an alert when saving a move fails", async () => {
    const user = userEvent.setup();
    const board: Board = {
      columns: {
        todo: [{ id: "A", title: "Prepare the report", column: "todo" }],
        in_progress: [],
        done: [],
      },
      wipLimit: 2,
      canUndo: false,
    };
    vi.mocked(getBoard).mockResolvedValue(board);
    vi.mocked(moveTask).mockRejectedValue(new Error("The board could not be saved."));
    renderBoard();

    const todo = await screen.findByRole("region", { name: "To Do" });
    await user.selectOptions(
      within(todo).getByLabelText("Destination for Prepare the report"),
      "done",
    );
    await user.click(within(todo).getByRole("button", { name: "Move" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "The board could not be saved.",
    );
    expect(
      within(todo).getByRole("article", { name: "Task Prepare the report" }),
    ).toBeInTheDocument();
    expect(within(todo).queryByText("A")).not.toBeInTheDocument();
    expect(within(todo).getByText("Prepare the report")).toBeInTheDocument();
    expect(screen.queryByText("The board could not be loaded.")).not.toBeInTheDocument();
  });

  it("renders a column in the order the board sent", async () => {
    vi.mocked(getBoard).mockResolvedValue({
      columns: {
        todo: [
          { id: "c-id", title: "C", column: "todo" },
          { id: "a-id", title: "A", column: "todo" },
          { id: "b-id", title: "B", column: "todo" },
        ],
        in_progress: [],
        done: [],
      },
      wipLimit: 2,
      canUndo: false,
    });
    renderBoard();

    const todo = await screen.findByRole("region", { name: "To Do" });
    expect(
      within(todo)
        .getAllByRole("article")
        .map((article) => article.getAttribute("aria-label")),
    ).toEqual(["Task C", "Task A", "Task B"]);
  });

  it("shows completion from the actual board tasks", async () => {
    vi.mocked(getBoard).mockResolvedValue({
      ...emptyBoard,
      columns: {
        todo: [{ id: "a", title: "Next step", column: "todo" }],
        in_progress: [],
        done: [{ id: "b", title: "Finished step", column: "done" }],
      },
    });
    renderBoard();

    const progress = await screen.findByRole("progressbar", { name: "Tasks completed" });
    expect(progress).toHaveAttribute("aria-valuenow", "50");
    expect(screen.getByText("1 of 2 tasks completed")).toBeInTheDocument();
  });

  it("prevents another move or undo while a move is saving", async () => {
    const user = userEvent.setup();
    vi.mocked(getBoard).mockResolvedValue({
      ...emptyBoard,
      canUndo: true,
      columns: {
        ...emptyBoard.columns,
        todo: [{ id: "a", title: "Next step", column: "todo" }],
      },
    });
    vi.mocked(moveTask).mockImplementation(() => new Promise(() => undefined));
    renderBoard();

    const todo = await screen.findByRole("region", { name: "To Do" });
    await user.selectOptions(
      within(todo).getByLabelText("Destination for Next step"),
      "done",
    );
    await user.click(within(todo).getByRole("button", { name: "Move" }));

    expect(within(todo).getByRole("button", { name: "Move" })).toBeDisabled();
    expect(within(todo).getByLabelText("Destination for Next step")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Undo" })).toBeDisabled();
  });

  it("enables undo when a step is available", async () => {
    vi.mocked(getBoard).mockResolvedValue({ ...emptyBoard, canUndo: true });
    renderBoard();

    expect(await screen.findByRole("button", { name: "Undo" })).toBeEnabled();
  });

  it("shows a successful undo and renders the returned board", async () => {
    const user = userEvent.setup();
    vi.mocked(getBoard).mockResolvedValue({
      columns: {
        todo: [],
        in_progress: [{ id: "A", title: "Prepare the report", column: "in_progress" }],
        done: [],
      },
      wipLimit: 2,
      canUndo: true,
    });
    vi.mocked(undo).mockResolvedValue({
      result: { status: "success", code: "undo_success", message: "Undone." },
      board: {
        columns: {
          todo: [{ id: "A", title: "Prepare the report", column: "todo" }],
          in_progress: [],
          done: [],
        },
        wipLimit: 2,
        canUndo: false,
      },
    });
    renderBoard();

    await user.click(await screen.findByRole("button", { name: "Undo" }));

    expect(await screen.findByText("Undone.")).toBeInTheDocument();
    expect(
      within(screen.getByRole("region", { name: "To Do" })).getByText(
        "Prepare the report",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "In Progress — 0/2" }),
    ).toBeInTheDocument();
  });

  it("shows nothing_to_undo and keeps the returned board", async () => {
    const user = userEvent.setup();
    const board: Board = {
      columns: {
        todo: [{ id: "A", title: "Prepare the report", column: "todo" }],
        in_progress: [],
        done: [],
      },
      wipLimit: 2,
      canUndo: true,
    };
    vi.mocked(getBoard).mockResolvedValue(board);
    vi.mocked(undo).mockResolvedValue({
      result: {
        status: "no_change",
        code: "nothing_to_undo",
        message: "Nothing to undo.",
      },
      board: { ...board, canUndo: false },
    });
    renderBoard();

    await user.click(await screen.findByRole("button", { name: "Undo" }));

    expect(await screen.findByText("Nothing to undo.")).toBeInTheDocument();
    expect(
      within(screen.getByRole("region", { name: "To Do" })).getByText(
        "Prepare the report",
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Undo" })).toBeDisabled();
  });
});
