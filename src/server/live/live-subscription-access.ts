import { and, eq, isNull } from 'drizzle-orm'

import { db } from '#/db/index'
import { documents } from '#/db/schema'
import { assertDocumentAccess, DocumentAccessDeniedError } from '#/server/auth/document-access'

import type { DocumentAccessContext } from '#/server/auth/document-access'

export async function assertLiveSubscriptionAccess(input: {
  context: DocumentAccessContext
  documentId: string
}) {
  const [document] = await db
    .select({ id: documents.id })
    .from(documents)
    .where(
      and(
        eq(documents.id, input.documentId),
        eq(documents.organizationId, input.context.organizationId),
        isNull(documents.archivedAt),
      ),
    )
    .limit(1)
  if (!document) throw new DocumentAccessDeniedError()

  await assertDocumentAccess(input)
}
