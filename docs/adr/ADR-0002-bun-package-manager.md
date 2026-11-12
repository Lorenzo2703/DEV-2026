# ADR-0002: Use Bun as the package manager

- **Status:** Accepted
- **Date:** 2026-11-12

## Context

The project specification selected pnpm. The project owner requested Bun instead. Astro's project generator completed successfully when invoked with the locally installed Bun 1.3.10. Bun documents its text-based `bun.lock` as a lockfile to commit and provides frozen-lockfile installation for CI through `bun ci`.

## Decision

Use Bun for dependency installation, scripts, and CI. Pin the Bun version in `mise.toml`, commit `bun.lock`, and use `bun ci` in CI. Keep Astro's Node.js runtime requirement pinned separately.

## Consequences

- Local development and CI use the same Bun version and lockfile.
- Existing examples may still demonstrate npm, pnpm, or Yarn where comparing package managers is useful; Bun is the default for this repository.
- Revisit this decision only if compatibility or maintenance evidence warrants a new ADR.

## Sources

- [Bun lockfile documentation](https://bun.com/docs/pm/lockfile) — accessed 2026-11-12.
