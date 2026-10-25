import { Injectable } from "@nestjs/common";

import { PrismaService } from "../../../../../shared/database/prisma.service";
import { Board } from "../../../domain/board";
import { type BoardRepository } from "../../../domain/repositories/board.repository";
import { type ActionResult, type BoardState } from "../../../domain/board.types";
import { BoardMapper } from "../mappers/board.mapper";

const BOARD_ID = "default";

@Injectable()
export class PrismaBoardRepository implements BoardRepository {
  constructor(private readonly prisma: PrismaService) {}

  async currentRevision(): Promise<number> {
    const meta = await this.prisma.boardMeta.findUnique({ where: { id: BOARD_ID } });
    if (!meta) {
      throw new Error("Board meta row is missing.");
    }
    return meta.revision;
  }

  async read(wipLimit: number): Promise<{ state: BoardState; revision: number }> {
    return this.prisma.$transaction(async (tx) => {
      const locked = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT id FROM board_meta WHERE id = ${BOARD_ID} FOR SHARE
      `;
      if (locked.length === 0) {
        throw new Error("Board meta row is missing.");
      }
      const meta = await tx.boardMeta.findUniqueOrThrow({ where: { id: BOARD_ID } });
      const tasks = await tx.boardTask.findMany();
      const history = await tx.boardHistoryEntry.findMany();
      return {
        revision: meta.revision,
        state: Board.hydrate(BoardMapper.toSnapshot(meta.nextSequence, tasks, history), wipLimit).getState(),
      };
    });
  }

  async run(
    wipLimit: number,
    work: (board: Board) => ActionResult,
  ): Promise<{ result: ActionResult; state: BoardState; revision: number }> {
    return this.prisma.$transaction(async (tx) => {
      const locked = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT id FROM board_meta WHERE id = ${BOARD_ID} FOR UPDATE
      `;
      if (locked.length === 0) {
        throw new Error("Board meta row is missing.");
      }

      const meta = await tx.boardMeta.findUniqueOrThrow({ where: { id: BOARD_ID } });
      const tasks = await tx.boardTask.findMany();
      const history = await tx.boardHistoryEntry.findMany();
      const board = Board.hydrate(BoardMapper.toSnapshot(meta.nextSequence, tasks, history), wipLimit);
      const result = work(board);
      const state = board.getState();

      if (result.status === "success") {
        const snapshot = board.toSnapshot();
        await tx.boardTask.deleteMany();
        await tx.boardHistoryEntry.deleteMany();
        if (snapshot.tasks.length > 0) {
          await tx.boardTask.createMany({ data: BoardMapper.toTaskRows(snapshot.tasks) });
        }
        if (snapshot.history.length > 0) {
          await tx.boardHistoryEntry.createMany({ data: BoardMapper.toHistoryRows(snapshot.history) });
        }
        const updated = await tx.boardMeta.update({
          where: { id: BOARD_ID },
          data: { nextSequence: snapshot.nextSequence, revision: { increment: 1 } },
        });
        return { result, state, revision: updated.revision };
      }

      return { result, state, revision: meta.revision };
    });
  }
}
