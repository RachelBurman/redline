import { randomUUID } from 'node:crypto'

import { and, eq, sql } from 'drizzle-orm'

import { db } from '#/db/index'
import { documentBlocks, documents, reviewItems, reviewRounds } from '#/db/schema'
import {
  hashRichMediaBlock,
  parseRichMediaBlockAttributes,
} from '#/domain/documents/rich-media-block'
import { appendAuditEvent } from '#/server/audit/append-audit-event'
import { assertDocumentAccess } from '#/server/auth/document-access'
import { assertCanReviewDocument } from '#/server/auth/permissions'
import { ReviewTargetError } from '#/server/reviews/review-errors'

import type { createMediaMetadataProposalSchema } from '#/server/reviews/schemas'
import type { z } from 'zod'

interface MediaContext {
  organizationId: string
  projectId: string
  role: string
  userId: string
}

export async function createMediaMetadataProposal(input: {
  context: MediaContext
  documentId: string
  proposal: z.infer<typeof createMediaMetadataProposalSchema>
}) {
  assertCanReviewDocument(input.context.role)
  await assertDocumentAccess({
    context: input.context,
    documentId: input.documentId,
    documentVersionId: input.proposal.documentVersionId,
  })

  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${input.documentId}))`)
    const [target] = await tx
      .select({
        blockId: documentBlocks.id,
        blockType: documentBlocks.blockType,
        blockText: documentBlocks.text,
        blockContentHash: documentBlocks.contentHash,
        attributes: documentBlocks.attributes,
        currentVersionId: documents.currentVersionId,
        reviewRoundStatus: reviewRounds.status,
      })
      .from(documents)
      .innerJoin(
        documentBlocks,
        and(
          eq(documentBlocks.id, input.proposal.targetBlockId),
          eq(documentBlocks.documentVersionId, input.proposal.documentVersionId),
        ),
      )
      .innerJoin(
        reviewRounds,
        and(
          eq(reviewRounds.id, input.proposal.reviewRoundId),
          eq(reviewRounds.documentId, documents.id),
          eq(reviewRounds.documentVersionId, input.proposal.documentVersionId),
        ),
      )
      .where(
        and(
          eq(documents.id, input.documentId),
          eq(documents.organizationId, input.context.organizationId),
        ),
      )
      .limit(1)
    if (!target || target.blockType !== 'rich_media') {
      throw new ReviewTargetError('The selected image is not part of this review round.')
    }
    if (target.currentVersionId !== input.proposal.documentVersionId) {
      throw new ReviewTargetError('This document version is no longer current.')
    }
    if (target.reviewRoundStatus !== 'open')
      throw new ReviewTargetError('This review round is complete.')

    const currentMedia = parseRichMediaBlockAttributes(target.attributes)
    const proposedMedia =
      input.proposal.changeType === 'media_caption'
        ? { ...currentMedia, caption: input.proposal.caption }
        : input.proposal.changeType === 'media_alt_text'
          ? { ...currentMedia, altText: input.proposal.altText }
          : null
    if (proposedMedia && hashRichMediaBlock(proposedMedia) === target.blockContentHash) {
      throw new ReviewTargetError('The proposed media metadata must differ from the current value.')
    }

    if (input.proposal.changeType === 'media_reorder' && input.proposal.beforeBlockId) {
      if (input.proposal.beforeBlockId === target.blockId) {
        throw new ReviewTargetError('Choose a different destination for this image.')
      }
      const [destination] = await tx
        .select({ id: documentBlocks.id })
        .from(documentBlocks)
        .where(
          and(
            eq(documentBlocks.id, input.proposal.beforeBlockId),
            eq(documentBlocks.documentVersionId, input.proposal.documentVersionId),
          ),
        )
        .limit(1)
      if (!destination) throw new ReviewTargetError('The requested image destination is stale.')
    }

    const reviewItemId = randomUUID()
    const proposedContent =
      input.proposal.changeType === 'media_caption'
        ? input.proposal.caption
        : input.proposal.changeType === 'media_alt_text'
          ? input.proposal.altText
          : null
    const [created] = await tx
      .insert(reviewItems)
      .values({
        id: reviewItemId,
        documentId: input.documentId,
        documentVersionId: input.proposal.documentVersionId,
        reviewRoundId: input.proposal.reviewRoundId,
        targetBlockId: target.blockId,
        insertionBeforeBlockId:
          input.proposal.changeType === 'media_reorder' ? input.proposal.beforeBlockId : null,
        authorId: input.context.userId,
        startOffset: 0,
        endOffset: 0,
        anchorPrefix: '',
        anchorQuote: target.blockText,
        anchorSuffix: '',
        targetContentHash: target.blockContentHash,
        originalContent: JSON.stringify({
          altText: currentMedia.altText,
          caption: currentMedia.caption,
          source: currentMedia.source,
        }),
        proposedContent,
        proposedMediaAssetId: proposedMedia?.assetId,
        proposedMedia,
        changeType: input.proposal.changeType,
        category: input.proposal.category,
        priority: input.proposal.priority,
        rationale: input.proposal.rationale,
      })
      .returning()
    if (!created) throw new Error('The media proposal could not be created.')

    await appendAuditEvent(tx, {
      organizationId: input.context.organizationId,
      projectId: input.context.projectId,
      documentId: input.documentId,
      documentVersionId: input.proposal.documentVersionId,
      reviewRoundId: input.proposal.reviewRoundId,
      reviewItemId,
      actorId: input.context.userId,
      eventType: 'media_asset.proposal_created',
      payload: {
        assetId: currentMedia.assetId,
        blockId: target.blockId,
        action: input.proposal.changeType,
        contentHash: currentMedia.contentHash,
        rationale: input.proposal.rationale,
      },
    })
    return created
  })
}
