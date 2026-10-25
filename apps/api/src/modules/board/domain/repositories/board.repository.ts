import { type Board } from "../board";
import { type ActionResult, type BoardState } from "../board.types";

export const BOARD_REPOSITORY = Symbol("BOARD_REPOSITORY");

export interface BoardRepository {
  currentRevision(): Promise<number>;
  read(wipLimit: number): Promise<{ state: BoardState; revision: number }>;
  run(
    wipLimit: number,
    work: (board: Board) => ActionResult,
  ): Promise<{ result: ActionResult; state: BoardState; revision: number }>;
}
