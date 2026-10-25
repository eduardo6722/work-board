import Link from "next/link";
import { type ReactNode } from "react";

import BoardIcon from "./board-icon";

export default function BoardShell({ children }: { children: ReactNode }) {
  return (
    <div className="workspace">
      <a className="skip-link" href="#main-content">
        Skip to board
      </a>
      <aside className="workspace-sidebar" aria-label="Workspace">
        <Link className="workspace-brand" href="/" aria-label="Workboard home">
          <span className="brand-mark">
            <BoardIcon name="board" />
          </span>
          workboard<span className="brand-period">.</span>
        </Link>
        <div className="workspace-label">YOUR WORKSPACE</div>
        <nav aria-label="Main navigation">
          <a className="sidebar-link" href="#main-content" aria-current="page">
            <BoardIcon name="board" /> My board <span className="nav-active-dot" />
          </a>
        </nav>
        <div className="sidebar-note">
          <span className="note-icon">
            <BoardIcon name="leaf" />
          </span>
          <p>
            A little focus.
            <br />A lot of progress.
          </p>
          <span>Keep your work in motion, one task at a time.</span>
        </div>
        <div className="sidebar-footer">
          <span className="workspace-monogram">W</span>
          <div>
            Personal workspace<small>A space for your best work</small>
          </div>
        </div>
      </aside>
      <div className="workspace-content">
        <div className="workspace-topbar">
          <span>
            Workspace <span className="breadcrumb-divider">/</span>{" "}
            <strong>My board</strong>
          </span>
          <span className="topbar-caption">Less noise. More focus.</span>
        </div>
        <main id="main-content" className="board-main" tabIndex={-1}>
          {children}
        </main>
      </div>
    </div>
  );
}
