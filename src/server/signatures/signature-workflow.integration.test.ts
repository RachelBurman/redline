import { randomUUID } from 'node:crypto'

import { Pool } from 'pg'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { db } from '#/db/index'

import { createSignatureRequest } from './create-signature-request'
import { declineSignatureRequest } from './decline-signature-request'
import { getSignatureEvidence } from './get-signature-evidence'
import { listSignatureRequests } from './list-signature-requests'
import { signSignatureRequest } from './sign-signature-request'
import { SignatureSlotNotFoundError } from './signature-errors'
import { supersedePendingSignatureRequests } from './supersede-signature-requests'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const ownerId = `signature-owner-${randomUUID()}`
const signerId = `signature-signer-${randomUUID()}`
const outsiderId = `signature-outsider-${randomUUID()}`
const ownerEmail = `signature-owner-${randomUUID()}@example.test`
const signerEmail = `signature-signer-${randomUUID()}@example.test`
const outsiderEmail = `signature-outsider-${randomUUID()}@example.test`
const organizationId = `signature-org-${randomUUID()}`
const outsiderOrganizationId = `signature-other-org-${randomUUID()}`
const projectId = randomUUID()
const documentId = randomUUID()
const documentVersionId = randomUUID()
const reviewRoundId = randomUUID()

async function cleanUp() {
  const client = await pool.connect()
  try {
    await client.query('begin')
    await client.query('alter table audit_event disable trigger audit_event_append_only')
    await client.query('delete from audit_event where organization_id = any($1::text[])', [
      [organizationId, outsiderOrganizationId],
    ])
    await client.query('alter table audit_event enable trigger audit_event_append_only')
    await client.query(
      'delete from signature_slot where signature_request_id in (select id from signature_request where document_id = $1)',
      [documentId],
    )
    await client.query('delete from signature_request where document_id = $1', [documentId])
    await client.query('delete from review_assignment where review_round_id = $1', [reviewRoundId])
    await client.query('delete from review_round where id = $1', [reviewRoundId])
    await client.query('delete from document_block where document_version_id = $1', [
      documentVersionId,
    ])
    await client.query('update document set current_version_id = null where id = $1', [documentId])
    await client.query(
      'update document_version set parent_version_id = null, restored_from_version_id = null where document_id = $1',
      [documentId],
    )
    await client.query('delete from document_version where document_id = $1', [documentId])
    await client.query('delete from document where id = $1', [documentId])
    await client.query('delete from project where id = $1', [projectId])
    await client.query('delete from member where organization_id = any($1::text[])', [
      [organizationId, outsiderOrganizationId],
    ])
    await client.query('delete from organization where id = any($1::text[])', [
      [organizationId, outsiderOrganizationId],
    ])
    await client.query('delete from "user" where id = any($1::text[])', [
      [ownerId, signerId, outsiderId],
    ])
    await client.query('commit')
  } catch (error) {
    await client.query('rollback')
    throw error
  } finally {
    client.release()
  }
}

beforeAll(async () => {
  await cleanUp()
  const client = await pool.connect()
  try {
    await client.query('begin')
    await client.query(
      `insert into "user" (id, name, email, email_verified)
       values ($1, 'Owner', $2, true),
              ($3, 'Required signer', $4, true),
              ($5, 'Outsider', $6, true)`,
      [ownerId, ownerEmail, signerId, signerEmail, outsiderId, outsiderEmail],
    )
    await client.query(
      `insert into organization (id, name, slug, created_at)
       values ($1, 'Signature Org', $2, now()), ($3, 'Other Org', $4, now())`,
      [
        organizationId,
        `signature-${randomUUID()}`,
        outsiderOrganizationId,
        `other-${randomUUID()}`,
      ],
    )
    await client.query(
      `insert into member (id, organization_id, user_id, role, created_at)
       values ($1, $2, $3, 'owner', now()),
              ($4, $2, $5, 'reviewer', now()),
              ($6, $7, $8, 'owner', now())`,
      [
        randomUUID(),
        organizationId,
        ownerId,
        randomUUID(),
        signerId,
        randomUUID(),
        outsiderOrganizationId,
        outsiderId,
      ],
    )
    await client.query(
      `insert into project (id, organization_id, name, created_by_id)
       values ($1, $2, 'Signature project', $3)`,
      [projectId, organizationId, ownerId],
    )
    await client.query(
      `insert into document (id, organization_id, project_id, title, created_by_id)
       values ($1, $2, $3, 'Final agreement', $4)`,
      [documentId, organizationId, projectId, ownerId],
    )
    await client.query(
      `insert into document_version
         (id, document_id, version_number, origin, status, created_by_id, published_at)
       values ($1, $2, 1, 'upload', 'ready', $3, now())`,
      [documentVersionId, documentId, ownerId],
    )
    await client.query('update document set current_version_id = $1 where id = $2', [
      documentVersionId,
      documentId,
    ])
    await client.query(
      `insert into document_block
         (id, document_version_id, stable_key, ordinal, block_type, text, content_hash, attributes)
       values ($1, $2, 'paragraph-1', 0, 'paragraph', 'Final text', $3, '{}'::jsonb)`,
      [randomUUID(), documentVersionId, 'a'.repeat(64)],
    )
    await client.query(
      `insert into review_round (id, document_id, document_version_id, name, created_by_id)
       values ($1, $2, $3, 'Final approval', $4)`,
      [reviewRoundId, documentId, documentVersionId, ownerId],
    )
    await client.query(
      `insert into review_assignment (id, review_round_id, reviewer_id, assigned_by_id)
       values ($1, $2, $3, $4)`,
      [randomUUID(), reviewRoundId, signerId, ownerId],
    )
    await client.query('commit')
  } catch (error) {
    await client.query('rollback')
    throw error
  } finally {
    client.release()
  }
})

