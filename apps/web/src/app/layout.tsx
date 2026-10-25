import type { Metadata } from "next";
import type { ReactNode } from "react";

import QueryProvider from "@/providers/query-provider";

import "./globals.css";

export const metadata: Metadata = {
  title: "Workboard — Your work, in flow",
  description:
    "A clear space to plan your tasks, find your focus, and move work forward.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
