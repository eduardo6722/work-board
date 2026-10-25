import { boardCacheKeys } from "../board-cache.keys";
import { BoardUnavailableError } from "../board-unavailable.error";
import { Board } from "../../domain/board";
import { type BoardRepository } from "../../domain/repositories/board.repository";
import { type ActionResult, type BoardState } from "../../domain/board.types";
import { InMemoryBoardRepository } from "../../testing/in-memory-board.repository";
import { InMemoryCache } from "../../testing/in-memory-cache";
import { CreateTaskUseCase } from "./create-task.use-case";
import { GetBoardUseCase } from "./get-board.use-case";
import { MoveTaskUseCase } from "./move-task.use-case";

const emptyBoard: BoardState = {
  columns: { todo: [], in_progress: [], done: [] },
  wipLimit: 2,
  canUndo: false,
};

class CountingRepository implements BoardRepository {
  reads = 0;

  constructor(private readonly inner: InMemoryBoardRepository) {}

  currentRevision(): Promise<number> {
    return this.inner.currentRevision();
  }

  async read(wipLimit: number): Promise<BoardState> {
    this.reads += 1;
    return this.inner.read(wipLimit);
  }

  run(
    wipLimit: number,
    work: (board: Board) => ActionResult,
  ): Promise<{ result: ActionResult; state: BoardState }> {
    return this.inner.run(wipLimit, work);
  }
}

class BrokenReadRepository implements BoardRepository {
  async currentRevision(): Promise<number> {
    return 0;
  }

  async read(): Promise<{ state: BoardState; revision: number }> {
    throw new Error("database down");
  }

  async run(): Promise<{ result: ActionResult; state: BoardState; revision: number }> {
    throw new Error("database down");
  }
}

describe("board use cases", () => {
  it("returns a cached board when the revision matches and skips the full read", async () => {
    const repository = new CountingRepository(new InMemoryBoardRepository());
    const cache = new InMemoryCache();
    const cached = {
      ...emptyBoard,
      columns: {
        ...emptyBoard.columns,
        todo: [{ id: "cached-id", title: "Cached", column: "todo" as const }],
      },
    };
    await cache.set(boardCacheKeys.state, { revision: 0, board: cached });

    const board = await new GetBoardUseCase(repository, 2, cache, 60).execute();

    expect(board).toEqual(cached);
    expect(repository.reads).toBe(0);
  });

  it("loads and stores the board when the cache is empty", async () => {
    const inner = new InMemoryBoardRepository();
    await inner.run(2, (board) => board.createTask("saved-id", "Saved"));
    const repository = new CountingRepository(inner);
    const cache = new InMemoryCache();

    const board = await new GetBoardUseCase(repository, 2, cache, 60).execute();

    expect(board.columns.todo[0]?.title).toBe("Saved");
    expect(repository.reads).toBe(1);
    expect(cache.sets).toBe(1);
  });

  it("ignores a cached board from an older revision", async () => {
    const inner = new InMemoryBoardRepository();
    await inner.run(2, (board) => board.createTask("saved-id", "Saved"));
    const repository = new CountingRepository(inner);
    const cache = new InMemoryCache();
    await cache.set(boardCacheKeys.state, {
      revision: 0,
      board: {
        ...emptyBoard,
        columns: {
          ...emptyBoard.columns,
          todo: [{ id: "stale-id", title: "Stale", column: "todo" }],
        },
      },
    });

    const board = await new GetBoardUseCase(repository, 2, cache, 60).execute();

    expect(board.columns.todo.map((task) => task.title)).toEqual(["Saved"]);
    expect(repository.reads).toBe(1);
  });

  it("returns the saved board when the cache read throws", async () => {
    const inner = new InMemoryBoardRepository();
    await inner.run(2, (board) => board.createTask("saved-id", "Saved"));
    const cache = new InMemoryCache();
    cache.failGet = true;

    const board = await new GetBoardUseCase(new CountingRepository(inner), 2, cache, 60).execute();

    expect(board.columns.todo[0]?.title).toBe("Saved");
  });

  it("returns the saved task when storing the cache throws", async () => {
    const repository = new InMemoryBoardRepository();
    const cache = new InMemoryCache();
    cache.failSet = true;

    const outcome = await new CreateTaskUseCase(repository, 2, cache, 60).execute({
      title: "Prepare the report",
    });

    expect(outcome.result.code).toBe("task_created");
    expect((await repository.read(2)).state.columns.todo[0]?.title).toBe("Prepare the report");
  });

  it("does not store the cache when create or move changes nothing", async () => {
    const repository = new InMemoryBoardRepository();
    const cache = new InMemoryCache();
    const create = new CreateTaskUseCase(repository, 2, cache, 60);
    await create.execute({ title: "Prepare the report" });
    const setsAfterCreate = cache.sets;
    const revision = await repository.currentRevision();

    const blank = await create.execute({ title: "   " });
    const task = (await repository.read(2)).state.columns.todo[0];
    const sameColumn = await new MoveTaskUseCase(repository, 2, cache, 60).execute(
      task?.id ?? "",
      "todo",
    );

    expect(blank.result.code).toBe("validation_error");
    expect(sameColumn.result.code).toBe("already_in_column");
    expect(cache.sets).toBe(setsAfterCreate);
    expect(await repository.currentRevision()).toBe(revision);
  });

  it("stores the revision returned by the save, not a later revision", async () => {
    const cache = new InMemoryCache();
    const repository: BoardRepository = {
      async currentRevision() {
        return 9;
      },
      async read() {
        return { state: emptyBoard, revision: 9 };
      },
      async run() {
        return {
          result: { status: "success", code: "task_created", message: "Task created." },
          state: {
            ...emptyBoard,
            canUndo: true,
            columns: {
              ...emptyBoard.columns,
              todo: [{ id: "mine", title: "Mine", column: "todo" }],
            },
          },
          revision: 1,
        };
      },
    };

    await new CreateTaskUseCase(repository, 2, cache, 60).execute({ title: "Mine" });

    const stored = await cache.get<{ revision: number; board: BoardState }>(boardCacheKeys.state);
    expect(stored?.revision).toBe(1);
    expect(stored?.board.columns.todo[0]?.title).toBe("Mine");
  });

  it("does not store the cache when the board cannot be read", async () => {
    const cache = new InMemoryCache();

    await expect(new GetBoardUseCase(new BrokenReadRepository(), 2, cache, 60).execute()).rejects.toBeInstanceOf(
      BoardUnavailableError,
    );
    expect(cache.sets).toBe(0);
  });
});
