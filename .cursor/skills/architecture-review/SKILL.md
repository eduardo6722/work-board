---
name: architecture-review
description: Reviews module boundaries, dependency direction, and Clean Architecture purity. Use after adding features or changing package imports.
---

# Architecture review

1. Inspect changed files.
2. Check package and layer boundaries.
3. Verify domain imports nothing from Nest/Prisma/Redis/HTTP/contracts.
4. Verify use cases stay free of Prisma/Redis clients.
5. Flag unnecessary abstractions and leaked infrastructure.
6. Report findings with file paths.

Do not approve severe boundary violations.
