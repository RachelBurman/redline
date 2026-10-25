---
name: pre-pr-verification
description: Run and enforce Redline's complete local quality gate before pushing changes or opening or updating a pull request.
---

# Pre-PR verification

Use this skill whenever work is about to be pushed or a pull request is about to be opened or
updated.

1. Confirm dependencies are installed from `pnpm-lock.yaml`. Use `pnpm install --frozen-lockfile`
   when installation is needed.
2. Run `pnpm verify` from the repository root. This is the canonical full-repository gate and
   includes Oxfmt checking, Oxlint with warnings denied (including React Doctor and accessibility
   rules), TypeScript checking, tests, the full React Doctor scan with warnings blocked, and the
   production build.
3. Treat every non-zero exit, warning, or error as blocking. Diagnose and fix the underlying issue,
   rerun the relevant focused command while iterating, and rerun `pnpm verify` in full after the last
   fix.
4. Do not push, open, or update the pull request until the full gate passes. Never bypass Lefthook
   with `--no-verify`.
5. Report the passing commands, or the exact blocker and remaining diagnostics if verification
   cannot be completed.
