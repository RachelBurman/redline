import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'

import { requireWorkspaceContext } from '#/server/auth/require-workspace-context'
import {
  buildSignatureCertificate,
  getSignatureEvidence,
} from '#/server/signatures/get-signature-evidence'
import { signatureErrorResponse } from '#/server/signatures/signature-error-response'

export const Route = createFileRoute(
  '/api/v1/documents/$documentId/signature-requests/$signatureRequestId/evidence',
)({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        try {
          const documentId = z.uuid().parse(params.documentId)
          const signatureRequestId = z.uuid().parse(params.signatureRequestId)
          const format = z
            .enum(['json', 'certificate'])
            .default('json')
            .parse(new URL(request.url).searchParams.get('format') ?? undefined)
          const { session, workspace } = await requireWorkspaceContext(request)
          const evidence = await getSignatureEvidence({
            organizationId: workspace.organization.id,
            role: workspace.organization.role,
            userId: session.user.id,
            documentId,
            signatureRequestId,
          })
          const filename = `redline-signature-${signatureRequestId}`
          if (format === 'certificate') {
            return new Response(buildSignatureCertificate(evidence), {
              headers: {
                'Content-Type': 'text/plain; charset=utf-8',
                'Content-Disposition': `attachment; filename="${filename}-certificate.txt"`,
                'Cache-Control': 'private, no-store',
                'X-Content-Type-Options': 'nosniff',
              },
            })
          }
          return new Response(JSON.stringify(evidence, null, 2), {
            headers: {
              'Content-Type': 'application/json; charset=utf-8',
              'Content-Disposition': `attachment; filename="${filename}-manifest.json"`,
              'Cache-Control': 'private, no-store',
              'X-Content-Type-Options': 'nosniff',
            },
          })
        } catch (error) {
          return signatureErrorResponse(error)
        }
      },
    },
  },
})
