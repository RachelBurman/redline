import { and, desc, eq, gte, lt } from 'drizzle-orm'

import { user } from '#/db/auth-schema'
import { db } from '#/db/index'
import { documentBlocks, documentPresence, documents } from '#/db/schema'
import { assertDocumentAccess } from '#/server/auth/document-access'
import { appendLiveEvent } from '#/server/live/live-events'
import { ReviewTargetError } from '#/server/reviews/review-errors'

import type { PresenceParticipant } from '#/types/presence'

const ACTIVE_WINDOW_MS = 30_000
const STALE_PRESENCE_RETENTION_MS = 24 * 60 * 60 * 1_000

export async function recordDocumentPresence(input: {
  organizationId: string
  documentId: string
  documentVersionId: string
  userId: string
  role: string
  clientId: string
  selectedBlockStableKey?: string | null
}) {
  const [, currentDocuments, selectedBlocks] = await Promise.all([
    assertDocumentAccess({
      context: input,
      documentId: input.documentId,
      documentVersionId: input.documentVersionId,
    }),
    db
      .select({ id: documents.id })
      .from(documents)
      .where(
        and(
          eq(documents.id, input.documentId),
          eq(documents.organizationId, input.organizationId),
          eq(documents.currentVersionId, input.documentVersionId),
        ),
      )
      .limit(1),
    input.selectedBlockStableKey
      ? db
          .select({ id: documentBlocks.id })
          .from(documentBlocks)
          .where(
            and(
              eq(documentBlocks.documentVersionId, input.documentVersionId),
              eq(documentBlocks.stableKey, input.selectedBlockStableKey),
            ),
          )
          .limit(1)
      : Promise.resolve([{ id: 'no-selection' }]),
  ])
  if (!currentDocuments[0]) {
    throw new ReviewTargetError('Presence cannot be attached to an older document version.')
  }
  if (!selectedBlocks[0]) {
    throw new ReviewTargetError('The selected presence block is not part of this document version.')
  }

  const now = new Date()
  await db.transaction(async (tx) => {
    const [existingPresence] = await tx
      .select({
        documentVersionId: documentPresence.documentVersionId,
        selectedBlockStableKey: documentPresence.selectedBlockStableKey,
      })
      .from(documentPresence)
      .where(
        and(
          eq(documentPresence.documentId, input.documentId),
          eq(documentPresence.userId, input.userId),
          eq(documentPresence.clientId, input.clientId),
        ),
      )
      .limit(1)
      .for('update')
    await tx
      .delete(documentPresence)
      .where(
        and(
          eq(documentPresence.documentId, input.documentId),
          lt(documentPresence.lastSeenAt, new Date(now.getTime() - STALE_PRESENCE_RETENTION_MS)),
        ),
      )
    await tx
      .insert(documentPresence)
      .values({
        documentId: input.documentId,
        documentVersionId: input.documentVersionId,
        userId: input.userId,
        clientId: input.clientId,
        selectedBlockStableKey: input.selectedBlockStableKey ?? null,
        lastSeenAt: now,
      })
      .onConflictDoUpdate({
        target: [documentPresence.documentId, documentPresence.userId, documentPresence.clientId],
        set: {
          documentVersionId: input.documentVersionId,
          selectedBlockStableKey: input.selectedBlockStableKey ?? null,
          lastSeenAt: now,
        },
      })
    const selectedBlockStableKey = input.selectedBlockStableKey ?? null
    if (
      !existingPresence ||
      existingPresence.documentVersionId !== input.documentVersionId ||
      existingPresence.selectedBlockStableKey !== selectedBlockStableKey
    ) {
      await appendLiveEvent(tx, {
        organizationId: input.organizationId,
        documentId: input.documentId,
        documentVersionId: input.documentVersionId,
        actorId: input.userId,
        eventType: existingPresence ? 'presence.changed' : 'presence.joined',
      })
    }
  })

  return { lastSeenAt: now.toISOString() }
}

export async function listActiveDocumentPresence(input: {
  organizationId: string
  documentId: string
  role: string
  userId: string
}): Promise<PresenceParticipant[]> {
  const activeAfter = new Date(Date.now() - ACTIVE_WINDOW_MS)
  const [, rows] = await Promise.all([
    assertDocumentAccess({ context: input, documentId: input.documentId }),
    db
      .select({
        userId: user.id,
        name: user.name,
        image: user.image,
        selectedBlockStableKey: documentPresence.selectedBlockStableKey,
        lastSeenAt: documentPresence.lastSeenAt,
      })
      .from(documentPresence)
      .innerJoin(user, eq(documentPresence.userId, user.id))
      .where(
        and(
          eq(documentPresence.documentId, input.documentId),
          gte(documentPresence.lastSeenAt, activeAfter),
        ),
      )
      .orderBy(desc(documentPresence.lastSeenAt)),
  ])

  const participants = new Map<string, PresenceParticipant>()
  for (const row of rows) {
    if (!participants.has(row.userId)) {
      participants.set(row.userId, {
        userId: row.userId,
        name: row.name,
        image: row.image,
        selectedBlockStableKey: row.selectedBlockStableKey,
        lastSeenAt: row.lastSeenAt.toISOString(),
      })
    }
  }

  return [...participants.values()]
}
