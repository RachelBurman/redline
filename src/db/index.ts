import { drizzle } from 'drizzle-orm/node-postgres'

import { appEnvironment } from '#/server/config/app-environment'

import * as authSchema from './auth-schema'
import * as appSchema from './schema'

const schema = { ...authSchema, ...appSchema }

export const db = drizzle(appEnvironment.databaseUrl, { schema })
