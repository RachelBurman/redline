import { compareDocumentVersions as compareVersions } from '#/domain/documents/compare-document-versions'

import { getDocumentVersion } from './get-document-version'

import type { DocumentVersionComparison } from '#/types/document-versions'

export async function compareDocumentVersions(input: {
  documentId: string
  organizationId: string
  baseVersionId: string
  targetVersionId: string
}): Promise<DocumentVersionComparison> {
  const [baseVersion, targetVersion] = await Promise.all([
    getDocumentVersion({
      documentId: input.documentId,
      documentVersionId: input.baseVersionId,
      organizationId: input.organizationId,
    }),
    getDocumentVersion({
      documentId: input.documentId,
      documentVersionId: input.targetVersionId,
      organizationId: input.organizationId,
    }),
  ])

  return compareVersions({
    documentId: input.documentId,
    baseVersion: {
      id: baseVersion.version.id,
      versionNumber: baseVersion.version.versionNumber,
      blocks: baseVersion.blocks,
    },
    targetVersion: {
      id: targetVersion.version.id,
      versionNumber: targetVersion.version.versionNumber,
      blocks: targetVersion.blocks,
    },
  })
}
