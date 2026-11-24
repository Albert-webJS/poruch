// === Booking Status ===

export const BOOKING_STATUSES = [
  'pending',
  'confirmed',
  'declined',
  'expired',
  'cancelled',
  'proposed',
  'completed',
] as const

export type BookingStatus = (typeof BOOKING_STATUSES)[number]

// === Valid state machine transitions ===

export const BOOKING_TRANSITIONS: Record<BookingStatus, readonly BookingStatus[]> = {
  pending: ['confirmed', 'declined', 'expired', 'cancelled', 'proposed'],
  proposed: ['confirmed', 'cancelled', 'expired'],
  confirmed: ['completed', 'cancelled'],
  declined: [],
  expired: [],
  cancelled: [],
  completed: [],
} as const

// === Price Type ===

export const PRICE_TYPES = ['fixed', 'from', 'on_request'] as const
export type PriceType = (typeof PRICE_TYPES)[number]

// === Provider Status ===

export const PROVIDER_STATUSES = ['draft', 'published', 'suspended'] as const
export type ProviderStatus = (typeof PROVIDER_STATUSES)[number]

// === Day of Week ===

export const DAYS_OF_WEEK = [0, 1, 2, 3, 4, 5, 6] as const
export type DayOfWeek = (typeof DAYS_OF_WEEK)[number]

// === Notification Channel ===

export const NOTIFICATION_CHANNELS = ['sms', 'email', 'push'] as const
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number]

// === Notification Status ===

export const NOTIFICATION_STATUSES = ['queued', 'sent', 'delivered', 'failed', 'dlq'] as const
export type NotificationStatus = (typeof NOTIFICATION_STATUSES)[number]

// === Roles ===

export const ROLES = ['master', 'client', 'admin'] as const
export type Role = (typeof ROLES)[number]

// === API Response Types ===

export interface ApiSuccess<T> {
  data: T
}

export interface ApiPaginated<T> {
  data: T[]
  meta: {
    cursor: string | null
    total?: number
  }
}

export interface ApiError {
  error: {
    code: string
    message: string
    details?: Record<string, unknown>
  }
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError

// === Error Codes ===

export const ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  GONE: 'GONE',
  RATE_LIMITED: 'RATE_LIMITED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES]
