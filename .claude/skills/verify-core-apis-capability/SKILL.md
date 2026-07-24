---
name: verify-core-apis-capability
description: Use before building any UI against a core-apis resource — checks what the backend actually supports (list/create/update/delete) by reading core-apis source directly, not by trusting api.ts, types.ts, or a prior spec doc. Prevents building tables against endpoints that can't list, or forms for fields that don't exist.
---

# Verify core-apis Capability Before Building

`core-apis` lives at `D:\WorkSpace\core-apis` (sibling of `D:\WorkSpace\core-erp-client`; a duplicate checkout also exists at `D:\urban\core-apis`, same commit — use the `D:\WorkSpace` one). Its source is the only trustworthy answer to "does this endpoint support X" — not this repo's `api.ts` (which may be incomplete or wrong), not `types.ts` (matched against real responses but not exhaustive), not a spec doc (goes stale the moment core-apis changes), and not the deployed OpenAPI JSON (requires network access this environment may not have).

## The check

For a resource (e.g. `customers`), run from `D:\WorkSpace\core-apis`:

```bash
grep -oE "@(Get|Post|Put|Patch|Delete)\(" src/application/modules/<resource>/<resource>.controller.ts | sort -u
```

Then check whether a `Get` is a list or a get-by-id — the controller's route path disambiguates (`@Get(':id')` is get-by-id; `@Get()` or `@Get('search')`/`@Get('list')` is a list). Cross-check by looking for a `list-*`/`search-*` folder under `src/application/modules/<resource>/queries/`:

```bash
ls src/application/modules/<resource>/queries/
```

If there's no `list-<resource>` or `search-<resource>` folder, there is no list endpoint — full stop, regardless of what `@Get` decorators exist.

## Why this matters

Every "phantom feature" found in this repo so far (orphaned `Api.Users`/`Api.Reports` nav entries, `Vehicles` pointing at a nonexistent endpoint, 12 resources that silently can't ever populate a table) came from someone building UI against an assumed capability instead of a verified one. `docs/requirements.md` §2 has the full matrix as of 2026-07-24 — check there first, but if core-apis has changed since, re-run this check rather than trusting the doc; then fix the doc (see the repo's `auto-fix-stale` convention).

## When the answer is "no list endpoint exists"

Do not build a table with client-side pagination over repeated single-record fetches — it looks functional and silently only shows records you already have IDs for. Use the create-only pattern instead (see `add-create-only-resource-page` skill): a create form plus a get-by-id detail view, nothing more, and flag the missing list endpoint as a backend ask rather than working around it with a fragile client-side cache.
