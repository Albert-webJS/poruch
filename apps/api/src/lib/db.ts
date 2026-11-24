import { createDb, type Database } from '@poruch/db'
import type { Context } from 'hono'
import type { AppEnv } from './bindings.js'

export function getDb(c: Context<AppEnv>): Database {
  return createDb(c.env.HYPERDRIVE.connectionString)
}
