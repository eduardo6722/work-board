import { z } from "zod";

export const columnSchema = z.enum(["todo", "in_progress", "done"]);

const visibleTitle = z.string().refine((value) => value.trim().length > 0, {
  message: "Enter a visible title.",
});

export const taskSchema = z.object({
  id: z.string(),
  title: z.string(),
  column: columnSchema,
});

export const createTaskSchema = z.object({
  title: visibleTitle,
});

export const moveTaskSchema = z.object({
  destination: z.string(),
});

export type Task = z.infer<typeof taskSchema>;
export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type MoveTaskInput = z.infer<typeof moveTaskSchema>;
