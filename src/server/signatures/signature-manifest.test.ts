import { describe, expect, it } from 'vitest'

import {
  buildEvidenceEnvelope,
  buildVersionContentManifest,
  sha256Canonical,
} from './signature-manifest'

describe('signature evidence hashing', () => {
  it('hashes objects independently of key insertion order', () => {
    expect(sha256Canonical({ beta: 2, alpha: { zulu: true, echo: null } })).toBe(
      sha256Canonical({ alpha: { echo: null, zulu: true }, beta: 2 }),
    )
  })

  it('binds the version identity and ordered block hashes into the content hash', () => {
    const result = buildVersionContentManifest({
      documentId: 'document-1',
      documentVersionId: 'version-2',
      versionNumber: 2,
      blocks: [
        { stableKey: 'b', ordinal: 1, blockType: 'paragraph', contentHash: 'hash-b' },
        { stableKey: 'a', ordinal: 0, blockType: 'heading', contentHash: 'hash-a' },
      ],
    })

    expect(result.manifest.blocks.map((block) => block.stableKey)).toEqual(['a', 'b'])
    expect(result.contentSha256).toMatch(/^[a-f0-9]{64}$/)
    expect(result.contentSha256).not.toBe(
      buildVersionContentManifest({
        documentId: 'document-1',
        documentVersionId: 'version-3',
        versionNumber: 3,
        blocks: result.manifest.blocks,
      }).contentSha256,
    )
  })

  it('adds a reproducible evidence hash without hashing itself', () => {
    const evidence = { requestId: 'request-1', status: 'completed' }
    expect(buildEvidenceEnvelope(evidence).verification.evidenceSha256).toBe(
      sha256Canonical(evidence),
    )
  })
})
