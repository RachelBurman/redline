import { randomUUID } from 'node:crypto'

import { and, asc, desc, eq, inArray, sql } from 'drizzle-orm'

import { db } from '#/db/index'
import {
  documentBlocks,
  documentVersions,
  documents,
  reviewItems,
  reviewResolutions,
  reviewRounds,
} from '#/db/schema'
import { appendAuditEvent } from '#/server/audit/append-audit-event'
import { assertCanManageDocumentVersions } from '#/server/auth/permissions'

import { cloneVersionBlocks } from './clone-version-blocks'
import { DocumentNotFoundError } from './get-document'
import { DocumentVersionConflictError, NoAcceptedChangesError } from './version-errors'

interface VersionContext {
  organizationId: string
  projectId: string
  role: string
  userId: string
}

export async function createDocumentVersion(input: {
  context: VersionContext
  documentId: string
  expectedCurrentVersionId: string
  note?: string
}) {
  assertCanManageDocumentVersions(input.context.role)

  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${input.documentId}))`)

    const [current] = await tx
      .select({
        documentVersionId: documentVersions.id,
        versionNumber: documentVersions.versionNumber,
        parserVersion: documentVersions.parserVersion,
        parserWarnings: documentVersions.parserWarnings,
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

    const [sourceBlocks, acceptedRows] = await Promise.all([
      tx
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
        .where(eq(documentBlocks.documentVersionId, current.documentVersionId))
        .orderBy(asc(documentBlocks.ordinal)),
      tx
        .select({
          reviewItemId: reviewItems.id,
          targetBlockId: reviewItems.targetBlockId,
          finalContent: reviewResolutions.finalContent,
        })
        .from(reviewItems)
        .innerJoin(reviewResolutions, eq(reviewResolutions.reviewItemId, reviewItems.id))
        .where(
          and(
            eq(reviewItems.documentVersionId, current.documentVersionId),
            eq(reviewItems.status, 'accepted'),
            eq(reviewResolutions.decision, 'accept'),
          ),
        ),
    ])

    const acceptedChanges = acceptedRows.flatMap((row) =>
      row.finalContent === null
        ? []
        : [
            {
              reviewItemId: row.reviewItemId,
              targetBlockId: row.targetBlockId,
              finalContent: row.finalContent,
            },
          ],
    )
    if (acceptedChanges.length === 0) throw new NoAcceptedChangesError()

    const now = new Date()
    const newVersionId = randomUUID()
    const newReviewRoundId = randomUUID()
    const nextVersionNumber = current.versionNumber + 1

    await tx.insert(documentVersions).values({
      id: newVersionId,
      documentId: input.documentId,
      parentVersionId: current.documentVersionId,
      versionNumber: nextVersionNumber,
      origin: 'checkpoint',
      status: 'ready',
      parserVersion: current.parserVersion,
      parserWarnings: current.parserWarnings,
      note: input.note,
      createdById: input.context.userId,
      publishedAt: now,
    })
    await tx.insert(documentBlocks).values(
      cloneVersionBlocks({
        blocks: sourceBlocks,
        documentVersionId: newVersionId,
        replacements: acceptedChanges,
      }),
    )

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
          inArray(reviewItems.status, ['open', 'under_discussion', 'conflict']),
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
      payload: { resultingDocumentVersionId: newVersionId },
    })
    await appendAuditEvent(tx, {
      organizationId: input.context.organizationId,
      projectId: input.context.projectId,
      documentId: input.documentId,
      documentVersionId: newVersionId,
      reviewRoundId: newReviewRoundId,
      actorId: input.context.userId,
      eventType: 'document.version_created',
      payload: {
        sourceDocumentVersionId: current.documentVersionId,
        versionNumber: nextVersionNumber,
        note: input.note ?? null,
        acceptedReviewItemIds: acceptedChanges.map((change) => change.reviewItemId),
        supersededReviewItemIds: supersededItems.map((item) => item.id),
      },
    })

    return {
      documentId: input.documentId,
      previousVersionId: current.documentVersionId,
      documentVersionId: newVersionId,
      versionNumber: nextVersionNumber,
      reviewRoundId: newReviewRoundId,
      acceptedChangeCount: acceptedChanges.length,
      supersededReviewItemCount: supersededItems.length,
    }
  })
}
