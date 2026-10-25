"use client";

import { Button } from "@repo/ui/components/button";

import BoardIcon from "./board-icon";

type UndoButtonProps = {
  canUndo: boolean;
  onUndo: () => void;
};

export default function UndoButton({ canUndo, onUndo }: UndoButtonProps) {
  return (
    <Button
      variant="ghost"
      className="undo-button"
      type="button"
      disabled={!canUndo}
      onClick={onUndo}
    >
      <BoardIcon name="undo" /> Undo
    </Button>
  );
}
