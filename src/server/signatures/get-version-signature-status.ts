import { desc, eq, sql } from 'drizzle-orm'

import { db } from '#/db/index'
import { signatureRequests, signatureSlots } from '#/db/schema'

export async function getVersionSignatureStatus(documentVersionId: string) {
  const [request] = await db
    .select({ id: signatureRequests.id, status: signatureRequests.status })
    .from(signatureRequests)
    .where(eq(signatureRequests.documentVersionId, documentVersionId))
    .orderBy(desc(signatureRequests.createdAt))
    .limit(1)
  if (!request) return 'Unsigned'
  if (request.status === 'completed') return 'Fully signed'
  if (request.status === 'cancelled') return 'Cancelled'
  if (request.status === 'superseded') return 'Superseded'
  if (request.status === 'declined') return 'Declined'

  const [signed] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(signatureSlots)
    .where(eq(signatureSlots.signatureRequestId, request.id))
  return signed && signed.count > 0 ? 'Partially signed' : 'Unsigned — signature request pending'
}
