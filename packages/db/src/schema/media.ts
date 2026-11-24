import { pgTable, uuid, varchar, integer, timestamp, index } from 'drizzle-orm/pg-core'
import { providerProfiles } from './providers.js'

export const mediaAssets = pgTable(
  'media_assets',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    providerId: uuid('provider_id')
      .references(() => providerProfiles.id, { onDelete: 'cascade' })
      .notNull(),
    r2Key: varchar('r2_key', { length: 500 }).notNull(),
    url: varchar('url', { length: 500 }).notNull(),
    mimeType: varchar('mime_type', { length: 50 }).notNull(),
    sizeBytes: integer('size_bytes').notNull(),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index('media_assets_provider_id_idx').on(table.providerId)],
)
