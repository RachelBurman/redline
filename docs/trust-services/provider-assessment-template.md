# Regulated trust-service provider assessment

This template is a release gate, not a list of approved providers. Complete it for one exact
provider, legal entity, service, API version, deployment region, assurance/profile combination,
jurisdiction set, and Redline use-case matrix. Attach dated evidence and name the independent
reviewer for every conclusion. A blank, self-attested, expired, or marketing-only answer blocks
selection.

## Decision record

| Field                                      | Required answer                       |
| ------------------------------------------ | ------------------------------------- |
| Provider legal entity and service          | Pending                               |
| API and evidence-package version           | Pending                               |
| Target jurisdictions and trust lists       | Pending counsel approval              |
| Document types and workflows               | Pending counsel and sponsor approval  |
| Requested assurance and signature profile  | Pending formal selection              |
| Deployment and evidence-storage regions    | Pending privacy and security approval |
| Assessment owner and independent reviewers | Pending                               |
| Evidence reviewed through                  | Pending                               |
| Decision and expiry/reassessment date      | Not selected                          |

## Legal and trust status

- Record the legal analysis for each jurisdiction, document type, party, sponsor, and workflow.
- Identify the authoritative trust list, supervisory body, qualified status where applicable,
  service identifiers, certificate policies, and how status is monitored over time.
- Map identity proofing, signer authentication, intent, sole control, signature-to-data binding,
  change detection, qualified certificate, and qualified device claims to dated independent
  evidence. Do not infer one claim from another.
- Record relying-party disclosures, consent wording, representation or delegation rules, witness or
  countersignature requirements, and exclusions.
- Document evidential weight, validation policy, limitation periods, retention, legal hold, and
  admissibility advice. Counsel owns the conclusion.

## Technical capability

- List supported PAdES, XAdES, CAdES, or other formats and exact baseline profiles. Record whether
  the output embeds the data needed for long-term validation.
- Demonstrate API support for transaction creation, immutable client references, redirects and
  embedding, cancellation, current-state retrieval, authenticated webhooks, evidence retrieval,
  rate limits, idempotency keys, sandbox parity, and versioning/deprecation terms.
- Document certificate chains, trusted timestamps, OCSP/CRL material, validation reports, identity
  evidence, audit records, and signed artefact exports, including formats and cryptographic digests.
- Record webhook algorithms, canonicalization, timestamp tolerance, replay identifiers, key
  rotation, source-network guidance, retry behavior, event ordering, and reconciliation APIs.
- Test provider timeout, partial failure, duplicate and out-of-order events, unavailable evidence,
  invalid or changed artefacts, key rotation, quota exhaustion, and regional failover.

## Security and operations

- Review independent audit and penetration-test reports, vulnerability disclosure, security
  contacts, incident-notification terms, secure-development practices, privileged access, tenant
  isolation, encryption, HSM/key custody, backup, recovery, and deletion.
- Define Redline and provider responsibilities for identity substitution, compromised accounts,
  certificate misuse, timestamp failure, revocation, evidence tampering, webhook forgery, provider
  compromise, and transaction reconciliation.
- Record SLA/SLOs, maintenance notice, support escalation, status telemetry, request correlation,
  retry limits, recovery objectives, evidence recovery tests, and key-compromise procedures.
- Require least-privilege scoped credentials per environment, documented rotation and revocation,
  and no production identity data in sandbox.

## Privacy and data governance

- Inventory every data field and artefact sent, generated, logged, backed up, or accessed by the
  provider and its subprocessors. Minimize identity data and raw evidence.
- Record controller/processor roles, purposes, lawful bases, retention and deletion behavior, data
  subject processes, audit access, legal holds, and breach terms.
- Identify all processing and support locations, subprocessors, international transfers,
  safeguards, government-access assessment, residency controls, and change-notification rights.
- Complete the applicable privacy and transfer impact assessments before any personal data leaves
  Redline.

## Accessibility and user support

- Test the exact hosted and embedded journeys with keyboard-only use, current screen readers, zoom,
  reflow, high contrast, reduced motion, language changes, session expiry, error recovery, and
  assisted signing.
- Record conformance reports and direct test results; a generic company accessibility statement is
  insufficient.
- Document alternate and support channels that preserve the required assurance and do not expose
  identity evidence to unauthorized Redline staff.

## Commercial terms and exit

- Model setup, ceremony, identity proofing, timestamp, validation, evidence storage/export, support,
  overage, regional, and termination costs at forecast and stress volumes.
- Require complete evidence and signed-artefact export in documented, independently verifiable
  formats with no continuing provider or Redline account dependency.
- Document bulk export, API throttling, migration assistance, data return and certified deletion,
  continued certificate/revocation availability, provider failure or acquisition, insolvency, and
  contract termination.
- Run and record a provider-exit exercise and an offline validation after account closure before
  approval.

## Sandbox acceptance evidence

Attach reproducible contract-test and independent-validation results for successful signing plus:

- invalid, revoked, and expired certificates;
- invalid or missing timestamp and unavailable revocation service;
- document bytes changed before and after signing;
- forged, replayed, same-ID/different-body, and out-of-order webhooks;
- provider timeout, rate limit, partial outage, lost callback, and delayed evidence;
- cross-tenant lookup and export attempts and least-privilege credential tests;
- backup restore, regional recovery, provider exit, and post-account-closure validation; and
- the accessibility review and remediation decision.

## Approval

Legal/compliance, security, privacy, accessibility, product, and operations must each record an
approver, scope, date, conditions, and expiry. Any material API, legal entity, subprocessor, trust
status, profile, jurisdiction, data-flow, or contract change reopens the assessment.
