import { apiErrorSchema, type ApiError } from "@repo/contracts";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export class ApiClientError extends Error {
  constructor(readonly payload: ApiError) {
    super(payload.message);
    this.name = "ApiClientError";
  }
}

export async function apiFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  const body: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const parsed = apiErrorSchema.safeParse(body);
    if (parsed.success) {
      throw new ApiClientError(parsed.data);
    }
    throw new ApiClientError({
      statusCode: response.status,
      error: response.statusText || "Error",
      code: "HTTP_ERROR",
      message: "The request failed",
    });
  }

  return body as T;
}
