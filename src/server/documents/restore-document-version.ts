import { randomUUID } from 'node:crypto'

import { and, asc, desc, eq, inArray, sql } from 'drizzle-orm'

import { db } from '#/db/index'
import { documentBlocks, documentVersions, documents, reviewItems, reviewRounds } from '#/db/schema'
import { appendAuditEvent } from '#/server/audit/append-audit-event'
import { assertCanManageDocumentVersions } from '#/server/auth/permissions'

import { cloneVersionBlocks } from './clone-version-blocks'
import { DocumentNotFoundError } from './get-document'
import { DocumentVersionConflictError, DocumentVersionNotFoundError } from './version-errors'

interface VersionContext {
  organizationId: string
  projectId: string
  role: string
  userId: string
}

export async function restoreDocumentVersion(input: {
  context: VersionContext
  documentId: string
  sourceVersionId: string
  expectedCurrentVersionId: string
  reason: string
}) {
  assertCanManageDocumentVersions(input.context.role)

  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${input.documentId}))`)

    const [current] = await tx
      .select({
        documentVersionId: documentVersions.id,
        versionNumber: documentVersions.versionNumber,
      })
      .from(documents)
      .innerJoin(documentVersions, eq(documents.currentVersionId, documentVersions.id))
      .where(
        and(
          eq(documents.id, input.documentId),
          eq(documents.organizationId, input.context.organizationId),
        ),
      )
      .limit(1)
      .for('update')
    if (!current) throw new DocumentNotFoundError()
    if (current.documentVersionId !== input.expectedCurrentVersionId) {
      throw new DocumentVersionConflictError()
    }
    if (current.documentVersionId === input.sourceVersionId) {
      throw new DocumentVersionConflictError('The selected version is already current.')
    }

    const [sourceVersion] = await tx
      .select({
        id: documentVersions.id,
        versionNumber: documentVersions.versionNumber,
        parserVersion: documentVersions.parserVersion,
        parserWarnings: documentVersions.parserWarnings,
      })
      .from(documentVersions)
      .where(
        and(
          eq(documentVersions.id, input.sourceVersionId),
          eq(documentVersions.documentId, input.documentId),
          eq(documentVersions.status, 'ready'),
        ),
      )
      .limit(1)
    if (!sourceVersion) throw new DocumentVersionNotFoundError()

    const [reviewRound] = await tx
      .select({ id: reviewRounds.id })
      .from(reviewRounds)
      .where(
        and(
          eq(reviewRounds.documentVersionId, current.documentVersionId),
          eq(reviewRounds.status, 'open'),
        ),
      )
      .orderBy(desc(reviewRounds.createdAt))
      .limit(1)
      .for('update')
    if (!reviewRound) {
      throw new DocumentVersionConflictError('The current review round is already complete.')
    }

    const sourceBlocks = await tx
      .select({
        id: documentBlocks.id,
        parentBlockId: documentBlocks.parentBlockId,
        stableKey: documentBlocks.stableKey,
        ordinal: documentBlocks.ordinal,
        blockType: documentBlocks.blockType,
        text: documentBlocks.text,
        headingLevel: documentBlocks.headingLevel,
        contentHash: documentBlocks.contentHash,
        attributes: documentBlocks.attributes,
      })
      .from(documentBlocks)
      .where(eq(documentBlocks.documentVersionId, sourceVersion.id))
      .orderBy(asc(documentBlocks.ordinal))

    const now = new Date()
    const newVersionId = randomUUID()
    const newReviewRoundId = randomUUID()
    const nextVersionNumber = current.versionNumber + 1

    await tx.insert(documentVersions).values({
      id: newVersionId,
      documentId: input.documentId,
      parentVersionId: current.documentVersionId,
      restoredFromVersionId: sourceVersion.id,
      versionNumber: nextVersionNumber,
      origin: 'restore',
      status: 'ready',
      parserVersion: sourceVersion.parserVersion,
      parserWarnings: sourceVersion.parserWarnings,
      note: input.reason,
      createdById: input.context.userId,
      publishedAt: now,
    })
    await tx
      .insert(documentBlocks)
      .values(cloneVersionBlocks({ blocks: sourceBlocks, documentVersionId: newVersionId }))

    const supersededItems = await tx
      .update(reviewItems)
      .set({
        status: 'superseded',
        revision: sql`${reviewItems.revision} + 1`,
        resolvedAt: now,
        updatedAt: now,
      })
      .where(
        and(
          eq(reviewItems.documentVersionId, current.documentVersionId),
          inArray(reviewItems.status, ['open', 'under_discussion', 'accepted', 'conflict']),
        ),
      )
      .returning({ id: reviewItems.id })

    await tx
      .update(reviewRounds)
      .set({ status: 'completed', completedById: input.context.userId, completedAt: now })
      .where(eq(reviewRounds.id, reviewRound.id))
    await tx.insert(reviewRounds).values({
      id: newReviewRoundId,
      documentId: input.documentId,
      documentVersionId: newVersionId,
      name: `Review round ${nextVersionNumber}`,
      createdById: input.context.userId,
    })
    await tx
      .update(documents)
      .set({ currentVersionId: newVersionId, updatedAt: now })
      .where(eq(documents.id, input.documentId))

    await appendAuditEvent(tx, {
      organizationId: input.context.organizationId,
      projectId: input.context.projectId,
      documentId: input.documentId,
      documentVersionId: current.documentVersionId,
      reviewRoundId: reviewRound.id,
      actorId: input.context.userId,
      eventType: 'review_round.completed',
      payload: { resultingDocumentVersionId: newVersionId, reason: 'version_restored' },
    })
    await appendAuditEvent(tx, {
      organizationId: input.context.organizationId,
      projectId: input.context.projectId,
      documentId: input.documentId,
      documentVersionId: newVersionId,
      reviewRoundId: newReviewRoundId,
      actorId: input.context.userId,
      eventType: 'document.version_restored',
      payload: {
        previousDocumentVersionId: current.documentVersionId,
        restoredFromDocumentVersionId: sourceVersion.id,
        restoredFromVersionNumber: sourceVersion.versionNumber,
        versionNumber: nextVersionNumber,
        reason: input.reason,
        supersededReviewItemIds: supersededItems.map((item) => item.id),
      },
    })

    return {
      documentId: input.documentId,
      previousVersionId: current.documentVersionId,
      documentVersionId: newVersionId,
      versionNumber: nextVersionNumber,
      reviewRoundId: newReviewRoundId,
      acceptedChangeCount: 0,
      supersededReviewItemCount: supersededItems.length,
    }
  })
}
