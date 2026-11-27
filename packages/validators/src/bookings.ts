import { z } from 'zod'
import { BOOKING_STATUSES } from '@poruch/types'
import { PhoneSchema, EmailSchema } from './common.js'

export const CreateBooking = z.object({
  providerId: z.string().uuid(),
  serviceId: z.string().uuid(),
  preferredDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  preferredTime: z.string().regex(/^\d{2}:\d{2}$/),
  clientName: z.string().min(2).max(100),
  clientPhone: PhoneSchema,
  clientEmail: EmailSchema.optional(),
  address: z.string().min(5).max(500).optional(),
  details: z.string().max(1000).optional(),
  turnstileToken: z.string().min(1),
})

export type CreateBooking = z.infer<typeof CreateBooking>

export const ConfirmBooking = z.object({
  confirmedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  confirmedTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
})

export type ConfirmBooking = z.infer<typeof ConfirmBooking>

export const DeclineBooking = z.object({
  reason: z.string().max(500).optional(),
})

export type DeclineBooking = z.infer<typeof DeclineBooking>

export const ProposeBooking = z.object({
  proposedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  proposedTime: z.string().regex(/^\d{2}:\d{2}$/),
  message: z.string().max(500).optional(),
})

export type ProposeBooking = z.infer<typeof ProposeBooking>

export const CancelBooking = z.object({
  reason: z.string().max(500).optional(),
})

export type CancelBooking = z.infer<typeof CancelBooking>

export const BookingResponse = z.object({
  id: z.string().uuid(),
  status: z.enum(BOOKING_STATUSES),
  providerId: z.string().uuid(),
  providerName: z.string(),
  serviceId: z.string().uuid(),
  serviceName: z.string(),
  preferredDate: z.string(),
  preferredTime: z.string(),
  confirmedDate: z.string().nullable(),
  confirmedTime: z.string().nullable(),
  proposedDate: z.string().nullable(),
  proposedTime: z.string().nullable(),
  clientName: z.string(),
  details: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime().nullable(),
  expiresAt: z.string().datetime().nullable(),
})

export type BookingResponse = z.infer<typeof BookingResponse>

export const BookingListQuery = z.object({
  status: z.enum(BOOKING_STATUSES).optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

export type BookingListQuery = z.infer<typeof BookingListQuery>
