import { z } from 'zod'

// === Working Hours ===

const TimeString = z.string().regex(/^\d{2}:\d{2}$/, 'Time must be in HH:MM format')

export const CreateWorkingHours = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: TimeString,
  endTime: TimeString,
  isActive: z.boolean().default(true),
})

export type CreateWorkingHours = z.infer<typeof CreateWorkingHours>

export const UpdateWorkingHours = z.object({
  schedule: z.array(CreateWorkingHours).min(1).max(7),
})

export type UpdateWorkingHours = z.infer<typeof UpdateWorkingHours>

// === Availability Exception ===

export const CreateAvailabilityException = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  isAvailable: z.boolean(),
  startTime: TimeString.optional(),
  endTime: TimeString.optional(),
  reason: z.string().max(200).optional(),
})

export type CreateAvailabilityException = z.infer<typeof CreateAvailabilityException>

// === Available Slot (response) ===

export const AvailableSlot = z.object({
  date: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  startUtc: z.string().datetime(),
  endUtc: z.string().datetime(),
})

export type AvailableSlot = z.infer<typeof AvailableSlot>

// === Slot Query ===

export const AvailableSlotsQuery = z.object({
  serviceId: z.string().uuid(),
  fromDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  toDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  timezone: z.string().default('Europe/Kyiv'),
})

export type AvailableSlotsQuery = z.infer<typeof AvailableSlotsQuery>
