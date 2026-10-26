import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'

import { requireWorkspaceContext } from '#/server/auth/require-workspace-context'
import { sendSignatureRequestEmail } from '#/server/email/send-signature-request-email'
import { assertSameOrigin } from '#/server/http/assert-same-origin'
import { readJsonBody } from '#/server/http/read-json-body'
import { createSignatureRequest } from '#/server/signatures/create-signature-request'
import { listSignatureRequests } from '#/server/signatures/list-signature-requests'
import { recordSignatureNotification } from '#/server/signatures/record-signature-notification'
import { signatureErrorResponse } from '#/server/signatures/signature-error-response'

const createRequestSchema = z.object({
  documentVersionId: z.uuid(),
  scope: z.enum(['individual', 'everyone']),
  purpose: z.string().trim().min(3).max(500),
})

export const Route = createFileRoute('/api/v1/documents/$documentId/signature-requests')({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        try {
          const documentId = z.uuid().parse(params.documentId)
          const documentVersionId = z
            .uuid()
            .parse(new URL(request.url).searchParams.get('documentVersionId'))
          const { session, workspace } = await requireWorkspaceContext(request)
          const requests = await listSignatureRequests({
            organizationId: workspace.organization.id,
            role: workspace.organization.role,
            userId: session.user.id,
            documentId,
            documentVersionId,
          })
          return Response.json({ data: requests })
        } catch (error) {
          return signatureErrorResponse(error)
        }
      },
      POST: async ({ request, params }) => {
        try {
          assertSameOrigin(request)
          const documentId = z.uuid().parse(params.documentId)
          const body = await readJsonBody(request, createRequestSchema)
          const { session, workspace } = await requireWorkspaceContext(request)
          const created = await createSignatureRequest({
            context: {
              organizationId: workspace.organization.id,
              projectId: workspace.project.id,
              role: workspace.organization.role,
              userId: session.user.id,
            },
            documentId,
            ...body,
          })
          let notificationFailures = 0
          await Promise.all(
            created.signers.map(async (signer) => {
              let outcome: 'sent' | 'failed' = 'sent'
              try {
                await sendSignatureRequestEmail({
                  recipient: signer.email,
                  documentTitle: created.documentTitle,
                  versionNumber: created.versionNumber,
                  requesterName: session.user.name,
                  purpose: created.purpose,
                  requestUrl: new URL(`/app/documents/${documentId}`, request.url).toString(),
                })
              } catch (error) {
                outcome = 'failed'
                notificationFailures += 1
                console.error('Signature notification failed', error)
              }
              await recordSignatureNotification({
                organizationId: workspace.organization.id,
                projectId: workspace.project.id,
                documentId,
                documentVersionId: created.documentVersionId,
                reviewRoundId: created.reviewRoundId,
                actorId: session.user.id,
                signatureRequestId: created.id,
                signerId: signer.id,
                outcome,
              })
            }),
          )
          return Response.json({ data: { id: created.id, notificationFailures } }, { status: 201 })
        } catch (error) {
          return signatureErrorResponse(error)
        }
      },
    },
  },
})
