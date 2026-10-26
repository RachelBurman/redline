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
  signatureRequest: ['create', 'read', 'cancel', 'sign'],
} as const

export const accessControl = createAccessControl(permissionStatements)

export const owner = accessControl.newRole({
  ...ownerAc.statements,
  project: ['create', 'read', 'update', 'archive'],
  document: ['create', 'read', 'edit', 'review', 'resolve', 'export', 'audit'],
  reviewRound: ['create', 'read', 'assign', 'complete'],
  signatureRequest: ['create', 'read', 'cancel', 'sign'],
})

export const admin = accessControl.newRole({
  ...adminAc.statements,
  project: ['create', 'read', 'update', 'archive'],
  document: ['create', 'read', 'edit', 'review', 'resolve', 'export', 'audit'],
  reviewRound: ['create', 'read', 'assign', 'complete'],
  signatureRequest: ['create', 'read', 'cancel', 'sign'],
})

export const editor = accessControl.newRole({
  ...memberAc.statements,
  project: ['read', 'update'],
  document: ['create', 'read', 'edit', 'review', 'resolve', 'export', 'audit'],
  reviewRound: ['create', 'read', 'assign', 'complete'],
  signatureRequest: ['create', 'read', 'cancel', 'sign'],
})

export const reviewer = accessControl.newRole({
  ...memberAc.statements,
  project: ['read'],
  document: ['read', 'review', 'audit'],
  reviewRound: ['read'],
  signatureRequest: ['read', 'sign'],
})

export const viewer = accessControl.newRole({
  ...memberAc.statements,
  project: ['read'],
  document: ['read'],
  reviewRound: ['read'],
  signatureRequest: ['read', 'sign'],
})

export const auditor = accessControl.newRole({
  ...memberAc.statements,
  project: ['read'],
  document: ['read', 'audit'],
  reviewRound: ['read'],
  signatureRequest: ['read'],
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
