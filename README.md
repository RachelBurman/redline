# Redline

Redline is a structured document-review system for teams that need clear decisions,
version safety, and a defensible audit trail. It keeps the document and its review queue
together without turning accepted, rejected, and unresolved proposals into tracked-change
clutter.

This repository currently contains the platform foundation and the first product shell. The
next delivery slice is the `.docx` upload-to-decision workflow described in
[Architecture](#architecture).

## Stack

- TanStack Start, Router, Query, and Form on React 19
- TypeScript and Tailwind CSS 4
- PostgreSQL 17 with Drizzle ORM and generated SQL migrations
- Better Auth with organisation-scoped RBAC
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
   characters. Never reuse or commit these credentials.

3. Start PostgreSQL:

   ```bash
   docker compose --env-file .env.local up -d postgres
   ```

4. Apply the database migration:

   ```bash
   pnpm db:migrate
   ```

5. Start the application:

   ```bash
   pnpm dev
   ```

The application runs at `http://localhost:3000`; the health endpoint is
`http://localhost:3000/api/v1/health`.

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
src/server/              Authentication, authorisation, and server workflows
src/db/                  Drizzle schema and database connection
drizzle/                 Generated, reviewable PostgreSQL migrations
```

The initial persistence model includes organisations and users, projects, documents,
immutable document versions, ordered blocks, review rounds and assignments, review items,
threaded comments, resolutions, exports, collaboration updates/snapshots, and append-only
audit events. Review items bind to a specific version and block. Their text anchors store
UTF-16 offsets, the exact selected quote, surrounding context, and the target block hash;
the review engine rejects a mutation when that versioned content no longer matches.

### First vertical slice

The first end-to-end product slice will be delivered in this order:

1. Store an uploaded `.docx` and its SHA-256 digest as an immutable source object.
2. Parse OOXML headings and paragraphs into ordered, version-owned document blocks.
3. Display those blocks in the document viewer.
4. Create a paragraph-level replacement proposal with category, priority, and rationale.
5. Accept or reject the proposal in one database transaction that also appends an audit event.
6. Materialise a new resolved document version; never rewrite the uploaded source version.
7. Export the resolved blocks to a basic `.docx`.

The parser will be an isolated server module. It will read `word/document.xml` and the styles
relationship from the ZIP package, preserve paragraph order, classify heading levels from
Word styles, normalise text runs, and emit explicit warnings or unsupported placeholders
instead of silently dropping content. Tables and complex Word layout are deliberately after
the heading-and-paragraph proof.

Real-time work will be added only after the versioned proposal flow is sound. The schema
already reserves sequenced collaboration updates and compacted snapshots; review decisions
remain transactional, authorised server operations with immutable audit records rather than
client-side collaborative edits.

## Security and data safety

- Better Auth roles are organisation-scoped: owner, admin, editor, reviewer, viewer, and
  auditor.
- Foreign keys use restrictive deletion for review and audit records.
- Audit events form a hash chain and the migration rejects updates or deletes.
- A review selection never silently relocates to a new document version.
- Uploaded files will be stored outside the web root and addressed by opaque object keys.
- Dependency installation enforces a seven-day release maturity window and trust-downgrade
  checks, with narrow documented exceptions for established transitive packages.

Do not commit `.env.local`, uploaded documents, database volumes, or generated exports.
