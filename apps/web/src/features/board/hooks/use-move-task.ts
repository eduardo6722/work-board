"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { moveTask } from "@/lib/api/board";

import { boardKeys } from "./board-query-keys";

export function useMoveTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, destination }: { id: string; destination: string }) =>
      moveTask(id, destination),
    onSuccess: (body) => {
      queryClient.setQueryData(boardKeys.state(), body.board);
    },
  });
}
