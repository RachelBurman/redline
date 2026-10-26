import { randomUUID } from 'node:crypto'

import { and, asc, eq, inArray, isNull, sql } from 'drizzle-orm'

import { member, user } from '#/db/auth-schema'
import { db } from '#/db/index'
import {
  documentBlocks,
  documentVersions,
  documents,
  reviewAssignments,
  reviewItems,
  reviewRounds,
  signatureRequests,
  signatureSlots,
} from '#/db/schema'
import { appendAuditEvent } from '#/server/audit/append-audit-event'
import { assertCanManageSignatureRequests } from '#/server/auth/permissions'

import { SignatureRequestConflictError, SignatureSignerNotFoundError } from './signature-errors'
import { buildVersionContentManifest } from './signature-manifest'

interface SignatureContext {
  organizationId: string
  projectId: string
  role: string
  userId: string
}

export async function createSignatureRequest(input: {
  context: SignatureContext
  documentId: string
  documentVersionId: string
  scope: 'individual' | 'everyone'
  purpose: string
}) {
  assertCanManageSignatureRequests(input.context.role)

  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${input.documentId}))`)

    const [version] = await tx
      .select({
        documentId: documents.id,
        documentTitle: documents.title,
        versionId: documentVersions.id,
        versionNumber: documentVersions.versionNumber,
        reviewRoundId: reviewRounds.id,
      })
      .from(documentVersions)
      .innerJoin(documents, eq(documentVersions.documentId, documents.id))
      .innerJoin(reviewRounds, eq(reviewRounds.documentVersionId, documentVersions.id))
      .where(
        and(
          eq(documents.id, input.documentId),
          eq(documents.organizationId, input.context.organizationId),
          eq(documentVersions.id, input.documentVersionId),
          eq(documentVersions.status, 'ready'),
        ),
      )
      .orderBy(asc(reviewRounds.createdAt))
      .limit(1)
      .for('update')
    if (!version) throw new SignatureRequestConflictError('The document version is unavailable.')

    const [activeRequest] = await tx
      .select({ id: signatureRequests.id })
      .from(signatureRequests)
      .where(
        and(
          eq(signatureRequests.documentVersionId, version.versionId),
          eq(signatureRequests.status, 'pending'),
        ),
      )
      .limit(1)
    if (activeRequest) {
      throw new SignatureRequestConflictError(
        'This document version already has a pending signature request.',
      )
    }

    const [unpublishedDecision] = await tx
      .select({ id: reviewItems.id })
      .from(reviewItems)
      .where(
        and(
          eq(reviewItems.documentVersionId, version.versionId),
          eq(reviewItems.status, 'accepted'),
        ),
      )
      .limit(1)
    if (unpublishedDecision) {
      throw new SignatureRequestConflictError(
        'Create a new immutable version before requesting signatures for accepted changes.',
      )
    }

    const signerIds =
      input.scope === 'individual'
        ? [input.context.userId]
        : (
            await tx
              .select({ signerId: reviewAssignments.reviewerId })
              .from(reviewAssignments)
              .where(
                and(
                  eq(reviewAssignments.reviewRoundId, version.reviewRoundId),
                  isNull(reviewAssignments.revokedAt),
                ),
              )
          ).map((row) => row.signerId)
    const uniqueSignerIds = [...new Set(signerIds)]
    if (uniqueSignerIds.length === 0) throw new SignatureSignerNotFoundError()

    const signers = await tx
      .select({ id: user.id, name: user.name, email: user.email })
      .from(member)
      .innerJoin(user, eq(member.userId, user.id))
      .where(
        and(
          eq(member.organizationId, input.context.organizationId),
          inArray(user.id, uniqueSignerIds),
        ),
      )
    if (signers.length !== uniqueSignerIds.length) throw new SignatureSignerNotFoundError()

    const blocks = await tx
      .select({
        stableKey: documentBlocks.stableKey,
        ordinal: documentBlocks.ordinal,
        blockType: documentBlocks.blockType,
        contentHash: documentBlocks.contentHash,
      })
      .from(documentBlocks)
      .where(eq(documentBlocks.documentVersionId, version.versionId))
      .orderBy(asc(documentBlocks.ordinal))
    const { contentSha256 } = buildVersionContentManifest({
      documentId: version.documentId,
      documentVersionId: version.versionId,
      versionNumber: version.versionNumber,
      blocks,
    })
    const requestId = randomUUID()
    const createdAt = new Date()

    await tx.insert(signatureRequests).values({
      id: requestId,
      organizationId: input.context.organizationId,
      documentId: version.documentId,
      documentVersionId: version.versionId,
      reviewRoundId: version.reviewRoundId,
      requestedById: input.context.userId,
      scope: input.scope,
      purpose: input.purpose,
      contentSha256,
      createdAt,
    })
    await tx.insert(signatureSlots).values(
      uniqueSignerIds.map((signerId) => ({
        signatureRequestId: requestId,
        signerId,
        createdAt,
      })),
    )
    await appendAuditEvent(tx, {
      organizationId: input.context.organizationId,
      projectId: input.context.projectId,
      documentId: version.documentId,
      documentVersionId: version.versionId,
      reviewRoundId: version.reviewRoundId,
      actorId: input.context.userId,
      eventType: 'signature_request.created',
      requestId,
      payload: {
        signatureRequestId: requestId,
        scope: input.scope,
        purpose: input.purpose,
        contentSha256,
        requiredSignerIds: uniqueSignerIds,
      },
    })

    return {
      id: requestId,
      documentTitle: version.documentTitle,
      documentVersionId: version.versionId,
      versionNumber: version.versionNumber,
      reviewRoundId: version.reviewRoundId,
      purpose: input.purpose,
      createdAt: createdAt.toISOString(),
      signers,
    }
  })
}
