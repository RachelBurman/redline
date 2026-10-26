import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'

import { requireWorkspaceContext } from '#/server/auth/require-workspace-context'
import { getMediaAsset } from '#/server/media/get-media-asset'
import { mediaErrorResponse } from '#/server/media/media-error-response'

export const Route = createFileRoute('/api/v1/documents/$documentId/media/$assetId')({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        try {
          const documentId = z.uuid().parse(params.documentId)
          const assetId = z.uuid().parse(params.assetId)
          const variant =
            new URL(request.url).searchParams.get('variant') === 'preview' ? 'preview' : 'original'
          const { session, workspace } = await requireWorkspaceContext(request)
          const asset = await getMediaAsset({
            assetId,
            documentId,
            organizationId: workspace.organization.id,
            role: workspace.organization.role,
            userId: session.user.id,
            variant,
          })
          return new Response(Buffer.from(asset.bytes), {
            headers: {
              'Cache-Control': 'private, no-store',
              'Content-Length': String(asset.bytes.byteLength),
              'Content-Type': asset.mimeType,
              'X-Content-Type-Options': 'nosniff',
            },
          })
        } catch (error) {
          return mediaErrorResponse(error)
        }
      },
    },
  },
})
