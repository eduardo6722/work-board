# Code review workflow

```text
Requirements → Implementation → lint/typecheck/tests
  → code-reviewer subagent → fix → re-validate → re-review → complete
```

The implementing agent must invoke `.cursor/agents/code-reviewer.md` after meaningful backend, frontend, contract, or architecture work, and before declaring a major stage complete.

Do not spawn a reviewer for trivial typo edits. Group related files.

Run one review for each completed meaningful change after relevant validation, rather than after each edit, commit, or push. A commit or push alone does not invalidate a completed review. Substantive new changes and corrections may require another review.

## Review scope

The implementing agent supplies:

- Explicit changed files and a summary of the behavior before and after the change.
- A diff or baseline when available, such as a task-start commit or the PR merge base for a PR review.
- Relevant lint, typecheck, test, and build results, including failures and limitations.
- Earlier unresolved findings when requesting re-review.

If there is no initial commit, use the explicit task file list and change summary. All untracked files are not automatically part of the task. The reviewer requests missing scope from the implementing agent instead of starting a repository-wide scan.

The reviewer inspects changed sections, applicable rules, and directly related dependencies. Expand only for a concrete dependency or suspected defect. Backend-only work does not require frontend checks. Documentation-only work does not require application tests or builds.

Reuse existing validation evidence and label it as reported. The reviewer may run focused, read-only checks to resolve concrete concerns; the implementing agent owns commands that mutate artifacts or databases. Re-review covers corrections and affected dependencies while retaining unresolved findings. Reviewers must not recursively spawn more reviewers.

The custom agent is invoked by the implementing agent. The repository currently has no active Git hook or CI step invoking it on push; CI separately runs the validation commands in `.github/workflows/ci.yml`.

## Default review budget

The invoking agent includes a 120-second budget and a maximum of 6 read/search tool batches directly in the task message, along with the scope and existing validation results. The reviewer prioritizes correctness and security, batches reads, and runs no executable validation. It avoids lockfiles, generated output, dependency directories, and broad spec reads.

At the limit, the reviewer returns findings and explicitly lists uncovered scope as `INCOMPLETE`. This is not an approval and does not complete a required review task. Do not automatically chain additional passes; report the remaining scope for a separately requested continuation. A deeper review may use another explicitly requested budget.

These are instruction-level limits. A platform task deadline, where supported, is needed for guaranteed cancellation. An already-running task may retain its original prompt; editing these files does not cancel or restart it.

## Blocking findings

An implementation is incomplete while Critical or High findings remain. Medium findings must be fixed or explicitly justified. Low findings may remain as follow-ups.

The reviewer is read-only. The implementing agent applies fixes.
