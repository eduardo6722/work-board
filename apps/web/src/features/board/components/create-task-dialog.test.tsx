import { type Board } from "@repo/contracts";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createTask, getBoard } from "@/lib/api/board";

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

describe("CreateTaskDialog", () => {
  beforeEach(() => {
    vi.mocked(getBoard).mockReset();
    vi.mocked(createTask).mockReset();
    vi.mocked(getBoard).mockResolvedValue(emptyBoard);
  });

  it("asks for a title and shows an inline error when it is empty", async () => {
    const user = userEvent.setup();
    renderBoard();
    await screen.findByRole("heading", { name: "To Do" });

    await user.click(screen.getByRole("button", { name: "Create task" }));

    expect(screen.getByLabelText("Title")).toBeInTheDocument();
    expect(screen.queryByLabelText("Id")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Add task" }));

    expect(await screen.findByText("Enter a visible title.")).toBeInTheDocument();
    expect(createTask).not.toHaveBeenCalled();
  });

  it("closes the dialog and shows the new card after a successful create", async () => {
    const user = userEvent.setup();
    vi.mocked(createTask).mockResolvedValue({
      result: { status: "success", code: "task_created", message: "Task created." },
      board: {
        ...emptyBoard,
        canUndo: true,
        columns: {
          ...emptyBoard.columns,
          todo: [{ id: "hidden-id", title: "Prepare the report", column: "todo" }],
        },
      },
    });
    renderBoard();
    await screen.findByRole("heading", { name: "To Do" });

    await user.click(screen.getByRole("button", { name: "Create task" }));
    await user.type(screen.getByLabelText("Title"), "Prepare the report");
    await user.click(screen.getByRole("button", { name: "Add task" }));

    expect(await screen.findByText("Task created.")).toBeInTheDocument();
    expect(screen.getByText("Prepare the report")).toBeInTheDocument();
    expect(screen.queryByText("hidden-id")).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "New task" })).not.toBeInTheDocument();
    expect(vi.mocked(createTask).mock.calls[0]?.[0]).toEqual({ title: "Prepare the report" });
  });

  it("keeps the title and adds both cards when the title is repeated", async () => {
    const user = userEvent.setup();
    vi.mocked(createTask).mockResolvedValue({
      result: { status: "success", code: "task_created", message: "Task created." },
      board: {
        ...emptyBoard,
        canUndo: true,
        columns: {
          ...emptyBoard.columns,
          todo: [
            { id: "first-hidden", title: "Prepare the report", column: "todo" },
            { id: "second-hidden", title: "Prepare the report", column: "todo" },
          ],
        },
      },
    });
    renderBoard();
    await screen.findByRole("heading", { name: "To Do" });

    await user.click(screen.getByRole("button", { name: "Create task" }));
    await user.type(screen.getByLabelText("Title"), "Prepare the report");
    await user.click(screen.getByRole("button", { name: "Add task" }));

    expect(await screen.findAllByText("Prepare the report")).toHaveLength(2);
    expect(screen.queryByText("A task with this id already exists.")).not.toBeInTheDocument();
    expect(screen.queryByText("first-hidden")).not.toBeInTheDocument();
    expect(screen.queryByText("second-hidden")).not.toBeInTheDocument();
  });

  it("shows an alert and does not add a card when create cannot be saved", async () => {
    const user = userEvent.setup();
    vi.mocked(createTask).mockRejectedValue(new Error("The board could not be saved."));
    renderBoard();
    await screen.findByRole("heading", { name: "To Do" });

    await user.click(screen.getByRole("button", { name: "Create task" }));
    await user.type(screen.getByLabelText("Title"), "Prepare the report");
    await user.click(screen.getByRole("button", { name: "Add task" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("The board could not be saved.");
    expect(screen.getByLabelText("Title")).toHaveValue("Prepare the report");
    expect(screen.queryByRole("article")).not.toBeInTheDocument();
  });

  it("keeps the entered title when the server rejects it", async () => {
    const user = userEvent.setup();
    vi.mocked(createTask).mockResolvedValue({
      result: {
        status: "error",
        code: "validation_error",
        message: "Enter a visible title.",
      },
      board: emptyBoard,
    });
    renderBoard();
    await screen.findByRole("heading", { name: "To Do" });

    await user.click(screen.getByRole("button", { name: "Create task" }));
    await user.type(screen.getByLabelText("Title"), "   ");
    await user.click(screen.getByRole("button", { name: "Add task" }));

    expect(screen.getByLabelText("Title")).toHaveValue("   ");
    expect(screen.queryByRole("article")).not.toBeInTheDocument();
  });
});
