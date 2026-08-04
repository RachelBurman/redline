import { getOrCreateWorkspace } from '#/server/workspace/get-or-create-workspace'

import { requireSession } from './require-session'

export async function requireWorkspaceContext(request: Request) {
  const session = await requireSession(request)
  const workspace = await getOrCreateWorkspace({
    userId: session.user.id,
    userName: session.user.name,
    activeOrganizationId: session.session.activeOrganizationId,
  })

  return { session, workspace }
}
