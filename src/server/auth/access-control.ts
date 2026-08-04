import { createAccessControl } from 'better-auth/plugins/access'
import {
  adminAc,
  defaultStatements,
  memberAc,
  ownerAc,
} from 'better-auth/plugins/organization/access'

export const permissionStatements = {
  ...defaultStatements,
  project: ['create', 'read', 'update', 'archive'],
  document: ['create', 'read', 'edit', 'review', 'resolve', 'export', 'audit'],
  reviewRound: ['create', 'read', 'assign', 'complete'],
} as const

export const accessControl = createAccessControl(permissionStatements)

export const owner = accessControl.newRole({
  ...ownerAc.statements,
  project: ['create', 'read', 'update', 'archive'],
  document: ['create', 'read', 'edit', 'review', 'resolve', 'export', 'audit'],
  reviewRound: ['create', 'read', 'assign', 'complete'],
})

export const admin = accessControl.newRole({
  ...adminAc.statements,
  project: ['create', 'read', 'update', 'archive'],
  document: ['create', 'read', 'edit', 'review', 'resolve', 'export', 'audit'],
  reviewRound: ['create', 'read', 'assign', 'complete'],
})

export const editor = accessControl.newRole({
  ...memberAc.statements,
  project: ['read', 'update'],
  document: ['create', 'read', 'edit', 'review', 'resolve', 'export', 'audit'],
  reviewRound: ['create', 'read', 'assign', 'complete'],
})

export const reviewer = accessControl.newRole({
  ...memberAc.statements,
  project: ['read'],
  document: ['read', 'review', 'audit'],
  reviewRound: ['read'],
})

export const viewer = accessControl.newRole({
  ...memberAc.statements,
  project: ['read'],
  document: ['read'],
  reviewRound: ['read'],
})

export const auditor = accessControl.newRole({
  ...memberAc.statements,
  project: ['read'],
  document: ['read', 'audit'],
  reviewRound: ['read'],
})

export const organizationRoles = {
  owner,
  admin,
  editor,
  reviewer,
  viewer,
  auditor,
  member: viewer,
}

export type OrganizationRole = keyof typeof organizationRoles
