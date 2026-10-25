type BoardIconProps = {
  name: "board" | "arrow" | "check" | "plus" | "undo" | "grip" | "leaf";
  className?: string;
};

const paths = {
  board: "M4 4h16v16H4z M9 4v16 M15 4v16",
  arrow: "M5 12h14 M13 6l6 6-6 6",
  check: "m5 12 4 4L19 6",
  plus: "M12 5v14 M5 12h14",
  undo: "M9 5 4 10l5 5 M4 10h10a6 6 0 0 1 0 12",
  grip: "M9 5h.01 M15 5h.01 M9 12h.01 M15 12h.01 M9 19h.01 M15 19h.01",
  leaf: "M5 19C2 8 10 3 21 3c0 11-5 19-16 16Zm0 0L16 8",
};

export default function BoardIcon({ name, className }: BoardIconProps) {
  return (
    <svg
      className={className}
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={name === "grip" ? 3 : 1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name]} />
    </svg>
  );
}
