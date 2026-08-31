# Redline

[![CI](https://github.com/RachelBurman/redline/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/RachelBurman/redline/actions/workflows/ci.yml)

Redline is a structured document-review system for teams that need clear decisions,
version safety, and a defensible audit trail. It keeps a clean document beside a review
queue, so accepted, rejected, and unresolved proposals do not become tracked-change
clutter.

The repository contains the first complete vertical slice: an authenticated user can create
a workspace, upload a `.docx`, review its headings and paragraphs, propose a paragraph-level
replacement, deletion, or addition at the end of the document, accept or reject it, inspect
attributable decisions, filter and sort the review queue, hold a one-level threaded discussion
on a review proposal, securely invite reviewers, assign organisation members to an exact review
round, and export the resolved content as a new `.docx`, download the complete review queue as an
auditable CSV, or compare any two immutable versions in a clean block-based view.

## Implemented workflow

1. Sign up or sign in with Better Auth.
2. Use the sign-in page's **Forgot password?** link to request a one-hour reset link, or
   change a known password from the authenticated Account page.
3. Create an organisation-scoped workspace and default project.
4. Invite a reviewer by email. The recipient signs in or creates an account with that address,
   verifies it, and explicitly accepts the organisation invitation.
5. Assign eligible organisation members to the current document version's exact review round;
   owners, administrators, and editors can revoke an assignment without deleting its history.
6. Upload a `.docx` and store its immutable source bytes and SHA-256 digest.
7. Parse headings and paragraphs into ordered, version-owned document blocks.
8. Read the clean document alongside its review queue, filtered by reviewer, category, status,
   section, or priority and sorted by date, priority, or document order.
9. Create a paragraph replacement, deletion, or end-of-document addition with a category,
   priority, and rationale.
10. Add and read attributable proposal comments and direct replies in chronological threads; the
    first comment moves an open proposal under discussion, and every message is recorded in the
    audit chain.
11. Accept or reject the proposal through an authorised, transactional decision.
12. Keep accepted changes in a derived resolved preview until an authorised user explicitly
    creates the next immutable version.
13. Browse, download, and restore historical versions without deleting or rewriting history.
14. Compare any two versions by logical block, with added, changed, absent, and unchanged
    content clearly separated from the readable document.
15. Record invitations, assignments, uploads, proposals, comments, decisions, versions, restores,
    and exports in the append-only audit log.
16. Generate and download a basic resolved `.docx` from the current structured version.
17. Export the complete cross-version review queue as an Excel-compatible, formula-safe CSV.

Multiple participants can review the same document concurrently. The viewer shows active,
version-bound presence and refreshes proposals and the selected discussion in the background.
Decisions are serialised with PostgreSQL advisory locks and guarded by an expected revision, so
two competing decisions cannot both succeed. This is deliberately not a real-time word
processor: users collaborate through explicit proposals and decisions rather than directly
overwriting shared document text.

## Stack

- TanStack Start and Router on React 19
- TanStack Query, Form, Virtual, and Table
- TypeScript and Tailwind CSS 4
- PostgreSQL 17 with Drizzle ORM and generated SQL migrations
- Better Auth with organisation-scoped RBAC
- `fflate` and `fast-xml-parser` for isolated OOXML extraction
- `docx` for resolved-document generation
- Vitest and Testing Library
- Oxlint and Oxfmt (OXC), React Doctor, Lefthook, and GitHub Actions CI

All HTTP endpoints live under `/api/v1`. UI primitives are owned by the application and are
written as accessible, composable React components; there is no component-kit dependency.

## Prerequisites

- Node.js 22.12 or newer
- pnpm 11
- Docker Desktop, or a compatible PostgreSQL server

## Local setup

1. Install dependencies:

   ```bash
   pnpm install
   ```

2. Copy `.env.example` to `.env.local`. Set `POSTGRES_DB`, `POSTGRES_USER`, and a unique
   randomly generated `POSTGRES_PASSWORD`. Set `DATABASE_URL` using those values, and set
   `BETTER_AUTH_SECRET` to an independent cryptographically random value of at least 32
   characters. Never reuse or commit these credentials. `OBJECT_STORAGE_ROOT` is optional
   and defaults to `.data/object-storage`.

3. Start PostgreSQL and the local email inbox:

   ```bash
   docker compose --env-file .env.local up -d postgres mailpit
   ```

4. Apply all committed database migrations:

   ```bash
   pnpm db:migrate
   ```

5. Start the application:

   ```bash
   pnpm dev
   ```

The application runs at `http://localhost:3000`; the health endpoint is
`http://localhost:3000/api/v1/health`. In local development, password-reset, email-verification,
and reviewer-invitation messages are captured by Mailpit at `http://localhost:8025`; they are
never delivered to the public internet. The default SMTP settings in `.env.example` target that
loopback-only service.

A deployed environment must replace the Mailpit defaults with its transactional email
provider's `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD`, and
`SMTP_FROM` values. Store those values only in the deployment environment or its secret
manager.

The filesystem object-store adapter is suitable for local development. A deployed
environment should supply an implementation backed by private S3-compatible object storage
without changing the document or export workflows.

## Commands

| Command             | Purpose                                                 |
| ------------------- | ------------------------------------------------------- |
| `pnpm dev`          | Run the development server                              |
| `pnpm build`        | Create the production client and server bundles         |
| `pnpm verify`       | Run format, lint, types, tests, React Doctor, and build |
| `pnpm format:check` | Check repository formatting with Oxfmt                  |
| `pnpm lint`         | Lint with Oxlint and deny warnings                      |
| `pnpm typecheck`    | Type-check without emitting files                       |
| `pnpm test`         | Run unit and component tests once                       |
| `pnpm react-doctor` | Scan the React codebase and block on warnings           |
| `pnpm db:generate`  | Generate SQL from the Drizzle schema                    |
| `pnpm db:migrate`   | Apply committed migrations                              |
| `pnpm db:studio`    | Open Drizzle Studio                                     |

## Quality gates and CI

Lefthook checks staged-file formatting, lints staged source files, scans staged React code,
and runs the test suite before a commit. Before a push it runs the complete `pnpm verify`
gate. Commits follow Conventional Commits.

The GitHub Actions workflow in `.github/workflows/ci.yml` runs `pnpm verify` for pull requests
targeting `main` and for pushes to `main`. Third-party actions are pinned to full release
commit SHAs. CI generates an ephemeral Better Auth secret for each run and uses a
non-production PostgreSQL URL; it never reads or stores local development credentials. The
current suite does not connect to a live CI database, so database integration tests remain a
future quality-gate increment.

## Architecture

The code is separated into reusable layers so the review engine is not coupled to one
viewer:

```text
src/routes/              TanStack pages and versioned HTTP routes
src/features/            Page-level product composition
src/components/          One accessible component per file
src/domain/              Framework-independent review rules and anchors
src/server/documents/    Upload validation, parsing, and document reads
src/server/reviews/      Proposal, queue, and transactional decision workflows
src/server/exports/      Resolved-document generation and persistence
src/server/presence/     Ephemeral version-bound participant presence
src/server/reviewers/    Exact-round review assignment workflows
src/server/email/        Environment-backed transactional email delivery
src/server/storage/      Replaceable private object-store interface and local adapter
src/server/auth/         Authentication and organisation-scoped authorisation
src/server/audit/        Append-only audit-event creation
src/db/                  Drizzle schema and database connection
drizzle/                 Generated, reviewable PostgreSQL migrations
```

The persistence model includes organisations and users, projects, documents, immutable
document versions, ordered blocks, review rounds and assignments, review items, threaded
comments, resolutions, exports, ephemeral participant presence, and append-only audit
events.

### Version and selection safety

A review item belongs to an exact document version and block. Its anchor stores UTF-16 start
and end offsets, the exact selected quote, surrounding context, and the target block hash.
The server validates that anchor against immutable versioned content before accepting a
proposal.

Accepting a proposal does not edit an existing version or create a version implicitly. It
locks the document, checks the expected revision and selection anchor, records the accepted
resolution, and includes it in the derived resolved preview. An owner, administrator, or
editor must explicitly create the next version. That transaction materialises every accepted
replacement, omits every accepted deletion, and inserts every accepted new paragraph in
proposal order. It then closes the old review round, opens a new round, and marks unresolved
items from the old version as superseded rather than silently moving them.

Paragraph additions are anchored after the final block of the immutable source version. The
action remains available when accepted deletions leave the resolved preview empty, so a user
can delete all original content and still propose replacement paragraphs. Each addition is a
separate review item with its own decision, attribution, rationale, and audit events.
Creating the next version is blocked until at least one paragraph remains or an addition is
accepted, preventing an empty immutable version from losing its insertion anchor.

Reviewer membership and review work are separate decisions. Better Auth owns opaque organisation
invitations and requires the recipient's signed-in email to match and be verified before
acceptance. An assignment belongs to one review-round ID and therefore one immutable document
version; it is never carried automatically to a successor round. Only an open round on the
document's current version can be changed. Revocation timestamps the assignment row instead of
deleting it, and both assignment actions are appended to the audit chain.

Restoring is also non-destructive. Restoring version 1 while version 4 is current creates
version 5 with version 1's immutable blocks. The previous versions remain readable and
downloadable, the restore reason and provenance are stored with the new version, and the
action is appended to the audit chain. Downloads create audited exports but never versions.

Version comparison uses the stable key stored with each version-owned block. Matching keys
are classified as unchanged or changed; keys present in only one selected version are added
or absent. The result is a read-only comparison and does not modify either version or create
audit noise. Absent content is shown as a neutral, labelled record—not red text, a
strikethrough, or tracked-change markup. The same clean-document rule is the contract for the
deletion workflow: an accepted deletion is absent from the resolved preview and every
materialised successor version. Its original text, rationale, decision, attribution, and
content hash remain in the review queue, CSV report, and audit trail rather than appearing as
a permanent redline in the readable document.

### DOCX parsing and export

The parser is isolated from the UI. It validates the file type and ZIP signature, applies
compressed and uncompressed size limits, reads WordprocessingML, preserves content order,
and classifies headings through Word styles and outline levels. It flattens visible revision
text, omits deleted revision text, ignores empty layout paragraphs, and emits warnings or
unsupported-content placeholders instead of silently discarding tables or complex visuals.

Export is also isolated. It builds a new basic Word document from the current structured
blocks, stores it as a separate immutable object, records its digest and source version, and
appends an export audit event. It never modifies the uploaded source file.

Review queue export uses the same immutable export boundary. The CSV contains review and
version identifiers, original, proposed, and final text, category, priority, rationale,
status, action state, attribution, resolution metadata, timestamps, and discussion counts.
Potential spreadsheet formulas are neutralised before CSV encoding, and every generated
report is hashed and recorded in the audit log. UI filters affect only the visible queue; they
never silently narrow this complete audit export.

## Versioned API

| Endpoint                                                                         | Purpose                                  |
| -------------------------------------------------------------------------------- | ---------------------------------------- |
| `/api/v1/auth/*`                                                                 | Better Auth and organisation invitations |
| `/api/v1/workspace`                                                              | Read or initialise the user's workspace  |
| `/api/v1/reviewers`                                                              | List members and pending invitations     |
| `/api/v1/documents`                                                              | List documents or upload a `.docx`       |
| `/api/v1/documents/:documentId`                                                  | Read the structured current version      |
| `/api/v1/documents/:documentId/versions`                                         | List or explicitly create versions       |
| `/api/v1/documents/:documentId/versions/compare`                                 | Compare two immutable versions by block  |
| `/api/v1/documents/:documentId/versions/:versionId`                              | Read one immutable historical version    |
| `/api/v1/documents/:documentId/versions/:versionId/restore`                      | Restore history as a new version         |
| `/api/v1/documents/:documentId/versions/:versionId/exports`                      | Download an immutable version            |
| `/api/v1/documents/:documentId/review-rounds/:roundId/assignments`               | List or create exact-round assignments   |
| `/api/v1/documents/:documentId/review-rounds/:roundId/assignments/:assignmentId` | Revoke an active assignment              |
| `/api/v1/documents/:documentId/review-items`                                     | List or create proposals                 |
| `/api/v1/documents/:documentId/review-items/export`                              | Download the complete review queue CSV   |
| `/api/v1/documents/:documentId/review-items/:reviewItemId/comments`              | List or add comments and direct replies  |
| `/api/v1/documents/:documentId/review-items/:reviewItemId/resolve`               | Accept or reject a proposal              |
| `/api/v1/documents/:documentId/presence`                                         | Read or heartbeat participant presence   |
| `/api/v1/documents/:documentId/exports`                                          | Generate the current resolved `.docx`    |
| `/api/v1/health`                                                                 | Service health                           |

## Deployment status

Redline is not deployed to a production environment yet. The current Docker Compose service
and filesystem object store are development infrastructure only. Before a production launch,
the application needs a managed PostgreSQL database, private S3-compatible object storage,
environment-managed secrets, HTTPS and trusted-origin configuration, a migration release
step, backups, monitoring, and a documented recovery process. No production credentials or
deployment-specific values belong in this repository.

## Current boundaries

This slice proves the version-safe proposal workflow; it does not recreate Microsoft Word.
The UI currently supports paragraph-level replacements, deletions, and additions at the end
of a document. It does not yet insert between existing paragraphs. The visible queue can be
filtered and sorted without changing the complete audit CSV; section labels are derived from
the nearest preceding immutable heading. The schema and review domain leave room for questions,
assignment completion, due dates, and workload reporting, but those workflows are not presented
as finished features. Invitation cancellation and role changes also remain follow-up work. Tables
and complex Word layout are represented explicitly as unsupported content rather than rendered
inaccurately. Top-level comments and one level of direct replies can be submitted, audited, and
read with author attribution and timestamps. Replies to replies, editing comments, and resolving
discussion threads remain follow-up work.
Direct shared-text editing, CRDT/OT synchronisation, pagination, headers and footers, and
pixel-perfect Word rendering remain outside this MVP. Version comparison is block-based; it
does not yet calculate character-level diffs, classify moved blocks, or reproduce Word-style
redlines.

## Security and data safety

- Better Auth roles are organisation-scoped: owner, admin, editor, reviewer, viewer, and
  auditor.
- Reviewer invitations use Better Auth's opaque invitation IDs, require the signed-in email to
  match the recipient, and require verification before acceptance. Invitation emails and SMTP
  credentials are environment-backed.
- Forgotten-password requests return the same confirmation whether or not an account exists.
  Reset links expire after one hour, and a successful reset revokes every existing session.
- Password changes require the current password, enforce the configured 8–128 character
  boundary, use Better Auth's password hashing, and revoke every session except the current
  one.
- Upload type, size, archive expansion, and block-count limits are enforced on the server.
- Source files and exports live outside the web root under opaque object keys.
- Foreign keys use restrictive deletion for review and audit records.
- Audit events form a hash chain and PostgreSQL rejects updates or deletes.
- A review selection never silently relocates to a new document version.
- Version creation and restore require owner, administrator, or editor permissions and an
  expected-current-version check under a document-level PostgreSQL lock.
- Review decisions are authorised, revision-checked, locked, and committed atomically with
  their audit events.
- Review assignments are tenant-checked, restricted to eligible organisation members, serialised
  per round, and retained after revocation with corresponding immutable audit events.
- Dependency installation enforces a seven-day release maturity window and trust-downgrade
  checks, with narrow documented exceptions for established transitive packages.

Do not commit `.env.local`, uploaded documents, database volumes, or generated exports.
