import { createMiddleware } from 'hono/factory'
import { eq, and, isNull } from 'drizzle-orm'
import type { Role } from '@poruch/types'
import { users, providerProfiles } from '@poruch/db/schema'
import type { AppEnv } from '../lib/bindings.js'
import { getDb } from '../lib/db.js'
import { DomainError } from '../lib/errors.js'

export function requireRole(...roles: Role[]) {
  return createMiddleware<AppEnv>(async (c, next) => {
    const userRole = c.get('role') as Role
    if (!roles.includes(userRole)) {
      throw DomainError.forbidden(`Role '${userRole}' is not allowed. Required: ${roles.join(', ')}`)
    }
    await next()
  })
}

export const requireAdmin = requireRole('admin')

export const requireMaster = requireRole('master')

export const resolveProvider = createMiddleware<AppEnv>(async (c, next) => {
  const db = getDb(c)
  const userId = c.get('userId')

  let user = await db.query.users.findFirst({
    where: eq(users.clerkId, userId),
  })

  // Dev mode: auto-create demo user and provider if not found
  if (!user && c.env.ENVIRONMENT === 'development' && userId.startsWith('demo_')) {
    const category = await db.query.serviceCategories.findFirst()
    const city = await db.query.cities.findFirst()
    if (!category || !city) throw DomainError.notFound('Run db:seed first — no categories/cities in DB')

    const inserted = await db.insert(users).values({
      clerkId: userId,
      email: `${userId}@demo.poruch.app`,
      role: 'master',
    }).returning()
    const newUser = inserted[0]
    if (!newUser) throw DomainError.notFound('Failed to create demo user')

    await db.insert(providerProfiles).values({
      userId: newUser.id,
      slug: userId.replace('_', '-'),
      name: 'Demo Provider',
      categoryId: category.id,
      cityId: city.id,
      status: 'draft',
    })

    user = newUser
    console.log(`[dev] Auto-created demo user & provider for ${userId}`)
  }

  if (!user) throw DomainError.notFound('User not found')

  const profile = await db.query.providerProfiles.findFirst({
    where: and(eq(providerProfiles.userId, user.id), isNull(providerProfiles.deletedAt)),
  })
  if (!profile) throw DomainError.notFound('Provider profile not found')

  c.set('providerId', profile.id)
  await next()
})
