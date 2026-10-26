import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'

import { requireWorkspaceContext } from '#/server/auth/require-workspace-context'
import { assertSameOrigin } from '#/server/http/assert-same-origin'
import { readJsonBody } from '#/server/http/read-json-body'
import { createMediaMetadataProposal } from '#/server/media/create-media-metadata-proposal'
import { mediaErrorResponse } from '#/server/media/media-error-response'
import { createMediaMetadataProposalSchema } from '#/server/reviews/schemas'

export const Route = createFileRoute('/api/v1/documents/$documentId/media-metadata-proposals')({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        try {
          assertSameOrigin(request)
          const documentId = z.uuid().parse(params.documentId)
          const proposal = await readJsonBody(request, createMediaMetadataProposalSchema)
          const { session, workspace } = await requireWorkspaceContext(request)
          const result = await createMediaMetadataProposal({
            context: {
              organizationId: workspace.organization.id,
              projectId: workspace.project.id,
              role: workspace.organization.role,
              userId: session.user.id,
            },
            documentId,
            proposal,
          })
          return Response.json({ data: result }, { status: 201 })
        } catch (error) {
          return mediaErrorResponse(error)
        }
      },
    },
  },
})
