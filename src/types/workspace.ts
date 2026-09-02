import type { WorkspaceCapabilities } from '#/server/auth/permissions'

export interface WorkspaceSummary {
  capabilities: WorkspaceCapabilities
  organization: { id: string; name: string; slug: string; role: string }
  project: { id: string; name: string }
}
