import { randomUUID } from "node:crypto";

import { type CachePort } from "../../../../shared/cache/cache.port";
import { type BoardRepository } from "../../domain/repositories/board.repository";
import { type ActionResult, type BoardState } from "../../domain/board.types";
import { boardCacheKeys } from "../board-cache.keys";
import { BoardUnavailableError } from "../board-unavailable.error";

const MAX_ID_ATTEMPTS = 3;

export class CreateTaskUseCase {
  constructor(
    private readonly repository: BoardRepository,
    private readonly wipLimit: number,
    private readonly cache: CachePort,
    private readonly ttlSeconds: number,
  ) {}

  async execute(input: { title: string }): Promise<{ result: ActionResult; state: BoardState }> {
    try {
      const outcome = await this.repository.run(this.wipLimit, (board) => {
        for (let attempt = 0; attempt < MAX_ID_ATTEMPTS; attempt += 1) {
          const result = board.createTask(randomUUID(), input.title);
          if (result.code !== "duplicate_task_id") {
            return result;
          }
        }
        throw new BoardUnavailableError("The board could not be saved.");
      });
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
