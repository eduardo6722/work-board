"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { undo } from "@/lib/api/board";

import { boardKeys } from "./board-query-keys";

export function useUndo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: undo,
    onSuccess: (body) => {
      queryClient.setQueryData(boardKeys.state(), body.board);
    },
  });
}
