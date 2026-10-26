# ADR 0003: Keep regulated signatures behind a provider-neutral trust-service boundary

- Status: Accepted architecture; provider selection and production use are blocked
- Date: 2026-10-26
- Issue: [#11](https://github.com/RachelBurman/redline/issues/11)

## Context

Redline has an application-level electronic sign-off workflow. It records authenticated intent,
verified email, UTC timestamps, an immutable version-content hash, and audit evidence. It does not
issue certificates or claim Advanced Electronic Signature (AdES) or Qualified Electronic Signature
(QES) assurance.

EU eIDAS Articles 25 and 26 and the UK-retained eIDAS text are the authoritative legal starting
points, not an engineering checklist. Applicability depends on jurisdiction, document type, parties,
workflow, and current law. A provider's marketing label is not proof that a particular Redline
transaction achieved an assurance level.

Before implementation, counsel must approve a written use-case matrix covering the target
jurisdictions, sponsors, document types, clinical or research workflows, signature tier,
terminology, disclosures, and retention. Security and privacy reviewers must independently approve
the threat model, identity-proofing approach, provider terms, data flows, and exit plan.

## Decision

Regulated signatures will be a separate bounded context called `trust-services`. Baseline sign-off
remains the default product vocabulary and data model. No existing baseline signature can be
upgraded, relabelled, or inferred to be AdES or QES.

The application-owned domain uses only these assurance requests:

- `advanced`: a request for the selected provider to execute the approved AdES profile;
- `qualified`: a request for the selected provider to execute the approved QES profile.

The assurance actually displayed to a user must come from independent validation of the exported
signed artefact and evidence, not merely the requested tier or a provider callback. Invalid,
indeterminate, expired, revoked, or unvalidated evidence must never be presented as achieved AdES or
QES.

`TrustServiceAdapter` defines request creation, redirect or embedded signer hand-off, current-state
retrieval, cancellation, webhook authentication and normalization, and evidence retrieval. Provider
statuses are retained as evidence but mapped to Redline's canonical lifecycle:

`created`, `awaiting-signer`, `processing`, `completed`, `declined`, `cancelled`, `expired`, or
`failed`.

Provider-specific values must not enter permissions, workflow rules, UI decisions, or audit event
names. A new provider must pass the same contract and sandbox suites without changing that
vocabulary.

## Immutable binding

Every provider transaction is bound at creation to all of:

- organisation and project ID;
- document and immutable document-version ID;
- Redline signature-request ID; and
- the canonical SHA-256 version-content digest.

Those values are sent as authenticated provider metadata when the selected provider supports it and
are always stored locally. Current-state responses and evidence packages must repeat the binding.
Redline rejects a mismatch before changing canonical state or storing evidence. A changed document
requires a new immutable version and a new transaction.

The provider receives the exact artefact selected by the approved profile. Its byte digest is
calculated before upload and recorded in the transaction. The provider-returned signed artefact must
be independently checked against that digest and the embedded signature before completion is
reported.

## Persistence model for a regulated release

The later implementation will add separate tables rather than fields on baseline sign-off:

| Record                    | Required content                                                                                                                                                                                                                           |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Trust-service transaction | Tenant and immutable binding, adapter ID, provider transaction ID, requested profile and jurisdiction, canonical and original provider status, timestamps, failure code, and revision                                                      |
| Signer ceremony           | Redline signer ID, provider signer reference, hand-off mode, authentication and identity-proofing result references, consent text/version, and ceremony timestamps                                                                         |
| Webhook inbox             | Adapter and event IDs, provider transaction ID, payload digest, verification result, received/processed timestamps, retry count, and encrypted raw body only when approved by policy                                                       |
| Evidence package          | Provider and transaction IDs, signed artefact digest, certificate chain, trusted timestamps, validation result/time, revocation or expiry evidence, signature profile, jurisdiction, export objects, retention class, and integrity digest |
| Validation run            | Validator/version, input digests, trust list and policy snapshot identifiers, result, diagnostics, and timestamp                                                                                                                           |

Provider transaction IDs and event IDs are unique within an adapter. Tenant-scoped access checks
remain mandatory even when a provider reference is known. Evidence objects use private encrypted
storage, least-privilege service credentials, immutable retention where required, and audited reads.
No raw identity document or callback body is retained unless the approved policy identifies a
purpose, lawful basis, access group, region, and deletion schedule.

## Callback and recovery protocol

1. The adapter authenticates the exact raw request body and relevant headers using the provider's
   approved algorithm. It validates timestamp tolerance, key identity, and key rotation before
   parsing business data.
2. Redline resolves the adapter-scoped provider transaction to its stored immutable binding. An
   unknown transaction is rejected and logged without accepting a tenant ID from the callback.
3. The inbox atomically inserts `(adapter ID, provider event ID, payload digest)`. The same event and
   digest is an idempotent replay; the same event ID with a different digest is a security alert.
4. Raw callback bytes are encrypted and retained only when policy permits. The digest, verification
   result, and operational metadata are retained for the approved period.
5. A retryable worker fetches current provider state instead of treating event order as truth. This
   makes delayed and out-of-order events converge on the provider's current state.
6. Before applying state, Redline compares the provider response with the stored binding. Completed
   state also triggers evidence retrieval and binding checks. The state, event, and evidence
   references are committed atomically with an audit event.
7. Failed work remains observable and retryable with bounded exponential backoff and a dead-letter
   alert. A scheduled reconciler checks non-terminal transactions directly with the provider so a
   lost callback cannot strand a request.

The code in `src/server/trust-services` supplies the adapter contract, binding guard, authenticated
intake boundary, and reconciliation algorithm. It deliberately supplies no route, provider adapter,
database migration, UI, or production flag.

## Validation and portability

The selected signature format and profile are decisions of the approved use-case and provider
assessment. PAdES is a candidate only where a signed PDF is required; this ADR does not select it.

Before release, the sandbox proof of concept must:

- create and sign an immutable, non-sensitive test artefact;
- export the signed artefact, certificate chain, timestamps, revocation material, provider evidence,
  and validation report;
- validate them using an independent validator and an archived policy or trust-list reference;
- repeat validation after disabling the Redline account and without calling Redline's database;
- exercise invalid, revoked, and expired certificates, invalid timestamps, a changed document,
  replayed and out-of-order callbacks, provider timeout, and lost-callback reconciliation; and
- prove tenant isolation and least privilege for every evidence read and export.

The exit plan must document bulk export, stable formats, verification instructions, escrow or
retention obligations, provider termination assistance, and a disaster-recovery restore test.
Redline's database is an index and audit source, not the only means of verification.

## User experience

The interface must use three distinct labels:

- **Electronic sign-off** for the existing application-level workflow;
- **Advanced electronic signature (AdES)** only for independently validated advanced evidence; and
- **Qualified electronic signature (QES)** only for independently validated qualified evidence.

Requested, in progress, failed, indeterminate, and validated are separate states. Provider-hosted
redirect and embedded journeys require keyboard, screen-reader, zoom, reflow, language, timeout,
error-recovery, and assisted-use review. An inaccessible provider journey blocks selection even if
its API is otherwise suitable.

## Release gates

There is no production feature flag in this decision. Adding one is prohibited until the repository
contains links to independently approved records for:

1. legal use cases, jurisdiction and terminology;
2. provider assessment and contract;
3. privacy impact and transfer assessment;
4. threat model and penetration test;
5. sandbox contract, negative-path, accessibility, recovery, and exit tests; and
6. operational ownership, incident response, key rotation, retention, and reconciliation alerts.

Approval must identify the exact adapter version, assurance/profile combination, jurisdiction,
document class, and deployment region. Approval for one combination does not enable another.

## Consequences

Redline can evaluate and replace providers without letting their vocabulary become canonical. The
immutable binding and portable evidence model reduce document-substitution and provider-lock-in
risk. Webhook processing is authenticated, replay-aware, idempotent, retryable, and convergent by
design.

The boundary alone provides no legal status, assurance level, or production feature. Provider
selection, database implementation, end-to-end sandbox proof, independent validation, and formal
approvals remain future gated work.

## References

- [EU eIDAS Regulation, consolidated text](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:02014R0910-20241018), especially Articles 25–26
- [UK-retained eIDAS, Chapter III](https://www.legislation.gov.uk/eur/2014/910/chapter/III)
- [Provider assessment template](../trust-services/provider-assessment-template.md)
- [AdES/QES integration threat model](../trust-services/threat-model.md)
