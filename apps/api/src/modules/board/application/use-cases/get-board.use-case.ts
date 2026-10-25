import { boardCacheKeys } from "../board-cache.keys";
import { BoardUnavailableError } from "../board-unavailable.error";
import { type CachePort } from "../../../../shared/cache/cache.port";
import { type BoardRepository } from "../../domain/repositories/board.repository";
import { type BoardState } from "../../domain/board.types";

type CachedBoard = {
  revision: number;
  board: BoardState;
};

export class GetBoardUseCase {
  constructor(
    private readonly repository: BoardRepository,
    private readonly wipLimit: number,
    private readonly cache: CachePort,
    private readonly ttlSeconds: number,
  ) {}

  async execute(): Promise<BoardState> {
    let cached: CachedBoard | null;
    try {
      cached = await this.cache.get<CachedBoard>(boardCacheKeys.state);
    } catch {
      cached = null;
    }

    let revision: number;
    try {
      revision = await this.repository.currentRevision();
    } catch (error) {
      if (error instanceof BoardUnavailableError) {
        throw error;
      }
      throw new BoardUnavailableError("The board could not be loaded.");
    }

    if (cached && cached.revision === revision) {
      return cached.board;
    }

    let loaded: { state: BoardState; revision: number };
    try {
      loaded = await this.repository.read(this.wipLimit);
    } catch (error) {
      if (error instanceof BoardUnavailableError) {
        throw error;
      }
      throw new BoardUnavailableError("The board could not be loaded.");
    }

    try {
      await this.cache.set(
        boardCacheKeys.state,
        { revision: loaded.revision, board: loaded.state },
        this.ttlSeconds,
      );
    } catch {
      return loaded.state;
    }
    return loaded.state;
  }
}
