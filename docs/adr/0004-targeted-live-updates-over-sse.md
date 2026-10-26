# ADR 0004: Deliver targeted collaboration invalidations over Server-Sent Events

- Status: Accepted for beta
- Date: 2026-10-26
- Issue: [#13](https://github.com/RachelBurman/redline/issues/13)

## Context and measured baseline

The review workspace previously refreshed independent resources on fixed timers. With the document,
review queue, version history, one discussion, assignments, signatures, and presence visible, one
active browser could make up to 62 read requests per minute, plus six presence heartbeats. The
worst-case stale windows were 3 seconds for comments, 5 seconds for assignments and presence, 10
seconds for proposals and signatures, 15 seconds for the document, and 30 seconds for versions.
More open browsers multiplied the read load even when nothing changed.

Redline only needs a notification that authoritative state changed. It does not need a shared-text
protocol: document blocks and versions remain immutable, while proposals, comments, assignments,
decisions, and signatures continue through permission-checked transactional HTTP APIs.

## Transport decision

Use authenticated Server-Sent Events (SSE) at
`/api/v1/documents/:documentId/events`. SSE fits the current one-way server-to-browser flow, works
through ordinary HTTP infrastructure, uses the existing same-origin session cookie, has a small
browser API, and is directly inspectable in HTTP logs. WebSockets would add a separate upgrade and
connection lifecycle, bidirectional message authorization, heartbeat protocol, proxy configuration,
and operational tooling without a current client-to-server streaming requirement.

The trade-off is that an SSE connection occupies an HTTP connection and cannot carry custom browser
headers. Production infrastructure must therefore support streaming responses without buffering,
forward cookies, and use HTTP/2 where possible. If future workflows require genuinely bidirectional
low-latency messages, this ADR must be revisited rather than tunnelling commands through SSE.

## Event and persistence model

Each relevant audited mutation writes a `live_event` row in the same database transaction. Presence
joins and version or selection changes write the same metadata-only record without entering the
durable audit chain; routine heartbeats do not create fan-out events. An event contains only:

- event UUID and monotonically increasing server cursor;
- organisation, document, optional immutable version, review round, and review item IDs;
- actor ID, event type, and server timestamp.

It never contains manuscript text, proposal text, comment bodies, signature evidence, email
addresses, or audit payloads. The browser treats the event only as an invalidation hint and refetches
the authoritative resource from its permission-checked API. An event can therefore neither perform
a mutation nor duplicate a proposal, comment, decision, signature, or notification.

Events are read in cursor order. A reconnect supplies the last processed cursor and replays later
rows, including after a process restart. The client ignores cursors it has already processed, so
duplicates and reordering are harmless. A fresh subscription starts at the latest global cursor and
loads current state through the normal queries. Beta retains all live-event rows; a retention job may
be introduced only with an explicit gap message that forces a full refetch.

On the first `system.ready` message, the browser invalidates every document-scoped query once. This
closes the race between the initial HTTP reads and establishment of the live cursor; later reconnects
resume from the last processed cursor without another broad refetch.

## Authorization and revocation

Subscription performs both tenant/document scoping and the existing exact-version assignment check.
The server revalidates the authenticated session, active organisation, role, and document access at
most every 5 seconds. Assignment, membership, or session revocation therefore stops further delivery
within 5 seconds plus an in-flight database call. Streams rotate every 25 seconds to bound stale
connections and exercise resume behavior.

Every database query also filters by both organisation and document. Knowing another tenant's UUID
cannot reveal whether it has events. Cross-tenant and unassigned subscriptions fail with the same
document-access response used by the versioned APIs.

## Client behavior and fallback

The browser reconnects with jittered exponential backoff from 1 second up to 30 seconds and resumes
from its highest cursor. While connected, proposal, discussion, assignment, signature, document, and
version polling is disabled. The existing timers resume whenever the stream is unavailable. Presence
keeps its 10-second write heartbeat because expiry is server-controlled; it performs a 35-second read
while live so a participant who closes a browser still expires from the UI.

Invalidations update TanStack Query caches in place. They do not remount the workspace, move focus,
clear form state, change scroll position, or close dialogs. A debounced polite live region announces
meaningful proposal, discussion, assignment, version, and signature changes; presence heartbeats are
intentionally silent.

## Operations and beta limits

The initial adapter tails PostgreSQL once per connected stream per second. Beta is capped at 50 live
document connections per application instance and 10 connections to one document. Before raising
either limit, replace per-connection reads with a measured fan-out mechanism (for example PostgreSQL
notifications plus cursor catch-up) and repeat the load test.

Structured logs record connection opens, resumptions, duration, and failures without event payloads.
Production dashboards must derive active connections, reconnect rate, failures, and stream duration;
event timestamps and receipt times provide delivery latency. Alerts are required for sustained
failure/reconnect growth or p95 delivery above 2 seconds.

The authenticated load harness opens 50 streams, triggers a presence invalidation, and requires every
client to receive it within 5 seconds. Run it against a migrated test deployment with:

```text
LIVE_LOAD_URL=... LIVE_LOAD_COOKIE=... LIVE_LOAD_DOCUMENT_ID=... LIVE_LOAD_VERSION_ID=... pnpm test:live-load
```

Release testing also includes tenant/assignment authorization, cursor resume and duplicate handling,
session/assignment revocation, process restart, two-browser proposal/comment/assignment flows, and
keyboard/focus/accessibility checks. Network-offline browser coverage proves polling resumes when SSE
is unavailable.

## Explicit boundary

This design does not send document text, accept mutations over the stream, merge concurrent text,
or introduce CRDT/OT state. Redline remains a structured review system: users collaborate through
explicit proposals, discussions, assignments, decisions, immutable versions, and signatures.
