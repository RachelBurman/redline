import { and, desc, eq, gte } from 'drizzle-orm'

import { user } from '#/db/auth-schema'
import { db } from '#/db/index'
import { documentPresence } from '#/db/schema'
import { getDocument } from '#/server/documents/get-document'
import { ReviewTargetError } from '#/server/reviews/review-errors'

import type { PresenceParticipant } from '#/types/presence'

const ACTIVE_WINDOW_MS = 30_000

export async function recordDocumentPresence(input: {
  organizationId: string
  documentId: string
  documentVersionId: string
  userId: string
  clientId: string
  selectedBlockStableKey?: string | null
}) {
  const document = await getDocument({
    documentId: input.documentId,
    organizationId: input.organizationId,
  })
  if (document.version.id !== input.documentVersionId) {
    throw new ReviewTargetError('Presence cannot be attached to an older document version.')
  }
  if (
    input.selectedBlockStableKey &&
    !document.blocks.some((block) => block.stableKey === input.selectedBlockStableKey)
  ) {
    throw new ReviewTargetError('The selected presence block is not part of this document version.')
  }

  const now = new Date()
  await db
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

  return { lastSeenAt: now.toISOString() }
}

export async function listActiveDocumentPresence(input: {
  organizationId: string
  documentId: string
}): Promise<PresenceParticipant[]> {
  await getDocument({
    documentId: input.documentId,
    organizationId: input.organizationId,
  })

  const activeAfter = new Date(Date.now() - ACTIVE_WINDOW_MS)
  const rows = await db
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
    .orderBy(desc(documentPresence.lastSeenAt))

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
