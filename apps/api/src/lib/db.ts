import { createDb, type Database } from '@poruch/db'
import type { Context } from 'hono'
import type { AppEnv } from './bindings.js'

export function getDb(c: Context<AppEnv>): Database {
  const connectionString = c.env.HYPERDRIVE?.connectionString ?? c.env.DATABASE_URL
  if (!connectionString) throw new Error('No database connection string configured')
  return createDb(connectionString)
}
