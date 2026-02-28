# CONTRIBUTING (Packages)

## Scope

This policy applies to `packages/` and all descendants.
It supplements the repository root policy.

## Package Responsibilities

- Host reusable logic, contracts, and components shared by multiple apps.
- Keep package APIs explicit and stable.
- Prefer small, cohesive packages with clear ownership.

## Required Rules

- Packages must not depend on `apps/*`.
- Runtime-agnostic packages must not import runtime-only APIs.
- Expose behavior through typed interfaces and contracts.
- Avoid side effects at module import time.
- Include tests for non-trivial behavior and contract guarantees.

## API Change Rules

- Treat exported API changes as contributor-facing changes.
- Update docs and changelog entries when public package contracts change.

## Overrides to Root Policy

- Stricter dependency direction applies here: `packages/* -> apps/*` is forbidden.