afterAll(async () => {
  await cleanUp()
  await pool.end()
})

describe('signature workflow', () => {
  it('isolates tenants, prevents signing another slot, and completes repeated concurrent signing once', async () => {
    const created = await createSignatureRequest({
      context: { organizationId, projectId, role: 'owner', userId: ownerId },
      documentId,
      documentVersionId,
      scope: 'everyone',
      purpose: 'Approve this exact final version.',
    })
    expect(created.signers.map((signer) => signer.id)).toEqual([signerId])

    await expect(
      signSignatureRequest({
        context: { organizationId, projectId, userId: ownerId },
        documentId,
        signatureRequestId: created.id,
        idempotencyKey: randomUUID(),
        confirmed: true,
      }),
    ).rejects.toBeInstanceOf(SignatureSlotNotFoundError)

    const otherTenant = await listSignatureRequests({
      organizationId: outsiderOrganizationId,
      role: 'owner',
      userId: outsiderId,
      documentId,
      documentVersionId,
    })
    expect(otherTenant.requests).toEqual([])

    const [first, repeated] = await Promise.all([
      signSignatureRequest({
        context: { organizationId, projectId, userId: signerId },
        documentId,
        signatureRequestId: created.id,
        idempotencyKey: randomUUID(),
        confirmed: true,
      }),
      signSignatureRequest({
        context: { organizationId, projectId, userId: signerId },
        documentId,
        signatureRequestId: created.id,
        idempotencyKey: randomUUID(),
        confirmed: true,
      }),
    ])
    expect(new Set([first.repeated, repeated.repeated])).toEqual(new Set([false, true]))

    const evidence = await getSignatureEvidence({
      organizationId,
      role: 'reviewer',
      userId: signerId,
      documentId,
      signatureRequestId: created.id,
    })
    expect(evidence.request.status).toBe('completed')
    expect(evidence.content.verified).toBe(true)
    expect(evidence.signers).toHaveLength(1)
    expect(evidence.signers[0]).toMatchObject({
      id: signerId,
      status: 'signed',
      verifiedEmailAtSigning: signerEmail,
    })
    expect(
      evidence.auditEvents.filter((event) => event.eventType === 'signature.signed'),
    ).toHaveLength(1)
  })

  it('retains declined evidence and supersedes a later pending request when a new version is created', async () => {
    const declinedRequest = await createSignatureRequest({
      context: { organizationId, projectId, role: 'owner', userId: ownerId },
      documentId,
      documentVersionId,
      scope: 'everyone',
      purpose: 'Approve this exact final version.',
    })
    await declineSignatureRequest({
      context: { organizationId, projectId, userId: signerId },
      documentId,
      signatureRequestId: declinedRequest.id,
      reason: 'The approval wording needs revision.',
    })
    const declinedEvidence = await getSignatureEvidence({
      organizationId,
      role: 'reviewer',
      userId: signerId,
      documentId,
      signatureRequestId: declinedRequest.id,
    })
    expect(declinedEvidence.request.status).toBe('declined')
    expect(declinedEvidence.signers[0]?.declineReason).toBe('The approval wording needs revision.')

    const pendingRequest = await createSignatureRequest({
      context: { organizationId, projectId, role: 'owner', userId: ownerId },
      documentId,
      documentVersionId,
      scope: 'everyone',
      purpose: 'Approve this exact final version.',
    })
    const nextVersionId = randomUUID()
    await pool.query(
      `insert into document_version
         (id, document_id, parent_version_id, version_number, origin, status, created_by_id, published_at)
       values ($1, $2, $3, 2, 'checkpoint', 'ready', $4, now())`,
      [nextVersionId, documentId, documentVersionId, ownerId],
    )
    await db.transaction((tx) =>
      supersedePendingSignatureRequests(tx, {
        organizationId,
        projectId,
        documentId,
        previousDocumentVersionId: documentVersionId,
        newDocumentVersionId: nextVersionId,
        reviewRoundId,
        actorId: ownerId,
      }),
    )

    const supersededEvidence = await getSignatureEvidence({
      organizationId,
      role: 'reviewer',
      userId: signerId,
      documentId,
      signatureRequestId: pendingRequest.id,
    })
    expect(supersededEvidence.request).toMatchObject({
      status: 'superseded',
      supersededByVersionId: nextVersionId,
    })
  })
})
