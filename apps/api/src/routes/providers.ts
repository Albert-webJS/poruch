import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { eq, and, isNull } from 'drizzle-orm'
import { providerProfiles, providerServices, users } from '@poruch/db/schema'
import { UpdateProviderProfile, CreateProviderService, UpdateProviderService } from '@poruch/validators'
import type { AppEnv } from '../lib/bindings.js'
import { getDb } from '../lib/db.js'
import { success } from '../lib/response.js'
import { DomainError } from '../lib/errors.js'
import { requireAuth } from '../middleware/auth.js'
import { requireMaster } from '../middleware/rbac.js'

const providers = new Hono<AppEnv>()

// === Profile ===

// GET /providers/me — get current provider's profile
providers.get('/me', requireAuth, requireMaster, async (c) => {
  const db = getDb(c)
  const userId = c.get('userId')

  const user = await db.query.users.findFirst({
    where: eq(users.clerkId, userId),
  })
  if (!user) throw DomainError.notFound('User not found')

  const profile = await db.query.providerProfiles.findFirst({
    where: and(eq(providerProfiles.userId, user.id), isNull(providerProfiles.deletedAt)),
    with: {
      category: true,
      city: true,
      services: { where: eq(providerServices.isActive, true) },
      serviceAreas: { with: { district: true } },
    },
  })
  if (!profile) throw DomainError.notFound('Provider profile not found')

  return success(c, profile)
})

// PATCH /providers/me — update profile
providers.patch('/me', requireAuth, requireMaster, zValidator('json', UpdateProviderProfile), async (c) => {
  const db = getDb(c)
  const userId = c.get('userId')
  const body = c.req.valid('json')

  const user = await db.query.users.findFirst({
    where: eq(users.clerkId, userId),
  })
  if (!user) throw DomainError.notFound('User not found')

  const [updated] = await db
    .update(providerProfiles)
    .set({ ...body, updatedAt: new Date() })
    .where(and(eq(providerProfiles.userId, user.id), isNull(providerProfiles.deletedAt)))
    .returning()

  if (!updated) throw DomainError.notFound('Provider profile not found')

  return success(c, updated)
})

// POST /providers/me/publish — publish profile
providers.post('/me/publish', requireAuth, requireMaster, async (c) => {
  const db = getDb(c)
  const userId = c.get('userId')

  const user = await db.query.users.findFirst({
    where: eq(users.clerkId, userId),
  })
  if (!user) throw DomainError.notFound('User not found')

  const profile = await db.query.providerProfiles.findFirst({
    where: and(eq(providerProfiles.userId, user.id), isNull(providerProfiles.deletedAt)),
    with: { services: true },
  })

  if (!profile) throw DomainError.notFound('Provider profile not found')
  if (!profile.name || !profile.categoryId || !profile.cityId) {
    throw DomainError.validation('Profile must have name, category, and city before publishing')
  }
  if (!profile.services.length) {
    throw DomainError.validation('Profile must have at least one service before publishing')
  }

  const [updated] = await db
    .update(providerProfiles)
    .set({ status: 'published', updatedAt: new Date() })
    .where(eq(providerProfiles.id, profile.id))
    .returning()

  return success(c, updated)
})

// === Services ===

// GET /providers/me/services
providers.get('/me/services', requireAuth, requireMaster, async (c) => {
  const db = getDb(c)
  const userId = c.get('userId')

  const user = await db.query.users.findFirst({ where: eq(users.clerkId, userId) })
  if (!user) throw DomainError.notFound('User not found')

  const profile = await db.query.providerProfiles.findFirst({
    where: eq(providerProfiles.userId, user.id),
  })
  if (!profile) throw DomainError.notFound('Profile not found')

  const services = await db.query.providerServices.findMany({
    where: eq(providerServices.providerId, profile.id),
    orderBy: (s, { asc }) => [asc(s.sortOrder)],
  })

  return success(c, services)
})

// POST /providers/me/services
providers.post('/me/services', requireAuth, requireMaster, zValidator('json', CreateProviderService), async (c) => {
  const db = getDb(c)
  const userId = c.get('userId')
  const body = c.req.valid('json')

  const user = await db.query.users.findFirst({ where: eq(users.clerkId, userId) })
  if (!user) throw DomainError.notFound('User not found')

  const profile = await db.query.providerProfiles.findFirst({
    where: eq(providerProfiles.userId, user.id),
  })
  if (!profile) throw DomainError.notFound('Profile not found')

  // Validate price consistency
  if (body.priceType === 'on_request' && body.priceAmount !== null) {
    throw DomainError.validation('Price amount must be null for "on_request" price type')
  }
  if (body.priceType !== 'on_request' && (body.priceAmount === null || body.priceAmount === undefined)) {
    throw DomainError.validation('Price amount is required for "fixed" and "from" price types')
  }

  const [service] = await db
    .insert(providerServices)
    .values({ ...body, providerId: profile.id })
    .returning()

  return success(c, service, 201)
})

// PATCH /providers/me/services/:id
providers.patch('/me/services/:id', requireAuth, requireMaster, zValidator('json', UpdateProviderService), async (c) => {
  const db = getDb(c)
  const userId = c.get('userId')
  const serviceId = c.req.param('id')
  const body = c.req.valid('json')

  const user = await db.query.users.findFirst({ where: eq(users.clerkId, userId) })
  if (!user) throw DomainError.notFound('User not found')

  const profile = await db.query.providerProfiles.findFirst({
    where: eq(providerProfiles.userId, user.id),
  })
  if (!profile) throw DomainError.notFound('Profile not found')

  const [updated] = await db
    .update(providerServices)
    .set({ ...body, updatedAt: new Date() })
    .where(and(eq(providerServices.id, serviceId), eq(providerServices.providerId, profile.id)))
    .returning()

  if (!updated) throw DomainError.notFound('Service not found')

  return success(c, updated)
})

// DELETE /providers/me/services/:id (soft: set isActive=false)
providers.delete('/me/services/:id', requireAuth, requireMaster, async (c) => {
  const db = getDb(c)
  const userId = c.get('userId')
  const serviceId = c.req.param('id')

  const user = await db.query.users.findFirst({ where: eq(users.clerkId, userId) })
  if (!user) throw DomainError.notFound('User not found')

  const profile = await db.query.providerProfiles.findFirst({
    where: eq(providerProfiles.userId, user.id),
  })
  if (!profile) throw DomainError.notFound('Profile not found')

  const [deactivated] = await db
    .update(providerServices)
    .set({ isActive: false, updatedAt: new Date() })
    .where(and(eq(providerServices.id, serviceId), eq(providerServices.providerId, profile.id)))
    .returning()

  if (!deactivated) throw DomainError.notFound('Service not found')

  return success(c, { deleted: true })
})

export default providers
