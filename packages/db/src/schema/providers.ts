import { pgTable, uuid, varchar, text, boolean, integer, timestamp, index, uniqueIndex } from 'drizzle-orm/pg-core'
import { users } from './users'
import { serviceCategories, cities, districts } from './categories'
import { providerStatusEnum, priceTypeEnum } from './enums'

export const providerProfiles = pgTable(
  'provider_profiles',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .references(() => users.id)
      .notNull(),
    slug: varchar('slug', { length: 100 }).unique().notNull(),
    name: varchar('name', { length: 200 }).notNull(),
    description: text('description'),
    categoryId: uuid('category_id')
      .references(() => serviceCategories.id)
      .notNull(),
    cityId: uuid('city_id')
      .references(() => cities.id)
      .notNull(),
    phone: varchar('phone', { length: 20 }),
    photoUrl: varchar('photo_url', { length: 500 }),
    status: providerStatusEnum('status').notNull().default('draft'),
    timezone: varchar('timezone', { length: 50 }).notNull().default('Europe/Kyiv'),
    responseTimeHours: integer('response_time_hours').notNull().default(24),
    version: integer('version').notNull().default(1),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [
    uniqueIndex('provider_profiles_slug_idx').on(table.slug),
    index('provider_profiles_user_id_idx').on(table.userId),
    index('provider_profiles_city_category_idx').on(table.cityId, table.categoryId),
    index('provider_profiles_status_idx').on(table.status),
  ],
)

export const providerServices = pgTable(
  'provider_services',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    providerId: uuid('provider_id')
      .references(() => providerProfiles.id)
      .notNull(),
    name: varchar('name', { length: 200 }).notNull(),
    description: text('description'),
    priceType: priceTypeEnum('price_type').notNull(),
    priceAmount: integer('price_amount'),
    durationMinutes: integer('duration_minutes'),
    isActive: boolean('is_active').notNull().default(true),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }),
  },
  (table) => [index('provider_services_provider_id_idx').on(table.providerId)],
)

export const serviceAreas = pgTable(
  'service_areas',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    providerId: uuid('provider_id')
      .references(() => providerProfiles.id, { onDelete: 'cascade' })
      .notNull(),
    districtId: uuid('district_id')
      .references(() => districts.id)
      .notNull(),
  },
  (table) => [
    index('service_areas_provider_id_idx').on(table.providerId),
    uniqueIndex('service_areas_provider_district_idx').on(table.providerId, table.districtId),
  ],
)
