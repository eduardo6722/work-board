import { ConfigModule } from "@nestjs/config";
import { Test } from "@nestjs/testing";

import { validateEnv } from "../../../../../config/env.schema";
import { PrismaService } from "../../../../../shared/database/prisma.service";
import { PrismaBoardRepository } from "./prisma-board.repository";

describe("PrismaBoardRepository", () => {
  let prisma: PrismaService;
  let repository: PrismaBoardRepository;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          validate: validateEnv,
        }),
      ],
      providers: [PrismaService, PrismaBoardRepository],
    }).compile();

    prisma = moduleRef.get(PrismaService);
    repository = moduleRef.get(PrismaBoardRepository);
    await prisma.$connect();
    await resetBoard(prisma);
  });

  afterAll(async () => {
    await resetBoard(prisma);
    await prisma.$disconnect();
  });

  it("reads tasks and undo history from a second repository instance", async () => {
    await repository.run(2, (board) => board.createTask("A", "First"));
    await repository.run(2, (board) => board.createTask("B", "Second"));
    await repository.run(2, (board) => board.moveTask("B", "in_progress"));

    const second = new PrismaBoardRepository(prisma);
    const state = (await second.read(2)).state;

    expect(state.columns.todo.map((task) => task.title)).toEqual(["First"]);
    expect(state.columns.in_progress.map((task) => task.title)).toEqual(["Second"]);
    expect(state.canUndo).toBe(true);

    const undone = await second.run(2, (board) => board.undo());
    expect(undone.result.code).toBe("undo_success");
    expect(undone.state.columns.todo.map((task) => task.title)).toEqual(["First", "Second"]);
    expect(undone.state.columns.in_progress).toEqual([]);
  });

  it("does not insert a task or bump the revision when create is refused", async () => {
    await resetBoard(prisma);
    await repository.run(2, (board) => board.createTask("A", "First"));
    const revision = await repository.currentRevision();
    const before = await prisma.boardTask.count();

    const refused = await repository.run(2, (board) => board.createTask("B", "   "));

    expect(refused.result.code).toBe("validation_error");
    expect(await repository.currentRevision()).toBe(revision);
    expect(await prisma.boardTask.count()).toBe(before);
  });
});

async function resetBoard(prisma: PrismaService): Promise<void> {
  await prisma.boardHistoryEntry.deleteMany();
  await prisma.boardTask.deleteMany();
  await prisma.boardMeta.upsert({
    where: { id: "default" },
    create: { id: "default", nextSequence: 1, revision: 0 },
    update: { nextSequence: 1, revision: 0 },
  });
}
