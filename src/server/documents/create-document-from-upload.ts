import { randomUUID } from 'node:crypto'

import { eq } from 'drizzle-orm'
import { z } from 'zod'

import { db } from '#/db/index'
import { documentBlocks, documentVersions, documents, reviewRounds } from '#/db/schema'
import { appendAuditEvent } from '#/server/audit/append-audit-event'
import { assertCanCreateDocument } from '#/server/auth/permissions'
import { localObjectStore } from '#/server/storage/local-object-store'

import { validateDocxFile, validateDocxSignature } from './docx-validation'
import { DocxParseError, parseDocx } from './parse-docx'

const uploadMetadataSchema = z.object({
  title: z.string().trim().min(1).max(300).optional(),
})

interface UploadContext {
  organizationId: string
  projectId: string
  role: string
  userId: string
}

export class PersistedDocxParseError extends DocxParseError {
  constructor(
    message: string,
    readonly documentId: string,
  ) {
    super(message)
    this.name = 'PersistedDocxParseError'
  }
}

function titleFromFilename(filename: string) {
  return (
    filename
      .replace(/\.docx$/i, '')
      .trim()
      .slice(0, 300) || 'Untitled document'
  )
}

export async function createDocumentFromUpload(input: {
  context: UploadContext
  file: File
  title?: string
}) {
  assertCanCreateDocument(input.context.role)
  validateDocxFile(input.file)
  const metadata = uploadMetadataSchema.parse({ title: input.title || undefined })
  const bytes = new Uint8Array(await input.file.arrayBuffer())
  validateDocxSignature(bytes)

  const documentId = randomUUID()
  const documentVersionId = randomUUID()
  const title = metadata.title ?? titleFromFilename(input.file.name)
  const objectKey = `sources/${documentId}/${randomUUID()}.docx`
  const storedObject = await localObjectStore.put(objectKey, bytes)

  let parsed
  try {
    parsed = parseDocx(bytes)
  } catch (error) {
    const message =
      error instanceof DocxParseError ? error.message : 'The Word document could not be parsed.'

    await db.transaction(async (tx) => {
      await tx.insert(documents).values({
        id: documentId,
        organizationId: input.context.organizationId,
        projectId: input.context.projectId,
        title,
        createdById: input.context.userId,
      })
      await tx.insert(documentVersions).values({
        id: documentVersionId,
        documentId,
        versionNumber: 1,
        origin: 'upload',
        status: 'failed',
        originalFilename: input.file.name,
        sourceObjectKey: storedObject.key,
        sourceSha256: storedObject.sha256,
        sourceByteSize: storedObject.byteSize,
        parseError: message,
        createdById: input.context.userId,
      })
      await appendAuditEvent(tx, {
        organizationId: input.context.organizationId,
        projectId: input.context.projectId,
        documentId,
        documentVersionId,
        actorId: input.context.userId,
        eventType: 'document.upload_failed',
        payload: {
          filename: input.file.name,
          sourceSha256: storedObject.sha256,
          reason: message,
        },
      })
    })

    throw new PersistedDocxParseError(message, documentId)
  }

  try {
    return await db.transaction(async (tx) => {
      const now = new Date()
      const reviewRoundId = randomUUID()

      await tx.insert(documents).values({
        id: documentId,
        organizationId: input.context.organizationId,
        projectId: input.context.projectId,
        title,
        createdById: input.context.userId,
      })
      await tx.insert(documentVersions).values({
        id: documentVersionId,
        documentId,
        versionNumber: 1,
        origin: 'upload',
        status: 'ready',
        originalFilename: input.file.name,
        sourceObjectKey: storedObject.key,
        sourceSha256: storedObject.sha256,
        sourceByteSize: storedObject.byteSize,
        parserVersion: parsed.parserVersion,
        parserWarnings: parsed.warnings,
        createdById: input.context.userId,
        publishedAt: now,
      })
      const insertedBlocks = await tx
        .insert(documentBlocks)
        .values(
          parsed.blocks.map((block) => ({
            documentVersionId,
            stableKey: block.stableKey,
            ordinal: block.ordinal,
            blockType: block.blockType,
            text: block.text,
            headingLevel: block.headingLevel,
            contentHash: block.contentHash,
            attributes: block.attributes,
          })),
        )
        .returning({ id: documentBlocks.id })
      await tx.insert(reviewRounds).values({
        id: reviewRoundId,
        documentId,
        documentVersionId,
        name: 'Review round 1',
        createdById: input.context.userId,
      })
      await tx
        .update(documents)
        .set({ currentVersionId: documentVersionId, updatedAt: now })
        .where(eq(documents.id, documentId))
      await appendAuditEvent(tx, {
        organizationId: input.context.organizationId,
        projectId: input.context.projectId,
        documentId,
        documentVersionId,
        reviewRoundId,
        actorId: input.context.userId,
        eventType: 'document.uploaded',
        payload: {
          filename: input.file.name,
          title,
          sourceSha256: storedObject.sha256,
          sourceByteSize: storedObject.byteSize,
          blockCount: insertedBlocks.length,
          parserWarnings: parsed.warnings,
        },
      })

      return {
        documentId,
        documentVersionId,
        reviewRoundId,
        title,
        blockCount: insertedBlocks.length,
        parserWarnings: parsed.warnings,
      }
    })
  } catch (error) {
    await localObjectStore.delete(storedObject.key).catch(() => undefined)
    throw error
  }
}
