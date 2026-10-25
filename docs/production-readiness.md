# Production readiness gate

Redline is not production-ready until every required item below has an owner, evidence, and a
tested rollback or recovery path. This is a release gate, not a claim that the current repository
already supplies managed infrastructure.

## Application release

- Run `pnpm verify` and `pnpm audit --prod` from the exact release commit.
- Build once and promote the same immutable artifact between environments.
- Apply committed database migrations as a separate, observable release step before switching
  application traffic.
- Configure `BETTER_AUTH_URL` with the public HTTPS origin, a unique secret of at least 32
  characters, explicit `TRUSTED_ORIGINS`, and only the proxy ranges actually operated by the
  deployment platform.
- Keep `/api/v1/health` as the process liveness check and `/api/v1/ready` as the database-backed
  readiness check. Do not send traffic to an instance that returns `503` from readiness.

## Data and storage

- Replace the local filesystem adapter with private, encrypted S3-compatible object storage.
  Block public ACLs, use a deployment identity with prefix-scoped permissions, and retain source
  uploads and audit exports according to an approved policy.
- Use managed PostgreSQL with encryption, high availability, connection limits, and point-in-time
  recovery. Backups must be automated and restoration must be rehearsed into an isolated account.
- Define recovery-point and recovery-time objectives. Record the last successful database and
  object-store restoration exercise.
- Never copy production documents into development or CI.

## Monitoring and response

- Collect structured application, authentication, export, email, database, and object-store
  failures without logging document text, passwords, reset tokens, cookies, or connection URLs.
- Alert on readiness failures, elevated 5xx/403/429 rates, migration failures, database saturation,
  email delivery failure, storage errors, backup failure, and audit-chain write failure.
- Publish an incident runbook covering credential rotation, session revocation, database recovery,
  object recovery, and suspected audit tampering.
- Set retention and access controls for logs; test that authorised support staff can correlate an
  incident using request IDs and audit event IDs.

## Security sign-off

- Terminate TLS with modern policy, redirect HTTP to HTTPS, and confirm HSTS at the public edge.
- Run dependency, secret, SAST, and dynamic application scans against the release candidate.
- Complete an independent review of tenant isolation, invitation flows, assignment revocation,
  exports, object-store access, and proxy/header configuration.
- Verify least-privilege accounts, emergency access, key rotation, and removal of departed staff.
