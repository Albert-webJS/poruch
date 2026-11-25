import { pgTable, uuid, varchar, text, jsonb, timestamp, index, uniqueIndex } from 'drizzle-orm/pg-core'
import { bookingRequests } from './bookings'
import { notificationChannelEnum, notificationStatusEnum } from './enums'

export const notifications = pgTable(
  'notifications',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    bookingId: uuid('booking_id').references(() => bookingRequests.id),
    channel: notificationChannelEnum('channel').notNull(),
    status: notificationStatusEnum('status').notNull().default('queued'),
    recipientPhone: varchar('recipient_phone', { length: 20 }),
    recipientEmail: varchar('recipient_email', { length: 255 }),
    templateKey: varchar('template_key', { length: 100 }).notNull(),
    payload: jsonb('payload'),
    idempotencyKey: varchar('idempotency_key', { length: 100 }).unique(),
    attempts: varchar('attempts', { length: 5 }).notNull().default('0'),
    sentAt: timestamp('sent_at', { withTimezone: true }),
    deliveredAt: timestamp('delivered_at', { withTimezone: true }),
    failedAt: timestamp('failed_at', { withTimezone: true }),
    errorMessage: text('error_message'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('notifications_booking_id_idx').on(table.bookingId),
    index('notifications_status_idx').on(table.status),
    uniqueIndex('notifications_idempotency_key_idx').on(table.idempotencyKey),
  ],
)
