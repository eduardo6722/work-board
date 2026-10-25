import { type CachePort } from "../../../../shared/cache/cache.port";
import { type BoardRepository } from "../../domain/repositories/board.repository";
import { type ActionResult, type BoardState } from "../../domain/board.types";
import { boardCacheKeys } from "../board-cache.keys";
import { BoardUnavailableError } from "../board-unavailable.error";

export class MoveTaskUseCase {
  constructor(
    private readonly repository: BoardRepository,
    private readonly wipLimit: number,
    private readonly cache: CachePort,
    private readonly ttlSeconds: number,
  ) {}

  async execute(
    id: string,
    destination: string,
  ): Promise<{ result: ActionResult; state: BoardState }> {
    try {
      const outcome = await this.repository.run(this.wipLimit, (board) => board.moveTask(id, destination));
      await this.remember(outcome);
      return outcome;
    } catch (error) {
      if (error instanceof BoardUnavailableError) {
        throw error;
      }
      throw new BoardUnavailableError("The board could not be saved.");
    }
  }

  private async remember(outcome: {
    result: ActionResult;
    state: BoardState;
    revision: number;
  }): Promise<void> {
    if (outcome.result.status !== "success") {
      return;
    }
    try {
      await this.cache.set(
        boardCacheKeys.state,
        { revision: outcome.revision, board: outcome.state },
        this.ttlSeconds,
      );
    } catch {
      return;
    }
  }
}
