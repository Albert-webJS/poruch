import { Hono } from 'hono'
import { eq, and, isNull, asc } from 'drizzle-orm'
import { providerProfiles, providerServices, serviceCategories } from '@poruch/db/schema'
import type { AppEnv } from '../lib/bindings.js'
import { getDb } from '../lib/db.js'
import { success } from '../lib/response.js'
import { DomainError } from '../lib/errors.js'

const publicRoutes = new Hono<AppEnv>()

// GET /public/providers/:slug — public provider profile
publicRoutes.get('/providers/:slug', async (c) => {
  const db = getDb(c)
  const slug = c.req.param('slug')

  const profile = await db.query.providerProfiles.findFirst({
    where: and(
      eq(providerProfiles.slug, slug),
      eq(providerProfiles.status, 'published'),
      isNull(providerProfiles.deletedAt),
    ),
    with: {
      category: true,
      city: true,
      services: {
        where: eq(providerServices.isActive, true),
        orderBy: [asc(providerServices.sortOrder)],
      },
      serviceAreas: {
        with: { district: true },
      },
      mediaAssets: {
        orderBy: (m, { asc }) => [asc(m.sortOrder)],
      },
      reviews: {
        where: (r, { eq }) => eq(r.isPublished, true),
        orderBy: (r, { desc }) => [desc(r.createdAt)],
        limit: 10,
        with: { clientContact: { columns: { name: true } } },
      },
    },
  })

  if (!profile) throw DomainError.notFound('Provider not found')

  return success(c, {
    id: profile.id,
    slug: profile.slug,
    name: profile.name,
    description: profile.description,
    categoryName: profile.category.nameUk,
    cityName: profile.city.nameUk,
    photoUrl: profile.photoUrl,
    services: profile.services.map((s) => ({
      id: s.id,
      name: s.name,
      description: s.description,
      priceType: s.priceType,
      priceAmount: s.priceAmount,
      durationMinutes: s.durationMinutes,
    })),
    districts: profile.serviceAreas.map((sa) => sa.district.nameUk),
    photos: profile.mediaAssets.map((m) => ({ id: m.id, url: m.url })),
    reviews: profile.reviews.map((r) => ({
      rating: r.rating,
      comment: r.comment,
      clientName: r.clientContact.name,
      createdAt: r.createdAt,
      providerReply: r.providerReply,
    })),
    acceptingBookings: true,
  })
})

// GET /public/categories — list all categories
publicRoutes.get('/categories', async (c) => {
  const db = getDb(c)

  const categories = await db.query.serviceCategories.findMany({
    orderBy: [asc(serviceCategories.sortOrder)],
  })

  return success(c, categories)
})

// GET /public/categories/:slug — single category with providers count
publicRoutes.get('/categories/:slug', async (c) => {
  const db = getDb(c)
  const slug = c.req.param('slug')

  const category = await db.query.serviceCategories.findFirst({
    where: eq(serviceCategories.slug, slug),
  })

  if (!category) throw DomainError.notFound('Category not found')

  return success(c, category)
})

export default publicRoutes
