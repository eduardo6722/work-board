# ADR 0011: GitHub Spec Kit

## Context

Phase 2 needs a spec-driven workflow before real product features are implemented. The repository already has architecture rules, Cursor skills, and a reference slice. It does not yet have product requirements.

## Decision

Initialize GitHub Spec Kit 1.2.3 in place with the Cursor integration (`cursor-agent`) and bash scripts. Keep generated files under `.specify/` and `.cursor/skills/speckit-*`. Leave the constitution as the upstream template until `/speckit-constitution` is run from principles that are already true. Do not invent feature specifications during setup.

The Specify CLI stays a host install via uv. It is not added to the pnpm workspace.

## Alternatives

Wait until a product brief exists before installing the toolkit. Install only shared scaffolding with `--integration none`. Vendor Spec Kit templates by hand.

## Consequences

Agents can run Spec Kit skills in Cursor without recreating the project. Product scope stays undefined until a constitution and feature specs are written. Generated skills and templates should be updated with the Specify CLI rather than edited in place.
