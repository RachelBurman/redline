import { randomUUID } from 'node:crypto'

import { eq } from 'drizzle-orm'

import { db } from '#/db/index'
import { exports as exportRecords } from '#/db/schema'
import { appendAuditEvent } from '#/server/audit/append-audit-event'
import { assertCanExportDocument } from '#/server/auth/permissions'
import { getDocumentVersion } from '#/server/documents/get-document-version'
import { localObjectStore } from '#/server/storage/local-object-store'

import { buildResolvedDocx } from './build-resolved-docx'

interface ExportContext {
  organizationId: string
  projectId: string
  role: string
  userId: string
}

function downloadFilename(title: string, versionNumber: number) {
  const safeTitle = title
    .normalize('NFKD')
    .replace(/[^a-zA-Z0-9 _-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 110)
  return `${safeTitle || 'document'}-v${versionNumber}.docx`
}

export async function exportDocumentVersion(input: {
  context: ExportContext
  documentId: string
  documentVersionId: string
}) {
  assertCanExportDocument(input.context.role)
  const document = await getDocumentVersion({
    documentId: input.documentId,
    documentVersionId: input.documentVersionId,
    organizationId: input.context.organizationId,
  })
  const exportId = randomUUID()

  await db.insert(exportRecords).values({
    id: exportId,
    documentId: input.documentId,
    documentVersionId: input.documentVersionId,
    requestedById: input.context.userId,
    format: 'docx',
    status: 'pending',
  })

  try {
    const bytes = await buildResolvedDocx({
      title: document.document.title,
      blocks: document.blocks,
    })
    const filename = downloadFilename(document.document.title, document.version.versionNumber)
    const objectKey = `exports/${input.documentId}/${exportId}.docx`
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
          documentVersionId: input.documentVersionId,
          actorId: input.context.userId,
          eventType: 'document.version_exported',
          payload: {
            exportId,
            format: 'docx',
            filename,
            versionNumber: document.version.versionNumber,
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
      documentVersionId: input.documentVersionId,
      sha256: storedObject.sha256,
    }
  } catch (error) {
    await db
      .update(exportRecords)
      .set({
        status: 'failed',
        error: error instanceof Error ? error.message : 'The version export failed.',
        completedAt: new Date(),
      })
      .where(eq(exportRecords.id, exportId))
    throw error
  }
}
