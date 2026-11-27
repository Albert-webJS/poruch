import { Hono } from 'hono'
import { eq, and, isNull, asc } from 'drizzle-orm'
import { providerProfiles, providerServices, serviceCategories, cities } from '@poruch/db/schema'
import type { AppEnv } from '../lib/bindings.js'
import { getDb } from '../lib/db.js'
import { success } from '../lib/response.js'
import { DomainError } from '../lib/errors.js'

const publicRoutes = new Hono<AppEnv>()

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
    citySlug: profile.city.slug,
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
    phone: profile.phone,
    acceptingBookings: true,
  })
})

publicRoutes.get('/categories', async (c) => {
  const db = getDb(c)

  const categories = await db.query.serviceCategories.findMany({
    orderBy: [asc(serviceCategories.sortOrder)],
  })

  return success(c, categories)
})

publicRoutes.get('/categories/:slug', async (c) => {
  const db = getDb(c)
  const slug = c.req.param('slug')

  const category = await db.query.serviceCategories.findFirst({
    where: eq(serviceCategories.slug, slug),
  })

  if (!category) throw DomainError.notFound('Category not found')

  return success(c, category)
})

publicRoutes.get('/cities', async (c) => {
  const db = getDb(c)

  const allCities = await db.query.cities.findMany({
    orderBy: [asc(cities.nameUk)],
  })

  return success(c, allCities)
})

publicRoutes.get('/providers', async (c) => {
  const db = getDb(c)
  const categorySlug = c.req.query('category')
  const citySlug = c.req.query('city')

  let categoryId: string | undefined
  let cityId: string | undefined

  if (categorySlug) {
    const category = await db.query.serviceCategories.findFirst({
      where: eq(serviceCategories.slug, categorySlug),
      columns: { id: true },
    })
    if (!category) return success(c, [])
    categoryId = category.id
  }

  if (citySlug) {
    const city = await db.query.cities.findFirst({
      where: eq(cities.slug, citySlug),
      columns: { id: true },
    })
    if (!city) return success(c, [])
    cityId = city.id
  }

  const conditions = [
    eq(providerProfiles.status, 'published'),
    isNull(providerProfiles.deletedAt),
  ]
  if (categoryId) conditions.push(eq(providerProfiles.categoryId, categoryId))
  if (cityId) conditions.push(eq(providerProfiles.cityId, cityId))

  const providers = await db.query.providerProfiles.findMany({
    where: and(...conditions),
    with: {
      category: { columns: { nameUk: true } },
      city: { columns: { nameUk: true } },
      services: {
        where: eq(providerServices.isActive, true),
        columns: { priceAmount: true },
        limit: 3,
      },
      reviews: {
        where: (r, { eq }) => eq(r.isPublished, true),
        columns: { rating: true },
      },
    },
  })

  const result = providers.map((p) => {
    const ratings = p.reviews.map((r) => r.rating)
    const avgRating = ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null
    return {
      id: p.id,
      slug: p.slug,
      name: p.name,
      photoUrl: p.photoUrl,
      categoryName: p.category.nameUk,
      cityName: p.city.nameUk,
      rating: avgRating ? Math.round(avgRating * 10) / 10 : null,
      reviewCount: ratings.length,
      priceFrom: p.services.reduce((min, s) => {
        if (s.priceAmount && (min === null || s.priceAmount < min)) return s.priceAmount
        return min
      }, null as number | null),
    }
  })

  return success(c, result)
})

export default publicRoutes
