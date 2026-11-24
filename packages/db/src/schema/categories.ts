import { pgTable, uuid, varchar, text, timestamp, integer } from 'drizzle-orm/pg-core'

export const serviceCategories = pgTable('service_categories', {
  id: uuid('id').defaultRandom().primaryKey(),
  slug: varchar('slug', { length: 100 }).unique().notNull(),
  nameUk: varchar('name_uk', { length: 200 }).notNull(),
  nameEn: varchar('name_en', { length: 200 }),
  descriptionUk: text('description_uk'),
  iconName: varchar('icon_name', { length: 50 }),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

export const cities = pgTable('cities', {
  id: uuid('id').defaultRandom().primaryKey(),
  slug: varchar('slug', { length: 100 }).unique().notNull(),
  nameUk: varchar('name_uk', { length: 200 }).notNull(),
  nameEn: varchar('name_en', { length: 200 }),
  timezone: varchar('timezone', { length: 50 }).notNull().default('Europe/Kyiv'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

export const districts = pgTable('districts', {
  id: uuid('id').defaultRandom().primaryKey(),
  cityId: uuid('city_id')
    .references(() => cities.id)
    .notNull(),
  slug: varchar('slug', { length: 100 }).notNull(),
  nameUk: varchar('name_uk', { length: 200 }).notNull(),
  nameEn: varchar('name_en', { length: 200 }),
  sortOrder: integer('sort_order').notNull().default(0),
})
