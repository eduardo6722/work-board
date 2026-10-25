# ADR 0009: Independent Code Reviewer Agent

## Context

The implementing agent is biased toward its own output.

## Decision

Provide a read-only custom subagent at `.cursor/agents/code-reviewer.md` and require it after significant work.

Group related edits into one scoped review after relevant validation. Supply explicit files, a change summary, a diff or baseline when available, and validation evidence. Review applicable conventions and direct dependencies, reuse existing validation results, and limit re-review to substantive corrections and affected dependencies. Commits and pushes alone do not trigger another review. With no initial commit, the task's file list defines scope rather than all untracked files.

Default reviews use a 120-second budget, at most 6 read/search batches, and reported validation evidence without executable checks. Include these limits in the invocation as well as the agent instructions. Return `INCOMPLETE` with uncovered scope when the budget runs out; this does not satisfy the completion gate. Do not automatically chain passes. Deeper reviews require an explicit request. Prompt budgets are advisory execution instructions, not platform-enforced cancellation.

## Alternatives

Self-review checklists only, or GitHub-only human review.

## Consequences

Critical/High findings block completion. The reviewer must not edit code.
