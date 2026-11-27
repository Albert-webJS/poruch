import { pgTable, uuid, text, integer, timestamp, boolean, index } from 'drizzle-orm/pg-core'
import { providerProfiles } from './providers'
import { bookingRequests, clientContacts } from './bookings'

export const reviews = pgTable(
  'reviews',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    bookingId: uuid('booking_id')
      .references(() => bookingRequests.id)
      .unique(),
    providerId: uuid('provider_id')
      .references(() => providerProfiles.id)
      .notNull(),
    clientContactId: uuid('client_contact_id')
      .references(() => clientContacts.id)
      .notNull(),
    rating: integer('rating').notNull(),
    comment: text('comment'),
    isPublished: boolean('is_published').notNull().default(true),
    providerReply: text('provider_reply'),
    providerRepliedAt: timestamp('provider_replied_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [
    index('reviews_provider_id_idx').on(table.providerId),
    index('reviews_client_contact_id_idx').on(table.clientContactId),
  ],
)
