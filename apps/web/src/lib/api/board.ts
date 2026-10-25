import {
  apiErrorSchema,
  boardMutationSchema,
  boardSchema,
  type Board,
  type BoardMutation,
  type CreateTaskInput,
} from "@repo/contracts";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

const MUTATION_STATUSES = new Set([200, 201, 400, 404, 409]);

async function readJson(response: Response): Promise<unknown> {
  return response.json().catch(() => null);
}

async function parseMutation(response: Response): Promise<BoardMutation> {
  const body = await readJson(response);
  if (response.status === 503) {
    const unavailable = apiErrorSchema.safeParse(body);
    if (unavailable.success && unavailable.data.code === "BOARD_UNAVAILABLE") {
      throw new Error(unavailable.data.message);
    }
  }
  if (!MUTATION_STATUSES.has(response.status)) {
    throw new Error("Unexpected board response.");
  }
  const parsed = boardMutationSchema.safeParse(body);
  if (!parsed.success) {
    throw new Error("Unexpected board response.");
  }
  return parsed.data;
}

export async function getBoard(): Promise<Board> {
  const response = await fetch(`${API_URL}/api/v1/board`);
  const body = await readJson(response);
  const parsed = boardSchema.safeParse(body);
  if (!response.ok || !parsed.success) {
    throw new Error("The board could not be loaded.");
  }
  return parsed.data;
}

export async function createTask(input: CreateTaskInput): Promise<BoardMutation> {
  const response = await fetch(`${API_URL}/api/v1/tasks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: input.title }),
  });
  return parseMutation(response);
}

export async function moveTask(id: string, destination: string): Promise<BoardMutation> {
  const response = await fetch(`${API_URL}/api/v1/tasks/${encodeURIComponent(id)}/move`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ destination }),
  });
  return parseMutation(response);
}

export async function undo(): Promise<BoardMutation> {
  const response = await fetch(`${API_URL}/api/v1/board/undo`, { method: "POST" });
  return parseMutation(response);
}
