import { createHash } from 'node:crypto'

import { z } from 'zod'

import type { RichMediaBlockAttributes } from '#/types/rich-media'

export const richMediaBlockAttributesSchema = z.object({
  assetId: z.uuid(),
  altText: z.string().trim().min(1).max(2_000),
  caption: z.string().trim().max(2_000).nullable(),
  source: z.string().trim().max(2_000).nullable(),
  provenance: z.record(z.string(), z.string().max(2_000)),
  width: z.int().positive().max(10_000),
  height: z.int().positive().max(10_000),
  byteSize: z
    .int()
    .positive()
    .max(10 * 1024 * 1024),
  mimeType: z.enum(['image/jpeg', 'image/png']),
  contentHash: z.string().regex(/^[a-f0-9]{64}$/),
  processingStatus: z.enum(['pending', 'ready', 'quarantined', 'failed']),
})

export function parseRichMediaBlockAttributes(
  attributes: Record<string, unknown>,
): RichMediaBlockAttributes {
  return richMediaBlockAttributesSchema.parse(attributes)
}

function sortRecord(record: Record<string, string>) {
  const sortedEntries: Array<[string, string]> = []
  for (const entry of Object.entries(record)) {
    const index = sortedEntries.findIndex(([key]) => key.localeCompare(entry[0]) > 0)
    sortedEntries.splice(index < 0 ? sortedEntries.length : index, 0, entry)
  }
  return Object.fromEntries(sortedEntries)
}

export function hashRichMediaBlock(attributes: RichMediaBlockAttributes) {
  return createHash('sha256')
    .update(
      JSON.stringify({
        assetId: attributes.assetId,
        altText: attributes.altText,
        caption: attributes.caption,
        source: attributes.source,
        provenance: sortRecord(attributes.provenance),
        width: attributes.width,
        height: attributes.height,
        byteSize: attributes.byteSize,
        mimeType: attributes.mimeType,
        contentHash: attributes.contentHash,
        processingStatus: attributes.processingStatus,
      }),
    )
    .digest('hex')
}
