-- CreateTable
CREATE TABLE "board_meta" (
    "id" TEXT NOT NULL,
    "next_sequence" INTEGER NOT NULL,
    "revision" INTEGER NOT NULL,

    CONSTRAINT "board_meta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "board_tasks" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "column" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,

    CONSTRAINT "board_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "board_history_entries" (
    "position" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "task_id" TEXT NOT NULL,
    "from_column" TEXT,
    "to_column" TEXT,

    CONSTRAINT "board_history_entries_pkey" PRIMARY KEY ("position")
);

-- CreateIndex
CREATE UNIQUE INDEX "board_tasks_sequence_key" ON "board_tasks"("sequence");
