"use client";

import { useQuery } from "@tanstack/react-query";

import { getBoard } from "@/lib/api/board";

import { boardKeys } from "./board-query-keys";

export function useBoard() {
  return useQuery({
    queryKey: boardKeys.state(),
    queryFn: getBoard,
  });
}
