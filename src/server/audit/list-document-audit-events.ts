import { and, desc, eq, inArray } from 'drizzle-orm'

import { user } from '#/db/auth-schema'
import { db } from '#/db/index'
import { auditEvents } from '#/db/schema'
import {
  assertDocumentAccess,
  listAccessibleDocumentVersionIds,
} from '#/server/auth/document-access'
import { assertCanExportReviewQueue } from '#/server/auth/permissions'

import type { DocumentAuditEvent } from '#/types/audit'

export async function listDocumentAuditEvents(input: {
  documentId: string
  organizationId: string
  role: string
  userId: string
}): Promise<DocumentAuditEvent[]> {
  assertCanExportReviewQueue(input.role)

  const [, accessibleVersionIds] = await Promise.all([
    assertDocumentAccess({ context: input, documentId: input.documentId }),
    listAccessibleDocumentVersionIds({ context: input, documentId: input.documentId }),
  ])
  const rows = await db
    .select({
      id: auditEvents.id,
      sequence: auditEvents.sequence,
      eventType: auditEvents.eventType,
      payload: auditEvents.payload,
      actorId: user.id,
      actorName: user.name,
      documentVersionId: auditEvents.documentVersionId,
      reviewItemId: auditEvents.reviewItemId,
      previousHash: auditEvents.previousHash,
      eventHash: auditEvents.eventHash,
      occurredAt: auditEvents.occurredAt,
    })
    .from(auditEvents)
    .innerJoin(user, eq(auditEvents.actorId, user.id))
    .where(
      and(
        eq(auditEvents.organizationId, input.organizationId),
        eq(auditEvents.documentId, input.documentId),
        accessibleVersionIds === null
          ? undefined
          : inArray(auditEvents.documentVersionId, [...accessibleVersionIds]),
      ),
    )
    .orderBy(desc(auditEvents.sequence))
    .limit(200)

  return rows.map((row) => ({
    id: row.id,
    sequence: row.sequence,
    eventType: row.eventType,
    payload: row.payload,
    actor: { id: row.actorId, name: row.actorName },
    documentVersionId: row.documentVersionId,
    reviewItemId: row.reviewItemId,
    previousHash: row.previousHash,
    eventHash: row.eventHash,
    occurredAt: row.occurredAt.toISOString(),
  }))
}
