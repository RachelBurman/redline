# Threat model: regulated trust-service integration

Status: design baseline; independent security review required before implementation.

## Scope and assets

The boundary begins when an authorized Redline user requests a regulated signing ceremony for one
immutable document version. It includes artefact preparation and upload, signer hand-off, provider
callbacks and reconciliation, evidence retrieval, validation, export, retention, recovery, and
provider exit. The provider's identity-proofing and signing systems are external trust boundaries.

Protected assets are the document bytes and digest, tenant and signer identity, signing intent,
provider credentials and webhook keys, certificate and timestamp evidence, revocation state,
validation reports, audit history, and the truth of which assurance was actually achieved.

## Security invariants

- A transaction belongs to exactly one organisation, document version, signature request, content
  digest, provider, jurisdiction, and profile.
- Only an authorized intended signer can enter the provider ceremony; only authorized tenant users
  can request, cancel, view, validate, or export evidence.
- Provider messages cannot change canonical state until authenticated and reconciled with current
  provider state and the immutable binding.
- Completed or qualified labels require successful independent validation; absence, failure, or
  ambiguity is visible and fails closed.
- Evidence remains integrity-checkable and exportable without relying only on Redline's database or
  an active Redline account.

## Threats and required controls

| Threat                                           | Required preventive and detective controls                                                                                                                                                                                               | Required test or evidence                                                                           |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Identity substitution or account takeover        | Re-authentication appropriate to the approved profile; exact intended-signer binding; provider identity-proofing result references; no caller-selected signer ID; explicit version and purpose confirmation; anomalous ceremony alerting | Wrong-user, stale-session, changed-email, delegated-user, and recovered-account tests               |
| Signer loses sole control                        | Counsel-approved authentication and signing-device design; short-lived one-time hand-off; no reusable Redline proxy token; provider evidence for the approved sole-control claim                                                         | Link theft, replay, concurrent session, device change, and timeout tests                            |
| Document or request substitution                 | SHA-256 byte and canonical-content digests; tenant/document/version/request binding in local state and authenticated provider metadata; pre-upload and returned-artefact verification                                                    | Change bytes, metadata, request ID, version ID, and digest independently                            |
| Webhook forgery or replay                        | Verify exact raw bytes, timestamp and key ID; rotate keys; unique adapter/event ID plus payload digest; reject same ID with changed body; never trust callback tenant IDs; rate-limit and alert                                          | Forged signature, old timestamp, unknown key, replay, collision, and oversized-body tests           |
| Out-of-order, duplicated, delayed, or lost event | Durable inbox; idempotent atomic apply; fetch current provider state; monotonic terminal rules; bounded retry/dead letter; scheduled reconciliation                                                                                      | Permute and duplicate events, drop completion, delay evidence, and recover after outage             |
| Certificate misuse, expiry, or revocation        | Approved certificate policy and trust list; independent path and profile validation; retained OCSP/CRL and validation time; revalidation policy; fail closed on indeterminate results                                                    | Invalid chain, wrong policy, revoked, expired, unknown status, and trust-list change tests          |
| Timestamp failure                                | Validate token signature, authority, imprint, time, policy, and chain independently; retain token and validation material; distinguish signing, timestamp, and validation times                                                          | Invalid authority, changed imprint, expired chain, missing token, and unavailable service tests     |
| Provider compromise or dishonest status          | Do not treat callback/status as assurance proof; independently validate signed artefact and evidence; reconcile anomalies; support adapter disablement and incident revalidation                                                         | Status says complete with invalid artefact; compromised key exercise; bulk revalidation drill       |
| Evidence tampering or deletion                   | Digest every artefact; encrypted private object storage; append-only audit references; approved immutable retention and backups; access logging; portable export                                                                         | Alter, truncate, replace, delete, restore, export, and independently validate evidence              |
| Tenant crossover or confused deputy              | Adapter-scoped provider reference; organisation binding from stored transaction only; tenant-scoped authorization on every read/export; per-environment least-privilege credentials; non-enumerable errors                               | Cross-tenant IDs, provider refs, evidence keys, roles, and bulk-export tests                        |
| Secret, key, or token exposure                   | Secret manager/HSM as applicable; scoped credentials; redaction; no URLs or evidence in analytics; rotation and revocation; environment isolation                                                                                        | Log/trace review, repository scan, credential rotation, revoked-token, and sandbox isolation tests  |
| Sensitive identity evidence over-retention       | Field-level data inventory; policy-driven collection and raw-body retention; encryption; access separation; deletion and legal-hold workflows; subprocessor controls                                                                     | Retention expiry, deletion, legal hold, backup expiry, and unauthorized-support-user tests          |
| Provider outage, timeout, or exit                | Timeouts and circuit breaking; idempotent retries; reconciliation queue; explicit pending/failed UI; evidence export and offline validation; tested recovery and exit plan                                                               | Partial outage, rate limit, regional loss, backup restore, account closure, and provider-exit drill |
| Downgrade or misleading assurance                | Server-side allow-list for approved jurisdiction/profile/adapter combinations; preserve requested versus validated assurance; no fallback to baseline without a new explicit action                                                      | Unsupported profile, configuration tamper, failed validation, and UI terminology review             |
| Inaccessible hosted journey                      | Accessibility is a provider selection gate; alternate support path preserves assurance and privacy; monitor provider changes                                                                                                             | Independent keyboard, assistive-technology, zoom/reflow, timeout, and recovery review               |

## Abuse cases requiring design review

- An administrator starts a qualified transaction for a jurisdiction or document class outside the
  approved matrix.
- A provider reuses a transaction reference, changes authenticated metadata, or returns evidence
  for another customer.
- A completed provider status arrives after local cancellation, supersession, certificate
  revocation, or trust-service suspension.
- A support operator tries to retrieve raw identity evidence or a signed artefact without a tenant
  role that permits it.
- A validator, trust list, cryptographic algorithm, or profile becomes obsolete after long-term
  retention begins.
- Redline or the provider closes an account while a transaction is pending or evidence is under
  legal hold.

Each case needs an explicit state transition, alert owner, recovery procedure, and test before a
provider adapter can leave sandbox.

## Logging and response

Security logs include correlation IDs, adapter and transaction references, event digests,
verification and reconciliation outcomes, key IDs, validation result, authorization decision,
retry count, and evidence access. They exclude document content, secrets, hand-off URLs, raw
identity data, and certificate material beyond approved fingerprints.

Alerts cover authentication failure bursts, same event ID with a changed digest, unknown provider
transactions, immutable-binding mismatches, terminal-state regression, validation disagreement,
evidence integrity failure, reconciliation backlog, repeated cross-tenant attempts, trust-status
change, and key rotation failure. Incident response must support adapter shutdown, transaction
freeze, credential rotation, provider escalation, affected-evidence export and revalidation, tenant
notification, and preservation under legal hold.

## Residual risk and sign-off

The provider, identity-proofing process, supervisory regime, trust lists, client device, and legal
interpretation remain external dependencies. Cryptographic validity does not itself prove informed
intent, authority to sign, legal applicability, or accessibility. Those residual risks require the
documented legal, security, privacy, accessibility, and operational approvals in ADR 0003; this
threat model does not grant them.
