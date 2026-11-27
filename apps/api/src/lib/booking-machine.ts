import { BOOKING_TRANSITIONS, type BookingStatus } from '@poruch/types'
import { DomainError } from './errors.js'

export function assertTransition(current: BookingStatus, next: BookingStatus): void {
  const allowed = BOOKING_TRANSITIONS[current]
  if (!allowed.includes(next)) {
    throw DomainError.conflict(
      `Cannot transition from '${current}' to '${next}'. Allowed: ${allowed.join(', ') || 'none'}`,
    )
  }
}

export function isTerminal(status: BookingStatus): boolean {
  return BOOKING_TRANSITIONS[status].length === 0
}

export function getExpiresAt(status: BookingStatus, responseTimeHours: number): Date | null {
  if (status === 'pending') {
    return new Date(Date.now() + responseTimeHours * 60 * 60 * 1000)
  }
  if (status === 'proposed') {
    return new Date(Date.now() + 24 * 60 * 60 * 1000)
  }
  return null
}
