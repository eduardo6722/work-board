import { z } from "zod";

export const apiErrorDetailSchema = z.object({
  path: z.string(),
  message: z.string(),
});

export type ApiErrorDetail = z.infer<typeof apiErrorDetailSchema>;

export const apiErrorSchema = z.object({
  statusCode: z.number().int(),
  error: z.string(),
  code: z.string(),
  message: z.string(),
  details: z.array(apiErrorDetailSchema).optional(),
});

export type ApiError = z.infer<typeof apiErrorSchema>;
