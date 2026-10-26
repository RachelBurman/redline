import { and, asc, eq, inArray } from 'drizzle-orm'

import { user } from '#/db/auth-schema'
import { db } from '#/db/index'
import {
  auditEvents,
  documentBlocks,
  documentVersions,
  documents,
  signatureRequests,
  signatureSlots,
} from '#/db/schema'
import { assertDocumentAccess } from '#/server/auth/document-access'

import { SignatureRequestNotFoundError } from './signature-errors'
import { buildEvidenceEnvelope, buildVersionContentManifest } from './signature-manifest'
import { signatureStatusLabel } from './signature-policy'

export async function getSignatureEvidence(input: {
  organizationId: string
  role: string
  userId: string
  documentId: string
  signatureRequestId: string
}) {
  const [request] = await db
    .select({
      id: signatureRequests.id,
      organizationId: signatureRequests.organizationId,
      documentId: documents.id,
      documentTitle: documents.title,
      documentVersionId: documentVersions.id,
      versionNumber: documentVersions.versionNumber,
      reviewRoundId: signatureRequests.reviewRoundId,
      requestedById: signatureRequests.requestedById,
      scope: signatureRequests.scope,
      purpose: signatureRequests.purpose,
      storedContentSha256: signatureRequests.contentSha256,
      status: signatureRequests.status,
      createdAt: signatureRequests.createdAt,
      completedAt: signatureRequests.completedAt,
      cancelledAt: signatureRequests.cancelledAt,
      supersededAt: signatureRequests.supersededAt,
      supersededByVersionId: signatureRequests.supersededByVersionId,
    })
    .from(signatureRequests)
    .innerJoin(documents, eq(signatureRequests.documentId, documents.id))
    .innerJoin(documentVersions, eq(signatureRequests.documentVersionId, documentVersions.id))
    .where(
      and(
        eq(signatureRequests.id, input.signatureRequestId),
        eq(signatureRequests.documentId, input.documentId),
        eq(signatureRequests.organizationId, input.organizationId),
      ),
    )
    .limit(1)
  if (!request) throw new SignatureRequestNotFoundError()

  await assertDocumentAccess({
    context: input,
    documentId: input.documentId,
    documentVersionId: request.documentVersionId,
  })

  const [blocks, slots, events] = await Promise.all([
    db
      .select({
        stableKey: documentBlocks.stableKey,
        ordinal: documentBlocks.ordinal,
        blockType: documentBlocks.blockType,
        contentHash: documentBlocks.contentHash,
      })
      .from(documentBlocks)
      .where(eq(documentBlocks.documentVersionId, request.documentVersionId))
      .orderBy(asc(documentBlocks.ordinal)),
    db
      .select({
        id: signatureSlots.id,
        signerId: signatureSlots.signerId,
        status: signatureSlots.status,
        verifiedEmail: signatureSlots.verifiedEmail,
        consentStatement: signatureSlots.consentStatement,
        signedAt: signatureSlots.signedAt,
        declinedAt: signatureSlots.declinedAt,
        declineReason: signatureSlots.declineReason,
      })
      .from(signatureSlots)
      .where(eq(signatureSlots.signatureRequestId, request.id))
      .orderBy(asc(signatureSlots.createdAt)),
    db
      .select({
        id: auditEvents.id,
        sequence: auditEvents.sequence,
        actorId: auditEvents.actorId,
        eventType: auditEvents.eventType,
        payload: auditEvents.payload,
        previousHash: auditEvents.previousHash,
        eventHash: auditEvents.eventHash,
        occurredAt: auditEvents.occurredAt,
      })
      .from(auditEvents)
      .where(
        and(
          eq(auditEvents.organizationId, input.organizationId),
          eq(auditEvents.requestId, request.id),
        ),
      )
      .orderBy(asc(auditEvents.sequence)),
  ])
  const userIds = [...new Set([request.requestedById, ...slots.map((slot) => slot.signerId)])]
  const users = await db
    .select({ id: user.id, name: user.name })
    .from(user)
    .where(inArray(user.id, userIds))
  const names = new Map(users.map((entry) => [entry.id, entry.name]))
  const content = buildVersionContentManifest({
    documentId: request.documentId,
    documentVersionId: request.documentVersionId,
    versionNumber: request.versionNumber,
    blocks,
  })

  return buildEvidenceEnvelope({
    schema: 'https://redline.local/schemas/signature-evidence/v1',
    assurance: 'baseline-electronic-sign-off',
    assuranceNotice:
      'This record does not claim Advanced Electronic Signature (AdES) or Qualified Electronic Signature (QES) compliance.',
    organizationId: request.organizationId,
    document: {
      id: request.documentId,
      title: request.documentTitle,
      versionId: request.documentVersionId,
      versionNumber: request.versionNumber,
    },
    content: {
      ...content,
      storedContentSha256: request.storedContentSha256,
      verified: content.contentSha256 === request.storedContentSha256,
    },
    request: {
      id: request.id,
      reviewRoundId: request.reviewRoundId,
      scope: request.scope,
      purpose: request.purpose,
      status: request.status,
      statusLabel: signatureStatusLabel(request.status),
      requestedBy: { id: request.requestedById, name: names.get(request.requestedById) ?? null },
      createdAt: request.createdAt.toISOString(),
      completedAt: request.completedAt?.toISOString() ?? null,
      cancelledAt: request.cancelledAt?.toISOString() ?? null,
      supersededAt: request.supersededAt?.toISOString() ?? null,
      supersededByVersionId: request.supersededByVersionId,
    },
    signers: slots.map((slot) => ({
      id: slot.signerId,
      name: names.get(slot.signerId) ?? null,
      slotId: slot.id,
      status: slot.status,
      verifiedEmailAtSigning: slot.verifiedEmail,
      consentStatement: slot.consentStatement,
      signedAt: slot.signedAt?.toISOString() ?? null,
      declinedAt: slot.declinedAt?.toISOString() ?? null,
      declineReason: slot.declineReason,
    })),
    auditEvents: events.map((event) => ({
      id: event.id,
      sequence: event.sequence,
      actorId: event.actorId,
      eventType: event.eventType,
      payload: event.payload,
      previousHash: event.previousHash,
      eventHash: event.eventHash,
      occurredAt: event.occurredAt.toISOString(),
    })),
    generatedAt: new Date().toISOString(),
  })
}

export function buildSignatureCertificate(
  evidence: Awaited<ReturnType<typeof getSignatureEvidence>>,
) {
  const lines = [
    'REDLINE ELECTRONIC SIGN-OFF CERTIFICATE',
    'Baseline electronic sign-off — not an AdES or QES claim',
    '',
    `Document: ${evidence.document.title}`,
    `Version: ${evidence.document.versionNumber} (${evidence.document.versionId})`,
    `Request: ${evidence.request.id}`,
    `Status: ${evidence.request.statusLabel}`,
    `Purpose: ${evidence.request.purpose}`,
    `Content SHA-256: ${evidence.content.contentSha256}`,
    `Content hash verified: ${evidence.content.verified ? 'yes' : 'NO'}`,
    '',
    'Required signers:',
    ...evidence.signers.map(
      (signer) =>
        `- ${signer.name ?? signer.id}: ${signer.status}${signer.signedAt ? ` at ${signer.signedAt}` : ''}`,
    ),
    '',
    `Evidence SHA-256: ${evidence.verification.evidenceSha256}`,
    `Generated UTC: ${evidence.generatedAt}`,
  ]
  return lines.join('\n')
}
