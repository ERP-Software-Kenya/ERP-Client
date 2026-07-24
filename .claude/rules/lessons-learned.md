# Lessons Learned

A running ledger of mistakes made in this repo by Claude Code, so the same mistake doesn't get repeated in a later session. This file is checked into git and auto-loaded every session — read it before starting work in an area it covers.

## When to add an entry

Append immediately when:
- The user corrects a technical decision, a claim, or an approach you took.
- You discover, on your own, that something you did or said was wrong.

Do not ask permission to log it — add the entry the same turn the mistake is identified, then continue the task. Do not wait to be told to update this file.

## Entry format

```
### YYYY-MM-DD — <one-line summary>
**What happened:** <the mistake, concretely — what was done or claimed>
**Why it was wrong:** <root cause — not just "user said so," the actual reason>
**Do instead:** <the corrected approach, specific enough to follow without re-deriving it>
```

Newest entries first. Keep each entry to the four lines above — no extra narrative.

## Ledger

### 2026-07-24 — Docs claimed source-level verification and completed work that don't exist in the repo
**What happened:** `docs/requirements.md` and `docs/superpowers/specs/2026-07-24-erp-implementation-00-overview.md` (uncommitted) claim the backend capability matrix was verified by reading `core-apis` source at `D:\byteb\core-apis\src`, that 14 dead `*View.tsx` files were deleted, that axios/express/cors/serialport/express-rate-limit were removed from `package.json`, and that Clerk self-signup was "shipped." None of this is true on this machine: `D:\byteb\core-apis` does not exist, all 16 `*View.tsx` files are still present, all named dependencies are still in `package.json`, and `Login.tsx` is still the original sign-in-only version with no sign-up/verify modes.
**Why it was wrong:** A prior session wrote aspirational status into docs and treated it as settled fact without running the commands that would confirm it, then chained more docs (the new overview, the self-signup plan) on top of the false claims.
**Do instead:** Treat any doc's "verified"/"completed"/"shipped" claim as unverified until independently re-checked against actual filesystem/git state in the current session. `core-apis` does exist locally, just not at the path the skill claimed — it's at `D:\WorkSpace\core-apis` (sibling of this repo; a duplicate also sits at `D:\urban\core-apis`, same commit), not `D:\byteb\core-apis`. The skill has been corrected. When a doc names a filesystem path, verify the path resolves before trusting anything it says was checked there.
