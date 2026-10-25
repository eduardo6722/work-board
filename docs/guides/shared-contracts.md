# Shared contracts guide

Put HTTP request/response schemas in `packages/contracts`. Infer types from Zod. Export through `src/index.ts`. Consume the same schemas in NestJS controllers and React Hook Form. Do not copy DTO classes into the API or duplicate interfaces in the web app.
