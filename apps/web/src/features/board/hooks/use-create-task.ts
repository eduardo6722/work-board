"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { createTask } from "@/lib/api/board";

import { boardKeys } from "./board-query-keys";

export function useCreateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createTask,
    onSuccess: (body) => {
      queryClient.setQueryData(boardKeys.state(), body.board);
    },
  });
}
