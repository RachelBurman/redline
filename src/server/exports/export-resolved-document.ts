import { randomUUID } from 'node:crypto'

import { eq } from 'drizzle-orm'

import { db } from '#/db/index'
import { exports as exportRecords } from '#/db/schema'
import { appendAuditEvent } from '#/server/audit/append-audit-event'
import { assertCanExportDocument } from '#/server/auth/permissions'
import { getDocument } from '#/server/documents/get-document'
import { localObjectStore } from '#/server/storage/local-object-store'

import { buildResolvedDocx } from './build-resolved-docx'

interface ExportContext {
  organizationId: string
  projectId: string
  role: string
  userId: string
}

function downloadFilename(title: string) {
  const safeTitle = title
    .normalize('NFKD')
    .replace(/[^a-zA-Z0-9 _-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 120)
  return `${safeTitle || 'resolved-document'}-resolved.docx`
}

export async function exportResolvedDocument(input: {
  context: ExportContext
  documentId: string
}) {
  assertCanExportDocument(input.context.role)
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
    format: 'docx',
    status: 'pending',
  })

  try {
    const bytes = await buildResolvedDocx({
      title: document.document.title,
      blocks: document.blocks,
    })
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
          documentVersionId: document.version.id,
          actorId: input.context.userId,
          eventType: 'document.exported',
          payload: {
            exportId,
            format: 'docx',
            filename: downloadFilename(document.document.title),
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
      filename: downloadFilename(document.document.title),
      exportId,
      documentVersionId: document.version.id,
      sha256: storedObject.sha256,
    }
  } catch (error) {
    await db
      .update(exportRecords)
      .set({
        status: 'failed',
        error: error instanceof Error ? error.message : 'The export failed.',
        completedAt: new Date(),
      })
      .where(eq(exportRecords.id, exportId))
    throw error
  }
}
