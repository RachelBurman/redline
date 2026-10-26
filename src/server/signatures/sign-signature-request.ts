import { and, asc, eq, ne, sql } from 'drizzle-orm'

import { user } from '#/db/auth-schema'
import { db } from '#/db/index'
import {
  documentBlocks,
  documentVersions,
  documents,
  signatureRequests,
  signatureSlots,
} from '#/db/schema'
import { appendAuditEvent } from '#/server/audit/append-audit-event'

import {
  SignatureEmailNotVerifiedError,
  SignatureRequestConflictError,
  SignatureRequestNotFoundError,
  SignatureSlotNotFoundError,
} from './signature-errors'
import { buildVersionContentManifest } from './signature-manifest'
import { buildConsentStatement } from './signature-policy'

interface SignContext {
  organizationId: string
  projectId: string
  userId: string
}

export async function signSignatureRequest(input: {
  context: SignContext
  documentId: string
  signatureRequestId: string
  idempotencyKey: string
  confirmed: true
}) {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${input.signatureRequestId}))`)
    const [target] = await tx
      .select({
        requestId: signatureRequests.id,
        requestStatus: signatureRequests.status,
        contentSha256: signatureRequests.contentSha256,
        purpose: signatureRequests.purpose,
        documentId: documents.id,
        documentTitle: documents.title,
        documentVersionId: documentVersions.id,
        versionNumber: documentVersions.versionNumber,
        reviewRoundId: signatureRequests.reviewRoundId,
        slotId: signatureSlots.id,
        slotStatus: signatureSlots.status,
        signedAt: signatureSlots.signedAt,
        signerEmail: user.email,
        signerEmailVerified: user.emailVerified,
      })
      .from(signatureRequests)
      .innerJoin(documents, eq(signatureRequests.documentId, documents.id))
      .innerJoin(documentVersions, eq(signatureRequests.documentVersionId, documentVersions.id))
      .leftJoin(
        signatureSlots,
        and(
          eq(signatureSlots.signatureRequestId, signatureRequests.id),
          eq(signatureSlots.signerId, input.context.userId),
        ),
      )
      .innerJoin(user, eq(user.id, input.context.userId))
      .where(
        and(
          eq(signatureRequests.id, input.signatureRequestId),
          eq(signatureRequests.documentId, input.documentId),
          eq(signatureRequests.organizationId, input.context.organizationId),
        ),
      )
      .limit(1)
    if (!target) throw new SignatureRequestNotFoundError()
    if (!target.slotId || !target.slotStatus) throw new SignatureSlotNotFoundError()
    if (target.slotStatus === 'signed') {
      return {
        signatureRequestId: target.requestId,
        status: target.requestStatus,
        signedAt: target.signedAt?.toISOString() ?? null,
        repeated: true,
      }
    }
    if (target.slotStatus === 'declined' || target.requestStatus !== 'pending') {
      throw new SignatureRequestConflictError()
    }
    if (!target.signerEmailVerified) throw new SignatureEmailNotVerifiedError()

    const blocks = await tx
      .select({
        stableKey: documentBlocks.stableKey,
        ordinal: documentBlocks.ordinal,
        blockType: documentBlocks.blockType,
        contentHash: documentBlocks.contentHash,
      })
      .from(documentBlocks)
      .where(eq(documentBlocks.documentVersionId, target.documentVersionId))
      .orderBy(asc(documentBlocks.ordinal))
    const { contentSha256 } = buildVersionContentManifest({
      documentId: target.documentId,
      documentVersionId: target.documentVersionId,
      versionNumber: target.versionNumber,
      blocks,
    })
    if (contentSha256 !== target.contentSha256) {
      throw new SignatureRequestConflictError(
        'The immutable version no longer matches the signature request evidence.',
      )
    }

    const signedAt = new Date()
    const consentStatement = buildConsentStatement({
      documentTitle: target.documentTitle,
      versionNumber: target.versionNumber,
      purpose: target.purpose,
    })
    await tx
      .update(signatureSlots)
      .set({
        status: 'signed',
        verifiedEmail: target.signerEmail,
        consentStatement,
        idempotencyKey: input.idempotencyKey,
        signedAt,
      })
      .where(and(eq(signatureSlots.id, target.slotId), eq(signatureSlots.status, 'pending')))

    await appendAuditEvent(tx, {
      organizationId: input.context.organizationId,
      projectId: input.context.projectId,
      documentId: target.documentId,
      documentVersionId: target.documentVersionId,
      reviewRoundId: target.reviewRoundId,
      actorId: input.context.userId,
      eventType: 'signature.signed',
      requestId: target.requestId,
      payload: {
        signatureRequestId: target.requestId,
        signatureSlotId: target.slotId,
        signerId: input.context.userId,
        verifiedEmail: target.signerEmail,
        consentStatement,
        contentSha256,
        outcome: 'signed',
      },
    })

    const [remaining] = await tx
      .select({ count: sql<number>`count(*)::int` })
      .from(signatureSlots)
      .where(
        and(
          eq(signatureSlots.signatureRequestId, target.requestId),
          ne(signatureSlots.status, 'signed'),
        ),
      )
    const completed = remaining?.count === 0
    if (completed) {
      await tx
        .update(signatureRequests)
        .set({ status: 'completed', completedAt: signedAt })
        .where(eq(signatureRequests.id, target.requestId))
      await appendAuditEvent(tx, {
        organizationId: input.context.organizationId,
        projectId: input.context.projectId,
        documentId: target.documentId,
        documentVersionId: target.documentVersionId,
        reviewRoundId: target.reviewRoundId,
        actorId: input.context.userId,
        eventType: 'signature_request.completed',
        requestId: target.requestId,
        payload: { signatureRequestId: target.requestId, contentSha256 },
      })
    }

    return {
      signatureRequestId: target.requestId,
      status: completed ? ('completed' as const) : ('pending' as const),
      signedAt: signedAt.toISOString(),
      repeated: false,
    }
  })
}
