---
name: review-code
description: Starts an independent code review via the code-reviewer subagent. Use after significant implementation and before completing a development phase.
---

# Review code

Do not duplicate the reviewer prompt. Load `.cursor/agents/code-reviewer.md`.

1. Group related edits into a completed change. Skip trivial typo-only edits and do not repeat a review solely for a commit or push.
2. Prepare an explicit file list, change summary, diff or baseline when available, validation results, and previous unresolved findings. With no initial commit, use the task's file list and before/after summary; do not review every untracked file.
3. Identify applicable project rules and directly related dependencies. Avoid loading unrelated stack documentation.
4. Launch the `code-reviewer` subagent once as a read-only independent reviewer with that scope and evidence. Include this execution contract directly in the task message so a generic or already-loaded agent does not miss it: "Read `.cursor/agents/code-reviewer.md`. Budget: 120 seconds, at most 6 read/search batches. No executable validation or nested agents. Return findings and uncovered scope at the limit; use INCOMPLETE if unfinished. Do not automatically continue." It must not recursively invoke this skill or spawn reviewers. A user-requested deeper review may specify a different budget.
5. Summarize findings by severity.
6. Fix Critical, High, and unaccepted Medium issues.
7. Re-run only validation affected by corrections. The implementing agent owns commands that mutate artifacts or databases; the reviewer reuses supplied evidence unless a specific concern requires a focused, read-only check.
8. Request re-review after significant corrections, supplying the correction diff and earlier unresolved findings. Keep re-review focused on corrections and affected dependencies.

If the result is `INCOMPLETE`, report findings and uncovered scope promptly. Do not mark the feature or its review task complete, and do not chain more review passes automatically. Offer the next focused scope for a separately requested continuation. If the platform supports a task deadline, use it as well; prompt instructions alone cannot guarantee cancellation at 120 seconds.
