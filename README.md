# Redline

Redline is a structured document-review system for teams that need clear decisions,
version safety, and a defensible audit trail. It keeps a clean document beside a review
queue, so accepted, rejected, and unresolved proposals do not become tracked-change
clutter.

The repository contains the first complete vertical slice: an authenticated user can create
a workspace, upload a `.docx`, review its headings and paragraphs, propose a paragraph-level
replacement, accept or reject it, inspect attributable decisions, and export the resolved
content as a new `.docx`.

## Implemented workflow

1. Sign up or sign in with Better Auth.
2. Create an organisation-scoped workspace and default project.
3. Upload a `.docx` and store its immutable source bytes and SHA-256 digest.
4. Parse headings and paragraphs into ordered, version-owned document blocks.
5. Read the clean document alongside its review queue.
6. Create a paragraph replacement with a category, priority, and rationale.
7. Accept or reject the proposal through an authorised, transactional decision.
8. On acceptance, materialise a new document version without changing the source version.
9. Record workspace, upload, proposal, decision, and export actions in the append-only audit
   log.
10. Generate and download a basic resolved `.docx` from the current structured version.

Multiple participants can review the same document concurrently. The viewer shows active,
version-bound presence and refreshes proposals in the background. Decisions are serialised
with PostgreSQL advisory locks and guarded by an expected revision, so two competing
decisions cannot both succeed. This is deliberately not a real-time word processor: users
collaborate through explicit proposals and decisions rather than directly overwriting shared
document text.

## Stack

- TanStack Start and Router on React 19
- TanStack Query, Form, Virtual, and Table
- TypeScript and Tailwind CSS 4
- PostgreSQL 17 with Drizzle ORM and generated SQL migrations
- Better Auth with organisation-scoped RBAC
- `fflate` and `fast-xml-parser` for isolated OOXML extraction
- `docx` for resolved-document generation
- Vitest and Testing Library
- Oxlint and Oxfmt (OXC), React Doctor, and Lefthook

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

3. Start PostgreSQL:

   ```bash
   docker compose --env-file .env.local up -d postgres
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
`http://localhost:3000/api/v1/health`.

The filesystem object-store adapter is suitable for local development. A deployed
environment should supply an implementation backed by private S3-compatible object storage
without changing the document or export workflows.

## Commands

| Command            | Purpose                                                 |
| ------------------ | ------------------------------------------------------- |
| `pnpm dev`         | Run the development server                              |
| `pnpm build`       | Create the production client and server bundles         |
| `pnpm verify`      | Run format, lint, types, tests, React Doctor, and build |
| `pnpm test`        | Run unit and component tests once                       |
| `pnpm db:generate` | Generate SQL from the Drizzle schema                    |
| `pnpm db:migrate`  | Apply committed migrations                              |
| `pnpm db:studio`   | Open Drizzle Studio                                     |

Lefthook formats and lints staged files and runs tests before a commit. Before a push it runs
the complete `pnpm verify` gate. Commits follow Conventional Commits.

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

Accepting a proposal does not edit an existing version. It locks the document, checks the
expected revision, copies the ordered blocks into a new checkpoint version, changes the one
targeted block, closes the old review round, and opens a new round. Other unresolved items
from the superseded version are marked as conflicts rather than silently moved to unrelated
text. Rejection records the resolution and audit event while leaving document content
unchanged.

### DOCX parsing and export

The parser is isolated from the UI. It validates the file type and ZIP signature, applies
compressed and uncompressed size limits, reads WordprocessingML, preserves content order,
and classifies headings through Word styles and outline levels. It flattens visible revision
text, omits deleted revision text, ignores empty layout paragraphs, and emits warnings or
unsupported-content placeholders instead of silently discarding tables or complex visuals.

Export is also isolated. It builds a new basic Word document from the current structured
blocks, stores it as a separate immutable object, records its digest and source version, and
appends an export audit event. It never modifies the uploaded source file.

## Versioned API

| Endpoint                                                           | Purpose                                 |
| ------------------------------------------------------------------ | --------------------------------------- |
| `/api/v1/auth/*`                                                   | Better Auth handlers                    |
| `/api/v1/workspace`                                                | Read or initialise the user's workspace |
| `/api/v1/documents`                                                | List documents or upload a `.docx`      |
| `/api/v1/documents/:documentId`                                    | Read the structured current version     |
| `/api/v1/documents/:documentId/review-items`                       | List or create proposals                |
| `/api/v1/documents/:documentId/review-items/:reviewItemId/resolve` | Accept or reject a proposal             |
| `/api/v1/documents/:documentId/presence`                           | Read or heartbeat participant presence  |
| `/api/v1/documents/:documentId/exports`                            | Generate the current resolved `.docx`   |
| `/api/v1/health`                                                   | Service health                          |

## Current boundaries

This slice proves the version-safe proposal workflow; it does not recreate Microsoft Word.
The UI currently supports paragraph-level replacements. The schema and review domain leave
room for insertions, deletions, questions, comments, threaded discussion, and richer review
queues, but those workflows are not presented as finished features. Tables and complex Word
layout are represented explicitly as unsupported content rather than rendered inaccurately.
Direct shared-text editing, CRDT/OT synchronisation, pagination, headers and footers, and
pixel-perfect Word rendering remain outside this MVP.

## Security and data safety

- Better Auth roles are organisation-scoped: owner, admin, editor, reviewer, viewer, and
  auditor.
- Upload type, size, archive expansion, and block-count limits are enforced on the server.
- Source files and exports live outside the web root under opaque object keys.
- Foreign keys use restrictive deletion for review and audit records.
- Audit events form a hash chain and PostgreSQL rejects updates or deletes.
- A review selection never silently relocates to a new document version.
- Review decisions are authorised, revision-checked, locked, and committed atomically with
  their audit events.
- Dependency installation enforces a seven-day release maturity window and trust-downgrade
  checks, with narrow documented exceptions for established transitive packages.

Do not commit `.env.local`, uploaded documents, database volumes, or generated exports.
