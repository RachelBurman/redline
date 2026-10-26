import { createHash } from 'node:crypto'

export interface VersionManifestBlock {
  stableKey: string
  ordinal: number
  blockType: string
  contentHash: string
}

function sortedCopy<T>(items: readonly T[], compare: (left: T, right: T) => number) {
  return items.reduce<T[]>((sorted, item) => {
    const index = sorted.findIndex((entry) => compare(item, entry) < 0)
    return index === -1
      ? sorted.concat([item])
      : sorted.slice(0, index).concat([item], sorted.slice(index))
  }, [])
}

function canonicalize(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(',')}]`

  return `{${sortedCopy(Object.entries(value), ([left], [right]) => left.localeCompare(right))
    .map(([key, entry]) => `${JSON.stringify(key)}:${canonicalize(entry)}`)
    .join(',')}}`
}

export function sha256Canonical(value: unknown) {
  return createHash('sha256').update(canonicalize(value)).digest('hex')
}

export function buildVersionContentManifest(input: {
  documentId: string
  documentVersionId: string
  versionNumber: number
  blocks: VersionManifestBlock[]
}) {
  const manifest = {
    hashVersion: 1,
    algorithm: 'SHA-256' as const,
    documentId: input.documentId,
    documentVersionId: input.documentVersionId,
    versionNumber: input.versionNumber,
    blocks: sortedCopy(input.blocks, (left, right) => left.ordinal - right.ordinal).map(
      (block) => ({
        stableKey: block.stableKey,
        ordinal: block.ordinal,
        blockType: block.blockType,
        contentHash: block.contentHash,
      }),
    ),
  }

  return { manifest, contentSha256: sha256Canonical(manifest) }
}

export function buildEvidenceEnvelope<T extends Record<string, unknown>>(evidence: T) {
  return {
    ...evidence,
    verification: {
      algorithm: 'SHA-256' as const,
      canonicalization: 'recursive-key-sort-json-v1' as const,
      evidenceSha256: sha256Canonical(evidence),
    },
  }
}
