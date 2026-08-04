import { randomUUID } from 'node:crypto'

import { and, asc, eq, sql } from 'drizzle-orm'

import { member, organization } from '#/db/auth-schema'
import { db } from '#/db/index'
import { projects } from '#/db/schema'
import { appendAuditEvent } from '#/server/audit/append-audit-event'

import { createWorkspaceSlug } from './workspace-slug'

export interface WorkspaceSummary {
  organization: {
    id: string
    name: string
    slug: string
    role: string
  }
  project: {
    id: string
    name: string
  }
}

interface WorkspaceIdentity {
  userId: string
  userName: string
  activeOrganizationId?: string | null
}

export async function getOrCreateWorkspace(identity: WorkspaceIdentity): Promise<WorkspaceSummary> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${identity.userId}))`)

    const membershipCondition = identity.activeOrganizationId
      ? and(
          eq(member.userId, identity.userId),
          eq(member.organizationId, identity.activeOrganizationId),
        )
      : eq(member.userId, identity.userId)

    let [workspace] = await tx
      .select({
        organizationId: organization.id,
        organizationName: organization.name,
        organizationSlug: organization.slug,
        role: member.role,
      })
      .from(member)
      .innerJoin(organization, eq(member.organizationId, organization.id))
      .where(membershipCondition)
      .orderBy(asc(member.createdAt))
      .limit(1)

    let createdOrganization = false

    if (!workspace && identity.activeOrganizationId) {
      ;[workspace] = await tx
        .select({
          organizationId: organization.id,
          organizationName: organization.name,
          organizationSlug: organization.slug,
          role: member.role,
        })
        .from(member)
        .innerJoin(organization, eq(member.organizationId, organization.id))
        .where(eq(member.userId, identity.userId))
        .orderBy(asc(member.createdAt))
        .limit(1)
    }

    if (!workspace) {
      const organizationId = randomUUID()
      const now = new Date()
      const organizationName = `${identity.userName.trim() || 'My'}'s workspace`
      const organizationSlug = createWorkspaceSlug(identity.userName, organizationId)

      await tx.insert(organization).values({
        id: organizationId,
        name: organizationName,
        slug: organizationSlug,
        createdAt: now,
      })
      await tx.insert(member).values({
        id: randomUUID(),
        organizationId,
        userId: identity.userId,
        role: 'owner',
        createdAt: now,
      })

      workspace = {
        organizationId,
        organizationName,
        organizationSlug,
        role: 'owner',
      }
      createdOrganization = true
    }

    let [project] = await tx
      .select({ id: projects.id, name: projects.name })
      .from(projects)
      .where(eq(projects.organizationId, workspace.organizationId))
      .orderBy(asc(projects.createdAt))
      .limit(1)

    if (!project) {
      ;[project] = await tx
        .insert(projects)
        .values({
          organizationId: workspace.organizationId,
          name: 'Document reviews',
          description: 'Your first Redline document review project.',
          createdById: identity.userId,
        })
        .returning({ id: projects.id, name: projects.name })
    }

    if (!project) {
      throw new Error('The default project could not be created.')
    }

    if (createdOrganization) {
      await appendAuditEvent(tx, {
        organizationId: workspace.organizationId,
        projectId: project.id,
        actorId: identity.userId,
        eventType: 'workspace.created',
        payload: {
          organizationName: workspace.organizationName,
          projectName: project.name,
        },
      })
    }

    return {
      organization: {
        id: workspace.organizationId,
        name: workspace.organizationName,
        slug: workspace.organizationSlug,
        role: workspace.role,
      },
      project,
    }
  })
}
