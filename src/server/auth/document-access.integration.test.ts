import { randomUUID } from 'node:crypto'

import { Pool } from 'pg'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { assertLiveSubscriptionAccess } from '#/server/live/live-subscription-access'

import { DocumentAccessDeniedError, assertDocumentAccess } from './document-access'

const databaseUrl = process.env.DATABASE_URL ?? ''

describe('document access database integration', () => {
  const pool = new Pool({ connectionString: databaseUrl })
  let databaseConnected = false
  const suffix = randomUUID()
  const organizationId = `access-org-${suffix}`
  const otherOrganizationId = `access-other-org-${suffix}`
  const ownerId = `access-owner-${suffix}`
  const reviewerId = `access-reviewer-${suffix}`
  const unassignedId = `access-unassigned-${suffix}`
  const projectId = randomUUID()
  const documentId = randomUUID()
  const documentVersionId = randomUUID()
  const reviewRoundId = randomUUID()
  beforeAll(async () => {
    await pool.query('select 1')
    databaseConnected = true
    await pool.query(
      `insert into "user" (id, name, email, email_verified)
       values ($1, 'Owner', $2, true), ($3, 'Reviewer', $4, true), ($5, 'Unassigned', $6, true)`,
      [
        ownerId,
        `${ownerId}@example.test`,
        reviewerId,
        `${reviewerId}@example.test`,
        unassignedId,
        `${unassignedId}@example.test`,
      ],
    )
    await pool.query(
      `insert into organization (id, name, slug, created_at)
       values ($1, 'Access Test', $2, now()), ($3, 'Other Access Test', $4, now())`,
      [organizationId, organizationId, otherOrganizationId, otherOrganizationId],
    )
    await pool.query(
      `insert into member (id, organization_id, user_id, role, created_at)
       values ($1, $2, $3, 'owner', now()), ($4, $2, $5, 'reviewer', now()),
              ($6, $2, $7, 'reviewer', now())`,
      [
        `member-owner-${suffix}`,
        organizationId,
        ownerId,
        `member-reviewer-${suffix}`,
        reviewerId,
        `member-unassigned-${suffix}`,
        unassignedId,
      ],
    )
    await pool.query(
      `insert into project (id, organization_id, name, created_by_id)
       values ($1, $2, 'Access test project', $3)`,
      [projectId, organizationId, ownerId],
    )
    await pool.query(
      `insert into document (id, organization_id, project_id, title, created_by_id)
       values ($1, $2, $3, 'Access test document', $4)`,
      [documentId, organizationId, projectId, ownerId],
    )
    await pool.query(
      `insert into document_version
         (id, document_id, version_number, origin, status, created_by_id)
       values ($1, $2, 1, 'upload', 'ready', $3)`,
      [documentVersionId, documentId, ownerId],
    )
    await pool.query('update document set current_version_id = $1 where id = $2', [
      documentVersionId,
      documentId,
    ])
    await pool.query(
      `insert into review_round
         (id, document_id, document_version_id, name, status, created_by_id)
       values ($1, $2, $3, 'Round 1', 'open', $4)`,
      [reviewRoundId, documentId, documentVersionId, ownerId],
    )
    await pool.query(
      `insert into review_assignment (review_round_id, reviewer_id, assigned_by_id)
       values ($1, $2, $3)`,
      [reviewRoundId, reviewerId, ownerId],
    )
  })

  afterAll(async () => {
    try {
      if (!databaseConnected) return
      await pool.query('delete from review_assignment where review_round_id = $1', [reviewRoundId])
      await pool.query('delete from review_round where id = $1', [reviewRoundId])
      await pool.query('update document set current_version_id = null where id = $1', [documentId])
      await pool.query('delete from document_version where id = $1', [documentVersionId])
      await pool.query('delete from document where id = $1', [documentId])
      await pool.query('delete from project where id = $1', [projectId])
      await pool.query('delete from member where organization_id = $1', [organizationId])
      await pool.query('delete from organization where id = any($1::text[])', [
        [organizationId, otherOrganizationId],
      ])
      await pool.query('delete from "user" where id = any($1::text[])', [
        [ownerId, reviewerId, unassignedId],
      ])
    } finally {
      await pool.end()
    }
  })

  it('allows an assigned reviewer and rejects unassigned or cross-tenant access', async () => {
    await expect(
      assertDocumentAccess({
        context: { organizationId, role: 'reviewer', userId: reviewerId },
        documentId,
        documentVersionId,
      }),
    ).resolves.toBeUndefined()

    await expect(
      assertDocumentAccess({
        context: { organizationId, role: 'reviewer', userId: unassignedId },
        documentId,
        documentVersionId,
      }),
    ).rejects.toBeInstanceOf(DocumentAccessDeniedError)

    await expect(
      assertDocumentAccess({
        context: { organizationId: otherOrganizationId, role: 'reviewer', userId: reviewerId },
        documentId,
        documentVersionId,
      }),
    ).rejects.toBeInstanceOf(DocumentAccessDeniedError)

    await expect(
      assertLiveSubscriptionAccess({
        context: { organizationId: otherOrganizationId, role: 'owner', userId: ownerId },
        documentId,
      }),
    ).rejects.toBeInstanceOf(DocumentAccessDeniedError)
  })
})
