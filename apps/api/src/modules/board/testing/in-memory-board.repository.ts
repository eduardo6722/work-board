import { Board } from "../domain/board";
import { type BoardRepository } from "../domain/repositories/board.repository";
import { type ActionResult, type BoardSnapshot, type BoardState } from "../domain/board.types";

export class InMemoryBoardRepository implements BoardRepository {
  private snapshot: BoardSnapshot = { tasks: [], history: [], nextSequence: 1 };
  private revision = 0;

  async currentRevision(): Promise<number> {
    return this.revision;
  }

  async read(wipLimit: number): Promise<{ state: BoardState; revision: number }> {
    return {
      state: Board.hydrate(this.snapshot, wipLimit).getState(),
      revision: this.revision,
    };
  }

  async run(
    wipLimit: number,
    work: (board: Board) => ActionResult,
  ): Promise<{ result: ActionResult; state: BoardState; revision: number }> {
    const board = Board.hydrate(this.snapshot, wipLimit);
    const result = work(board);
    if (result.status === "success") {
      this.snapshot = board.toSnapshot();
      this.revision += 1;
    }
    return { result, state: board.getState(), revision: this.revision };
  }
}
