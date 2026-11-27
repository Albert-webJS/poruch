import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { eq, and, isNull } from 'drizzle-orm'
import { providerProfiles, providerServices } from '@poruch/db/schema'
import { UpdateProviderProfile, UpdateProviderSlug, CreateProviderService, UpdateProviderService } from '@poruch/validators'
import type { AppEnv } from '../lib/bindings.js'
import { getDb } from '../lib/db.js'
import { success } from '../lib/response.js'
import { DomainError } from '../lib/errors.js'
import { requireAuth } from '../middleware/auth.js'
import { requireMaster, resolveProvider } from '../middleware/rbac.js'

const providers = new Hono<AppEnv>()

providers.use('*', requireAuth, requireMaster, resolveProvider)

providers.get('/me', async (c) => {
  const db = getDb(c)
  const providerId = c.get('providerId')!

  const profile = await db.query.providerProfiles.findFirst({
    where: and(eq(providerProfiles.id, providerId), isNull(providerProfiles.deletedAt)),
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

providers.patch('/me', zValidator('json', UpdateProviderProfile), async (c) => {
  const db = getDb(c)
  const providerId = c.get('providerId')!
  const body = c.req.valid('json')

  const [updated] = await db
    .update(providerProfiles)
    .set({ ...body, updatedAt: new Date() })
    .where(and(eq(providerProfiles.id, providerId), isNull(providerProfiles.deletedAt)))
    .returning()

  if (!updated) throw DomainError.notFound('Provider profile not found')

  // Return full profile with relations (same as GET /me)
  const profile = await db.query.providerProfiles.findFirst({
    where: and(eq(providerProfiles.id, providerId), isNull(providerProfiles.deletedAt)),
    with: {
      category: true,
      city: true,
      services: { where: eq(providerServices.isActive, true) },
      serviceAreas: { with: { district: true } },
    },
  })

  return success(c, profile)
})

providers.patch('/me/slug', zValidator('json', UpdateProviderSlug), async (c) => {
  const db = getDb(c)
  const providerId = c.get('providerId')!
  const { slug } = c.req.valid('json')

  // Check uniqueness
  const existing = await db.query.providerProfiles.findFirst({
    where: and(eq(providerProfiles.slug, slug), isNull(providerProfiles.deletedAt)),
    columns: { id: true },
  })
  if (existing && existing.id !== providerId) {
    throw DomainError.validation('Це посилання вже зайняте')
  }

  await db
    .update(providerProfiles)
    .set({ slug, updatedAt: new Date() })
    .where(eq(providerProfiles.id, providerId))

  const profile = await db.query.providerProfiles.findFirst({
    where: and(eq(providerProfiles.id, providerId), isNull(providerProfiles.deletedAt)),
    with: {
      category: true,
      city: true,
      services: { where: eq(providerServices.isActive, true) },
      serviceAreas: { with: { district: true } },
    },
  })

  return success(c, profile)
})

providers.post('/me/publish', async (c) => {
  const db = getDb(c)
  const providerId = c.get('providerId')!

  const profile = await db.query.providerProfiles.findFirst({
    where: and(eq(providerProfiles.id, providerId), isNull(providerProfiles.deletedAt)),
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

providers.get('/me/services', async (c) => {
  const db = getDb(c)
  const providerId = c.get('providerId')!

  const services = await db.query.providerServices.findMany({
    where: eq(providerServices.providerId, providerId),
    orderBy: (s, { asc }) => [asc(s.sortOrder)],
  })

  return success(c, services)
})

providers.post('/me/services', zValidator('json', CreateProviderService), async (c) => {
  const db = getDb(c)
  const providerId = c.get('providerId')!
  const body = c.req.valid('json')

  if (body.priceType === 'on_request' && body.priceAmount !== null) {
    throw DomainError.validation('Price amount must be null for "on_request" price type')
  }
  if (body.priceType !== 'on_request' && (body.priceAmount === null || body.priceAmount === undefined)) {
    throw DomainError.validation('Price amount is required for "fixed" and "from" price types')
  }

  const [service] = await db
    .insert(providerServices)
    .values({ ...body, providerId })
    .returning()

  return success(c, service, 201)
})

providers.patch('/me/services/:id', zValidator('json', UpdateProviderService), async (c) => {
  const db = getDb(c)
  const providerId = c.get('providerId')!
  const serviceId = c.req.param('id')
  const body = c.req.valid('json')

  const [updated] = await db
    .update(providerServices)
    .set({ ...body, updatedAt: new Date() })
    .where(and(eq(providerServices.id, serviceId), eq(providerServices.providerId, providerId)))
    .returning()

  if (!updated) throw DomainError.notFound('Service not found')

  return success(c, updated)
})

providers.delete('/me/services/:id', async (c) => {
  const db = getDb(c)
  const providerId = c.get('providerId')!
  const serviceId = c.req.param('id')

  const [deactivated] = await db
    .update(providerServices)
    .set({ isActive: false, updatedAt: new Date() })
    .where(and(eq(providerServices.id, serviceId), eq(providerServices.providerId, providerId)))
    .returning()

  if (!deactivated) throw DomainError.notFound('Service not found')

  return success(c, { deleted: true })
})

export default providers
