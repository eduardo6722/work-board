import { z } from "zod";

import { taskSchema } from "./task.schema";

export const boardSchema = z.object({
  columns: z.object({
    todo: z.array(taskSchema),
    in_progress: z.array(taskSchema),
    done: z.array(taskSchema),
  }),
  wipLimit: z.number().int().positive(),
  canUndo: z.boolean(),
});

export type Board = z.infer<typeof boardSchema>;
