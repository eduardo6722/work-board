# React component conventions

Required body order for project-owned function components:

states → library hooks → custom hooks → constants → functions → effects → return

Prefer `export default function ComponentName()`. Consult `.cursor/skills/create-react-component/SKILL.md` before creating or refactoring components. The Code Reviewer Agent flags violations unless a justified hooks-safety exception exists.
