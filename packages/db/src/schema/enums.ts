import { pgEnum } from 'drizzle-orm/pg-core'

export const bookingStatusEnum = pgEnum('booking_status', [
  'pending',
  'confirmed',
  'declined',
  'expired',
  'cancelled',
  'proposed',
  'completed',
])

export const priceTypeEnum = pgEnum('price_type', ['fixed', 'from', 'on_request'])

export const providerStatusEnum = pgEnum('provider_status', ['draft', 'published', 'suspended'])

export const notificationChannelEnum = pgEnum('notification_channel', ['sms', 'email', 'push'])

export const notificationStatusEnum = pgEnum('notification_status', [
  'queued',
  'sent',
  'delivered',
  'failed',
  'dlq',
])

export const exceptionTypeEnum = pgEnum('exception_type', ['day_off', 'extra_day', 'custom_hours'])
