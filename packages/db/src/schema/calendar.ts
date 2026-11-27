import { pgTable, uuid, varchar, integer, boolean, timestamp, index, uniqueIndex } from 'drizzle-orm/pg-core'
import { providerProfiles } from './providers'
import { exceptionTypeEnum } from './enums'

export const workingHours = pgTable(
  'working_hours',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    providerId: uuid('provider_id')
      .references(() => providerProfiles.id, { onDelete: 'cascade' })
      .notNull(),
    dayOfWeek: integer('day_of_week').notNull(),
    startTime: varchar('start_time', { length: 5 }).notNull(),
    endTime: varchar('end_time', { length: 5 }).notNull(),
    isActive: boolean('is_active').notNull().default(true),
  },
  (table) => [
    index('working_hours_provider_id_idx').on(table.providerId),
    uniqueIndex('working_hours_provider_day_idx').on(table.providerId, table.dayOfWeek),
  ],
)

export const availabilityExceptions = pgTable(
  'availability_exceptions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    providerId: uuid('provider_id')
      .references(() => providerProfiles.id, { onDelete: 'cascade' })
      .notNull(),
    date: varchar('date', { length: 10 }).notNull(),
    exceptionType: exceptionTypeEnum('exception_type').notNull(),
    isAvailable: boolean('is_available').notNull(),
    startTime: varchar('start_time', { length: 5 }),
    endTime: varchar('end_time', { length: 5 }),
    reason: varchar('reason', { length: 200 }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('availability_exceptions_provider_id_idx').on(table.providerId),
    uniqueIndex('availability_exceptions_provider_date_idx').on(table.providerId, table.date),
  ],
)
