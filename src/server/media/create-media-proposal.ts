import { createHash, randomUUID } from 'node:crypto'

import { and, asc, eq, gt, sql } from 'drizzle-orm'
import { z } from 'zod'

import { db } from '#/db/index'
import { documentBlocks, documents, mediaAssets, reviewItems, reviewRounds } from '#/db/schema'
import { appendAuditEvent } from '#/server/audit/append-audit-event'
import { assertDocumentAccess } from '#/server/auth/document-access'
import { assertCanReviewDocument } from '#/server/auth/permissions'
import { ReviewTargetError } from '#/server/reviews/review-errors'
import { localObjectStore } from '#/server/storage/local-object-store'

import { MEDIA_LIMITS, sanitiseImage, UnsafeMediaError } from './image-processing'
import { assertMalwareScanClean } from './malware-scanner'

import type { ReviewCategory, ReviewPriority } from '#/domain/review/review-options'
import type { RichMediaBlockAttributes } from '#/types/rich-media'

interface MediaContext {
  organizationId: string
  projectId: string
  role: string
  userId: string
}

const mediaMetadataSchema = z.object({
  altText: z.string().trim().min(1, 'An accessible description is required.').max(2_000),
  caption: z.string().trim().max(2_000).nullable(),
  source: z.string().trim().max(2_000).nullable(),
  provenance: z.record(z.string(), z.string().trim().max(2_000)).default({}),
})

const proposalMetadataSchema = z.object({
  category: z.string().trim().min(1).max(80),
  priority: z.enum(['low', 'medium', 'high', 'critical']),
  rationale: z.string().trim().min(3).max(5_000),
})

function tenantKeySegment(organizationId: string) {
  return createHash('sha256').update(organizationId).digest('hex').slice(0, 24)
}

async function loadProposalTarget(input: {
  context: MediaContext
  documentId: string
  documentVersionId: string
  reviewRoundId: string
  targetBlockId: string
  changeType: 'media_insert' | 'media_replace'
  beforeBlockId: string | null
}) {
  const [target] = await db
    .select({
      blockId: documentBlocks.id,
      blockType: documentBlocks.blockType,
      blockText: documentBlocks.text,
      contentHash: documentBlocks.contentHash,
      ordinal: documentBlocks.ordinal,
      currentVersionId: documents.currentVersionId,
      reviewRoundStatus: reviewRounds.status,
    })
    .from(documents)
    .innerJoin(
      documentBlocks,
      and(
        eq(documentBlocks.id, input.targetBlockId),
        eq(documentBlocks.documentVersionId, input.documentVersionId),
      ),
    )
    .innerJoin(
      reviewRounds,
      and(
        eq(reviewRounds.id, input.reviewRoundId),
        eq(reviewRounds.documentId, documents.id),
        eq(reviewRounds.documentVersionId, input.documentVersionId),
      ),
    )
    .where(
      and(
        eq(documents.id, input.documentId),
        eq(documents.organizationId, input.context.organizationId),
      ),
    )
    .limit(1)

  if (!target || target.currentVersionId !== input.documentVersionId) {
    throw new ReviewTargetError('The selected document block is no longer current.')
  }
  if (target.reviewRoundStatus !== 'open')
    throw new ReviewTargetError('This review round is complete.')
  if (input.changeType === 'media_replace' && target.blockType !== 'rich_media') {
    throw new ReviewTargetError('Only an existing image can be replaced with another image.')
  }

  if (input.changeType === 'media_insert') {
    const [following] = await db
      .select({ id: documentBlocks.id })
      .from(documentBlocks)
      .where(
        and(
          eq(documentBlocks.documentVersionId, input.documentVersionId),
          gt(documentBlocks.ordinal, target.ordinal),
        ),
      )
      .orderBy(asc(documentBlocks.ordinal))
      .limit(1)
    if ((following?.id ?? null) !== input.beforeBlockId) {
      throw new ReviewTargetError('The selected insertion point is stale. Refresh and try again.')
    }
  }
  return target
}

