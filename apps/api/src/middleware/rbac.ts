import { createMiddleware } from 'hono/factory'
import { eq, and, isNull } from 'drizzle-orm'
import type { Role } from '@poruch/types'
import { users, providerProfiles } from '@poruch/db/schema'
import type { AppEnv } from '../lib/bindings.js'
import { getDb } from '../lib/db.js'
import { DomainError } from '../lib/errors.js'

/** Require specific role(s) */
export function requireRole(...roles: Role[]) {
  return createMiddleware<AppEnv>(async (c, next) => {
    const userRole = c.get('role') as Role
    if (!roles.includes(userRole)) {
      throw DomainError.forbidden(`Role '${userRole}' is not allowed. Required: ${roles.join(', ')}`)
    }
    await next()
  })
}

/** Require admin role */
export const requireAdmin = requireRole('admin')

/** Require master (provider) role */
export const requireMaster = requireRole('master')

/** Resolve provider profile from authenticated user and set providerId in context */
export const resolveProvider = createMiddleware<AppEnv>(async (c, next) => {
  const db = getDb(c)
  const userId = c.get('userId')

  const user = await db.query.users.findFirst({
    where: eq(users.clerkId, userId),
  })
  if (!user) throw DomainError.notFound('User not found')

  const profile = await db.query.providerProfiles.findFirst({
    where: and(eq(providerProfiles.userId, user.id), isNull(providerProfiles.deletedAt)),
  })
  if (!profile) throw DomainError.notFound('Provider profile not found')

  c.set('providerId', profile.id)
  await next()
})
