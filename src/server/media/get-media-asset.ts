import { createHash, timingSafeEqual } from 'node:crypto'

import { and, eq } from 'drizzle-orm'

import { db } from '#/db/index'
import { mediaAssets } from '#/db/schema'
import { assertDocumentAccess } from '#/server/auth/document-access'
import { localObjectStore } from '#/server/storage/local-object-store'

import { MediaAssetNotFoundError, MediaAssetStateError } from './media-errors'

export async function getMediaAsset(input: {
  assetId: string
  documentId: string
  organizationId: string
  role: string
  userId: string
  variant: 'original' | 'preview'
}) {
  await assertDocumentAccess({ context: input, documentId: input.documentId })
  const [asset] = await db
    .select({
      status: mediaAssets.status,
      objectKey: mediaAssets.objectKey,
      previewObjectKey: mediaAssets.previewObjectKey,
      contentSha256: mediaAssets.contentSha256,
      previewSha256: mediaAssets.previewSha256,
      mimeType: mediaAssets.mimeType,
    })
    .from(mediaAssets)
    .where(
      and(
        eq(mediaAssets.id, input.assetId),
        eq(mediaAssets.documentId, input.documentId),
        eq(mediaAssets.organizationId, input.organizationId),
      ),
    )
    .limit(1)
  if (!asset) throw new MediaAssetNotFoundError()
  if (asset.status !== 'ready') {
    throw new MediaAssetStateError(
      asset.status === 'quarantined'
        ? 'This media asset is quarantined and cannot be displayed.'
        : 'This media asset is not ready. Retry processing or replace it.',
    )
  }

  const key = input.variant === 'preview' ? asset.previewObjectKey : asset.objectKey
  if (!key || !asset.mimeType) throw new MediaAssetStateError('The media derivative is missing.')
  const bytes = await localObjectStore.get(key)
  const expectedSha256 = input.variant === 'preview' ? asset.previewSha256 : asset.contentSha256
  if (expectedSha256) {
    const actual = createHash('sha256').update(bytes).digest()
    const expected = Buffer.from(expectedSha256, 'hex')
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
      throw new MediaAssetStateError(
        'The stored media hash does not match the immutable asset record.',
      )
    }
  }
  return { bytes, mimeType: asset.mimeType }
}
