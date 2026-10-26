import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'

import { reviewCategories, reviewPriorities } from '#/domain/review/review-options'
import { requireWorkspaceContext } from '#/server/auth/require-workspace-context'
import { assertSameOrigin } from '#/server/http/assert-same-origin'
import { createMediaProposal } from '#/server/media/create-media-proposal'
import { MEDIA_LIMITS, UnsafeMediaError } from '#/server/media/image-processing'
import { mediaErrorResponse } from '#/server/media/media-error-response'

const fieldsSchema = z.object({
  documentVersionId: z.uuid(),
  reviewRoundId: z.uuid(),
  targetBlockId: z.uuid(),
  beforeBlockId: z.union([z.uuid(), z.literal('')]).transform((value) => value || null),
  changeType: z.enum(['media_insert', 'media_replace']),
  altText: z.string(),
  caption: z.string().transform((value) => value.trim() || null),
  source: z.string().transform((value) => value.trim() || null),
  category: z.enum(reviewCategories),
  priority: z.enum(reviewPriorities),
  rationale: z.string(),
})

export const Route = createFileRoute('/api/v1/documents/$documentId/media-proposals')({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        try {
          assertSameOrigin(request)
          const contentLength = Number(request.headers.get('content-length') ?? 0)
          if (contentLength > MEDIA_LIMITS.compressedBytes + 1024 * 1024) {
            return Response.json(
              { error: { code: 'FILE_TOO_LARGE', message: 'Images must be 10 MB or smaller.' } },
              { status: 413 },
            )
          }
          const documentId = z.uuid().parse(params.documentId)
          const { session, workspace } = await requireWorkspaceContext(request)
          const form = await request.formData()
          const file = form.get('file')
          if (!(file instanceof File)) {
            throw new UnsafeMediaError('Choose a PNG or JPEG image.', 'EMPTY_FILE')
          }
          const fields = fieldsSchema.parse(Object.fromEntries(form.entries()))
          const result = await createMediaProposal({
            context: {
              organizationId: workspace.organization.id,
              projectId: workspace.project.id,
              role: workspace.organization.role,
              userId: session.user.id,
            },
            documentId,
            ...fields,
            file,
          })
          return Response.json({ data: result }, { status: 201 })
        } catch (error) {
          return mediaErrorResponse(error)
        }
      },
    },
  },
})
