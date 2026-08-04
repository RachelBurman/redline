import { createFileRoute } from '@tanstack/react-router'

import { requireSession } from '#/server/auth/require-session'
import { getOrCreateWorkspace } from '#/server/workspace/get-or-create-workspace'

async function handleWorkspaceRequest(request: Request) {
  try {
    const session = await requireSession(request)
    const workspace = await getOrCreateWorkspace({
      userId: session.user.id,
      userName: session.user.name,
      activeOrganizationId: session.session.activeOrganizationId,
    })

    return Response.json({ data: workspace })
  } catch (error) {
    if (error instanceof Error && error.name === 'AuthenticationRequiredError') {
      return Response.json(
        { error: { code: 'UNAUTHENTICATED', message: error.message } },
        { status: 401 },
      )
    }

    console.error('Workspace request failed', error)
    return Response.json(
      { error: { code: 'WORKSPACE_UNAVAILABLE', message: 'The workspace could not be loaded.' } },
      { status: 500 },
    )
  }
}

export const Route = createFileRoute('/api/v1/workspace')({
  server: {
    handlers: {
      GET: ({ request }) => handleWorkspaceRequest(request),
      POST: ({ request }) => handleWorkspaceRequest(request),
    },
  },
})
