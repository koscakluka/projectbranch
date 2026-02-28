# CONTRIBUTING

## Scope

This policy applies to the entire repository unless a deeper `CONTRIBUTING.md`
in a subdirectory defines local overrides.

## Policy Hierarchy

When multiple policy files apply:

1. The nearest `CONTRIBUTING.md` to the changed file wins.
2. Parent directory policies apply as defaults.
3. Repository root policy is the fallback.

Local policies must clearly state their scope and overrides.

## Architecture Principles

- Design for portability across runtimes.
- Keep business and domain logic in shared packages, not app shells.
- Separate runtime-specific integration from runtime-agnostic logic.
- Prefer composition over duplication.

## Required Boundaries

- Shared domain logic belongs in shared modules or packages.
- Runtime adapters (filesystem, network, platform APIs) must be behind explicit interfaces.
- App directories should wire and compose shared modules, not own core business rules.
- Avoid direct coupling between shared modules and runtime-only APIs.

## Dependency Direction

- App layers may depend on shared packages.
- Shared packages must not depend on app layers.
- Runtime-specific adapters may depend on shared contracts, not vice versa.
- Do not create circular dependencies between packages.

## Security and Safety

- Use least-privilege access patterns for platform APIs.
- Validate untrusted input at boundaries.
- Avoid exposing broad runtime capabilities to UI layers.
- Keep secrets out of source control.

## Testing Expectations

For behavior changes, include tests at the most appropriate layer:

- Unit tests for pure and domain logic.
- Contract tests for adapter and interface behavior.
- App-level smoke or integration checks for user workflows.

If tests are skipped, explain why in the PR.

## Documentation Expectations

Update documentation when:

- Architecture boundaries change.
- Public APIs or contracts change.
- Contributor workflow changes.

Policy changes must be made in `CONTRIBUTING.md` files, not only in PR comments.

## Commit and PR Guidelines

- Keep commits focused by intent.
- Use conventional commit types where practical: `feat`, `fix`, `refactor`, `docs`, `deprecate`.
- PR descriptions should explain:
  - Why the change is needed.
  - What boundary or layer is affected.
  - How the change was verified.

## Prohibited Patterns

- Hidden cross-layer dependencies.
- App-only implementations of logic that should be shared.
- Unscoped architecture changes without policy updates.
- Unrelated formatting churn mixed into functional changes.