export async function createMediaProposal(input: {
  context: MediaContext
  documentId: string
  documentVersionId: string
  reviewRoundId: string
  targetBlockId: string
  beforeBlockId: string | null
  changeType: 'media_insert' | 'media_replace'
  file: File
  altText: string
  caption: string | null
  source: string | null
  provenance?: Record<string, string>
  category: ReviewCategory
  priority: ReviewPriority
  rationale: string
}) {
  assertCanReviewDocument(input.context.role)
  if (input.file.size === 0) throw new UnsafeMediaError('Choose a non-empty image.', 'EMPTY_FILE')
  if (input.file.size > MEDIA_LIMITS.compressedBytes) {
    throw new UnsafeMediaError('Images must be 10 MB or smaller.', 'FILE_TOO_LARGE')
  }
  await assertDocumentAccess({
    context: input.context,
    documentId: input.documentId,
    documentVersionId: input.documentVersionId,
  })
  const mediaMetadata = mediaMetadataSchema.parse(input)
  const proposalMetadata = proposalMetadataSchema.parse(input)
  const target = await loadProposalTarget(input)
  const bytes = new Uint8Array(await input.file.arrayBuffer())
  const assetId = randomUUID()
  const tenantSegment = tenantKeySegment(input.context.organizationId)
  const quarantineObjectKey = `quarantine/${tenantSegment}/${input.documentId}/${assetId}`
  await localObjectStore.put(quarantineObjectKey, bytes)

  try {
    await db.transaction(async (tx) => {
      await tx.insert(mediaAssets).values({
        id: assetId,
        organizationId: input.context.organizationId,
        documentId: input.documentId,
        uploadedById: input.context.userId,
        originalFilename: input.file.name.slice(0, 500) || 'image',
        quarantineObjectKey,
        provenance: mediaMetadata.provenance,
      })
      await appendAuditEvent(tx, {
        organizationId: input.context.organizationId,
        projectId: input.context.projectId,
        documentId: input.documentId,
        documentVersionId: input.documentVersionId,
        reviewRoundId: input.reviewRoundId,
        actorId: input.context.userId,
        eventType: 'media_asset.upload_received',
        payload: { assetId, targetBlockId: input.targetBlockId, byteSize: bytes.byteLength },
      })
    })
  } catch (error) {
    await localObjectStore.delete(quarantineObjectKey).catch(() => undefined)
    throw error
  }

  let storedOriginalKey: string | null = null
  let storedPreviewKey: string | null = null
  try {
    const scan = await assertMalwareScanClean(bytes)
    const processed = sanitiseImage(bytes)
    storedOriginalKey = `media/${tenantSegment}/${input.documentId}/${assetId}/original`
    storedPreviewKey = `media/${tenantSegment}/${input.documentId}/${assetId}/preview`
    const [storedOriginal, storedPreview] = await Promise.all([
      localObjectStore.put(storedOriginalKey, processed.sanitisedBytes),
      localObjectStore.put(storedPreviewKey, processed.previewBytes),
    ])
    const blockAttributes: RichMediaBlockAttributes = {
      assetId,
      altText: mediaMetadata.altText,
      caption: mediaMetadata.caption || null,
      source: mediaMetadata.source || null,
      provenance: mediaMetadata.provenance,
      width: processed.width,
      height: processed.height,
      byteSize: storedOriginal.byteSize,
      mimeType: processed.mimeType,
      contentHash: storedOriginal.sha256,
      processingStatus: 'ready',
    }
    const reviewItemId = randomUUID()

    await db.transaction(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${input.documentId}))`)
      await tx
        .update(mediaAssets)
        .set({
          quarantineObjectKey: null,
          objectKey: storedOriginalKey,
          previewObjectKey: storedPreviewKey,
          contentSha256: storedOriginal.sha256,
          previewSha256: storedPreview.sha256,
          mimeType: processed.mimeType,
          byteSize: storedOriginal.byteSize,
          width: processed.width,
          height: processed.height,
          status: 'ready',
          scanner: scan.scanner,
          processedAt: new Date(),
        })
        .where(eq(mediaAssets.id, assetId))
      const [reviewItem] = await tx
        .insert(reviewItems)
        .values({
          id: reviewItemId,
          documentId: input.documentId,
          documentVersionId: input.documentVersionId,
          reviewRoundId: input.reviewRoundId,
          targetBlockId: input.targetBlockId,
          insertionBeforeBlockId: input.changeType === 'media_insert' ? input.beforeBlockId : null,
          authorId: input.context.userId,
          startOffset: 0,
          endOffset: target.blockText.length,
          anchorPrefix: '',
          anchorQuote: target.blockText,
          anchorSuffix: '',
          targetContentHash: target.contentHash,
          originalContent: input.changeType === 'media_insert' ? '' : target.blockText,
          proposedContent: mediaMetadata.caption,
          proposedMediaAssetId: assetId,
          proposedMedia: { ...blockAttributes },
          changeType: input.changeType,
          category: proposalMetadata.category,
          priority: proposalMetadata.priority,
          rationale: proposalMetadata.rationale,
        })
        .returning()
      if (!reviewItem) throw new Error('The media proposal could not be created.')

      await appendAuditEvent(tx, {
        organizationId: input.context.organizationId,
        projectId: input.context.projectId,
        documentId: input.documentId,
        documentVersionId: input.documentVersionId,
        reviewRoundId: input.reviewRoundId,
        reviewItemId,
        actorId: input.context.userId,
        eventType: 'media_asset.proposal_created',
        payload: {
          assetId,
          blockId: input.targetBlockId,
          action: input.changeType,
          contentHash: storedOriginal.sha256,
          mimeType: processed.mimeType,
          width: processed.width,
          height: processed.height,
          rationale: proposalMetadata.rationale,
        },
      })
    })

    await localObjectStore.delete(quarantineObjectKey).catch(() => undefined)
    return { assetId, reviewItemId }
  } catch (error) {
    if (storedOriginalKey) await localObjectStore.delete(storedOriginalKey).catch(() => undefined)
    if (storedPreviewKey) await localObjectStore.delete(storedPreviewKey).catch(() => undefined)
    const quarantined = error instanceof UnsafeMediaError && error.code === 'MALWARE_DETECTED'
    const failureCode = error instanceof UnsafeMediaError ? error.code : 'PROCESSING_FAILED'
    const failureMessage = error instanceof Error ? error.message : 'Image processing failed.'
    await db.transaction(async (tx) => {
      await tx
        .update(mediaAssets)
        .set({
          status: quarantined ? 'quarantined' : 'failed',
          failureCode,
          failureMessage,
          processedAt: new Date(),
        })
        .where(eq(mediaAssets.id, assetId))
      await appendAuditEvent(tx, {
        organizationId: input.context.organizationId,
        projectId: input.context.projectId,
        documentId: input.documentId,
        documentVersionId: input.documentVersionId,
        reviewRoundId: input.reviewRoundId,
        actorId: input.context.userId,
        eventType: quarantined ? 'media_asset.quarantined' : 'media_asset.processing_failed',
        payload: {
          assetId,
          blockId: input.targetBlockId,
          action: input.changeType,
          failureCode,
          outcome: quarantined ? 'quarantined' : 'failed',
        },
      })
    })
    throw error
  }
}
