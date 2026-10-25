# ADR 0010: Authentication excluded from the foundation

## Context

Phase 1 is an architecture boilerplate, not a product.

## Decision

Do not implement authentication, authorization, JWT, OAuth, Passport, or NextAuth. Document that mutation endpoints are unrestricted.

## Alternatives

Shipping a default auth stack now.

## Consequences

The reference API is local-only. Authentication is a Phase 2/3 concern and a production prerequisite.
