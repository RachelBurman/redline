import { organizationClient } from 'better-auth/client/plugins'
import { createAuthClient } from 'better-auth/react'

import { accessControl, organizationRoles } from '#/server/auth/access-control'

export const authClient = createAuthClient({
  basePath: '/api/v1/auth',
  plugins: [
    organizationClient({
      ac: accessControl,
      roles: organizationRoles,
    }),
  ],
})
