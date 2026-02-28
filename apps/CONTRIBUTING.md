# CONTRIBUTING (Apps)

## Scope

This policy applies to `apps/` and all descendants.
It supplements the repository root policy.

## App Responsibilities

- Own runtime entrypoints, routing, platform wiring, and shell composition.
- Compose shared packages for domain, editor, and UI behavior.
- Keep app-specific code focused on integration concerns.

## Required Rules

- Do not place reusable business logic directly in app code when it belongs in shared packages.
- Do not import from one app into another app.
- Prefer extracting shared logic into `packages/*` rather than duplicating between apps.
- Keep platform-specific implementation details contained to the relevant app or runtime boundary.

## Overrides to Root Policy

- App-level runtime configuration is allowed here, but must not leak into shared packages.
