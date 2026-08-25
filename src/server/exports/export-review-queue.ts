import { randomUUID } from 'node:crypto'

import { and, asc, count, eq, inArray } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'

import { user } from '#/db/auth-schema'
import { db } from '#/db/index'
import {
  documentBlocks,
  documentVersions,
  documents,
  exports as exportRecords,
  reviewComments,
  reviewItems,
  reviewResolutions,
  reviewRounds,
} from '#/db/schema'
import { appendAuditEvent } from '#/server/audit/append-audit-event'
import { assertCanExportReviewQueue } from '#/server/auth/permissions'
import { getDocument } from '#/server/documents/get-document'
import { localObjectStore } from '#/server/storage/local-object-store'

import { buildReviewQueueCsv } from './build-review-queue-csv'

import type { ReviewQueueExportRow } from './build-review-queue-csv'

interface ExportContext {
  organizationId: string
  projectId: string
  role: string
  userId: string
}

const reviewAuthor = alias(user, 'review_author')
const reviewResolver = alias(user, 'review_resolver')

function downloadFilename(title: string) {
  const safeTitle = title
    .normalize('NFKD')
    .replace(/[^a-zA-Z0-9 _-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 120)
  return `${safeTitle || 'document'}-review-queue.csv`
}

async function listExportRows(input: { documentId: string; organizationId: string }) {
  const rows = await db
    .select({
      reviewItemId: reviewItems.id,
      parentReviewItemId: reviewItems.parentReviewItemId,
      documentId: documents.id,
      documentTitle: documents.title,
      documentVersionNumber: documentVersions.versionNumber,
      documentVersionId: documentVersions.id,
      reviewRoundName: reviewRounds.name,
      reviewRoundId: reviewRounds.id,
      changeType: reviewItems.changeType,
      targetBlockStableKey: documentBlocks.stableKey,
      targetBlockId: documentBlocks.id,
      startOffset: reviewItems.startOffset,
      endOffset: reviewItems.endOffset,
      originalContent: reviewItems.originalContent,
      proposedContent: reviewItems.proposedContent,
      finalContent: reviewResolutions.finalContent,
      category: reviewItems.category,
      priority: reviewItems.priority,
      rationale: reviewItems.rationale,
      status: reviewItems.status,
      revision: reviewItems.revision,
      authorId: reviewAuthor.id,
      authorName: reviewAuthor.name,
      createdAt: reviewItems.createdAt,
      updatedAt: reviewItems.updatedAt,
      decision: reviewResolutions.decision,
      resolutionNote: reviewResolutions.note,
      resolverId: reviewResolver.id,
      resolverName: reviewResolver.name,
      resolvedAt: reviewResolutions.resolvedAt,
    })
    .from(reviewItems)
    .innerJoin(documents, eq(reviewItems.documentId, documents.id))
    .innerJoin(documentVersions, eq(reviewItems.documentVersionId, documentVersions.id))
    .innerJoin(reviewRounds, eq(reviewItems.reviewRoundId, reviewRounds.id))
    .innerJoin(documentBlocks, eq(reviewItems.targetBlockId, documentBlocks.id))
    .innerJoin(reviewAuthor, eq(reviewItems.authorId, reviewAuthor.id))
    .leftJoin(reviewResolutions, eq(reviewItems.id, reviewResolutions.reviewItemId))
    .leftJoin(reviewResolver, eq(reviewResolutions.resolverId, reviewResolver.id))
    .where(
      and(
        eq(reviewItems.documentId, input.documentId),
        eq(documents.organizationId, input.organizationId),
      ),
    )
    .orderBy(asc(documentVersions.versionNumber), asc(reviewItems.createdAt))

  const commentCounts =
    rows.length === 0
      ? []
      : await db
          .select({
            reviewItemId: reviewComments.reviewItemId,
            discussionCount: count(reviewComments.id),
          })
          .from(reviewComments)
          .where(
            inArray(
              reviewComments.reviewItemId,
              rows.map((row) => row.reviewItemId),
            ),
          )
          .groupBy(reviewComments.reviewItemId)
  const discussionCountByItem = new Map(
    commentCounts.map((item) => [item.reviewItemId, item.discussionCount]),
  )

  function serializeRow(row: (typeof rows)[number]): ReviewQueueExportRow {
    return {
      ...row,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      resolvedAt: row.resolvedAt?.toISOString() ?? null,
      actioned: row.decision === 'accept' || row.decision === 'reject',
      discussionCount: discussionCountByItem.get(row.reviewItemId) ?? 0,
    }
  }

  return rows.map(serializeRow)
}

export async function exportReviewQueue(input: { context: ExportContext; documentId: string }) {
  assertCanExportReviewQueue(input.context.role)
  const document = await getDocument({
    documentId: input.documentId,
    organizationId: input.context.organizationId,
  })
  const exportId = randomUUID()

  await db.insert(exportRecords).values({
    id: exportId,
    documentId: input.documentId,
    documentVersionId: document.version.id,
    requestedById: input.context.userId,
    format: 'review_csv',
    status: 'pending',
  })

  try {
    const rows = await listExportRows({
      documentId: input.documentId,
      organizationId: input.context.organizationId,
    })
    const bytes = new TextEncoder().encode(buildReviewQueueCsv(rows))
    const filename = downloadFilename(document.document.title)
    const objectKey = `exports/${input.documentId}/${exportId}.csv`
    const storedObject = await localObjectStore.put(objectKey, bytes)

    try {
      await db.transaction(async (tx) => {
        const completedAt = new Date()
        await tx
          .update(exportRecords)
          .set({
            status: 'ready',
            objectKey: storedObject.key,
            outputSha256: storedObject.sha256,
            completedAt,
          })
          .where(eq(exportRecords.id, exportId))
        await appendAuditEvent(tx, {
          organizationId: input.context.organizationId,
          projectId: input.context.projectId,
          documentId: input.documentId,
          documentVersionId: document.version.id,
          reviewRoundId: document.reviewRound.id,
          actorId: input.context.userId,
          eventType: 'review_queue.exported',
          payload: {
            exportId,
            format: 'review_csv',
            filename,
            reviewItemCount: rows.length,
            outputSha256: storedObject.sha256,
            outputByteSize: storedObject.byteSize,
          },
        })
      })
    } catch (error) {
      await localObjectStore.delete(storedObject.key).catch(() => undefined)
      throw error
    }

    return {
      bytes,
      filename,
      exportId,
      documentVersionId: document.version.id,
      reviewItemCount: rows.length,
      sha256: storedObject.sha256,
    }
  } catch (error) {
    await db
      .update(exportRecords)
      .set({
        status: 'failed',
        error: error instanceof Error ? error.message : 'The review queue export failed.',
        completedAt: new Date(),
      })
      .where(eq(exportRecords.id, exportId))
    throw error
  }
}
