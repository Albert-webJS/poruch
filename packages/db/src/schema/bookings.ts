import { pgTable, uuid, varchar, text, timestamp, integer, index, uniqueIndex } from 'drizzle-orm/pg-core'
import { providerProfiles, providerServices } from './providers'
import { bookingStatusEnum } from './enums'

export const clientContacts = pgTable(
  'client_contacts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    phone: varchar('phone', { length: 20 }).notNull(),
    email: varchar('email', { length: 255 }),
    name: varchar('name', { length: 200 }).notNull(),
    userId: uuid('user_id'), // linked later if client creates account
    verifiedAt: timestamp('verified_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('client_contacts_phone_idx').on(table.phone),
    index('client_contacts_user_id_idx').on(table.userId),
  ],
)

export const bookingRequests = pgTable(
  'booking_requests',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    providerId: uuid('provider_id')
      .references(() => providerProfiles.id)
      .notNull(),
    serviceId: uuid('service_id')
      .references(() => providerServices.id)
      .notNull(),
    clientContactId: uuid('client_contact_id')
      .references(() => clientContacts.id)
      .notNull(),
    status: bookingStatusEnum('status').notNull().default('pending'),

    // requested by client
    preferredDate: varchar('preferred_date', { length: 10 }).notNull(), // YYYY-MM-DD
    preferredTime: varchar('preferred_time', { length: 5 }).notNull(), // HH:MM

    // set by provider on confirm
    confirmedDate: varchar('confirmed_date', { length: 10 }),
    confirmedTime: varchar('confirmed_time', { length: 5 }),

    // set by provider on propose
    proposedDate: varchar('proposed_date', { length: 10 }),
    proposedTime: varchar('proposed_time', { length: 5 }),
    proposedMessage: text('proposed_message'),

    address: text('address'),
    details: text('details'),
    declineReason: text('decline_reason'),
    cancelReason: text('cancel_reason'),

    // access token for client (no account needed)
    accessToken: varchar('access_token', { length: 64 }).unique().notNull(),

    // idempotency
    idempotencyKey: varchar('idempotency_key', { length: 36 }).unique(),

    // optimistic locking
    version: integer('version').notNull().default(1),

    // expiration
    expiresAt: timestamp('expires_at', { withTimezone: true }),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [
    index('booking_requests_provider_status_idx').on(table.providerId, table.status),
    index('booking_requests_client_contact_idx').on(table.clientContactId, table.createdAt),
    index('booking_requests_expires_at_idx').on(table.expiresAt),
    uniqueIndex('booking_requests_access_token_idx').on(table.accessToken),
  ],
)

export const bookingStatusHistory = pgTable(
  'booking_status_history',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    bookingId: uuid('booking_id')
      .references(() => bookingRequests.id)
      .notNull(),
    previousStatus: bookingStatusEnum('previous_status').notNull(),
    newStatus: bookingStatusEnum('new_status').notNull(),
    changedBy: varchar('changed_by', { length: 255 }).notNull(), // userId or 'system'
    reason: text('reason'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index('booking_status_history_booking_id_idx').on(table.bookingId)],
)
