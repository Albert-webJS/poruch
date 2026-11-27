import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { eq, and, gte, lte, isNull } from 'drizzle-orm'
import { workingHours, availabilityExceptions, providerProfiles, bookingRequests, providerServices } from '@poruch/db/schema'
import { UpdateWorkingHours, CreateAvailabilityException, AvailableSlotsQuery } from '@poruch/validators'
import type { AppEnv } from '../lib/bindings.js'
import { getDb } from '../lib/db.js'
import { success } from '../lib/response.js'
import { DomainError } from '../lib/errors.js'
import { requireAuth } from '../middleware/auth.js'
import { requireMaster, resolveProvider } from '../middleware/rbac.js'

const schedule = new Hono<AppEnv>()

schedule.get('/hours', requireAuth, requireMaster, resolveProvider, async (c) => {
  const db = getDb(c)
  const providerId = c.get('providerId')!

  const hours = await db.query.workingHours.findMany({
    where: eq(workingHours.providerId, providerId),
    orderBy: (h, { asc }) => [asc(h.dayOfWeek)],
  })

  return success(c, hours)
})

schedule.put('/hours', requireAuth, requireMaster, resolveProvider, zValidator('json', UpdateWorkingHours), async (c) => {
  const db = getDb(c)
  const providerId = c.get('providerId')!
  const { schedule: newSchedule } = c.req.valid('json')

  const days = newSchedule.map((s) => s.dayOfWeek)
  if (new Set(days).size !== days.length) {
    throw DomainError.validation('Duplicate day of week in schedule')
  }

  for (const slot of newSchedule) {
    if (slot.startTime >= slot.endTime) {
      throw DomainError.validation(`Start time must be before end time for day ${slot.dayOfWeek}`)
    }
  }

  const result = await db.transaction(async (tx) => {
    await tx.delete(workingHours).where(eq(workingHours.providerId, providerId))

    const inserted = await tx
      .insert(workingHours)
      .values(newSchedule.map((s) => ({ ...s, providerId })))
      .returning()

    return inserted
  })

  return success(c, result)
})

schedule.get('/exceptions', requireAuth, requireMaster, resolveProvider, async (c) => {
  const db = getDb(c)
  const providerId = c.get('providerId')!

  const exceptions = await db.query.availabilityExceptions.findMany({
    where: eq(availabilityExceptions.providerId, providerId),
    orderBy: (e, { asc }) => [asc(e.date)],
  })

  return success(c, exceptions)
})

schedule.post('/exceptions', requireAuth, requireMaster, resolveProvider, zValidator('json', CreateAvailabilityException), async (c) => {
  const db = getDb(c)
  const providerId = c.get('providerId')!
  const body = c.req.valid('json')

  const exceptionType = !body.isAvailable
    ? 'day_off'
    : body.startTime && body.endTime
      ? 'custom_hours'
      : 'extra_day'

  const [exception] = await db
    .insert(availabilityExceptions)
    .values({
      providerId,
      date: body.date,
      exceptionType,
      isAvailable: body.isAvailable,
      startTime: body.startTime,
      endTime: body.endTime,
      reason: body.reason,
    })
    .onConflictDoUpdate({
      target: [availabilityExceptions.providerId, availabilityExceptions.date],
      set: {
        exceptionType,
        isAvailable: body.isAvailable,
        startTime: body.startTime,
        endTime: body.endTime,
        reason: body.reason,
      },
    })
    .returning()

  return success(c, exception, 201)
})

schedule.delete('/exceptions/:id', requireAuth, requireMaster, resolveProvider, async (c) => {
  const db = getDb(c)
  const providerId = c.get('providerId')!
  const exceptionId = c.req.param('id')

  const [deleted] = await db
    .delete(availabilityExceptions)
    .where(and(eq(availabilityExceptions.id, exceptionId), eq(availabilityExceptions.providerId, providerId)))
    .returning()

  if (!deleted) throw DomainError.notFound('Exception not found')

  return success(c, { deleted: true })
})

schedule.get('/slots/:slug', zValidator('query', AvailableSlotsQuery), async (c) => {
  const db = getDb(c)
  const slug = c.req.param('slug')
  const query = c.req.valid('query')
  const toDate = query.toDate ?? query.fromDate

  const profile = await db.query.providerProfiles.findFirst({
    where: and(eq(providerProfiles.slug, slug), eq(providerProfiles.status, 'published'), isNull(providerProfiles.deletedAt)),
  })
  if (!profile) throw DomainError.notFound('Provider not found')

  const [service, hours, exceptions, confirmedBookings] = await Promise.all([
    db.query.providerServices.findFirst({
      where: and(eq(providerServices.id, query.serviceId), eq(providerServices.providerId, profile.id), eq(providerServices.isActive, true)),
    }),
    db.query.workingHours.findMany({
      where: and(eq(workingHours.providerId, profile.id), eq(workingHours.isActive, true)),
    }),
    db.query.availabilityExceptions.findMany({
      where: and(
        eq(availabilityExceptions.providerId, profile.id),
        gte(availabilityExceptions.date, query.fromDate),
        lte(availabilityExceptions.date, toDate),
      ),
    }),
    db.query.bookingRequests.findMany({
      where: and(
        eq(bookingRequests.providerId, profile.id),
        eq(bookingRequests.status, 'confirmed'),
        gte(bookingRequests.confirmedDate, query.fromDate),
        lte(bookingRequests.confirmedDate, toDate),
      ),
      with: { service: { columns: { durationMinutes: true } } },
    }),
  ])

  if (!service) throw DomainError.notFound('Service not found')

  const slots = calculateAvailableSlots({
    fromDate: query.fromDate,
    toDate,
    hours,
    exceptions,
    confirmedBookings,
    durationMinutes: service.durationMinutes ?? 60,
    timezone: profile.timezone,
    slotStepMinutes: 30,
    leadTimeMinutes: 60,
  })

  return success(c, slots)
})

interface SlotCalcParams {
  fromDate: string
  toDate: string
  hours: { dayOfWeek: number; startTime: string; endTime: string; isActive: boolean }[]
  exceptions: { date: string; isAvailable: boolean; startTime: string | null; endTime: string | null }[]
  confirmedBookings: { confirmedDate: string | null; confirmedTime: string | null; service: { durationMinutes: number | null } }[]
  durationMinutes: number
  timezone: string
  slotStepMinutes: number
  leadTimeMinutes: number
}

function calculateAvailableSlots(params: SlotCalcParams) {
  const { fromDate, toDate, hours, exceptions, confirmedBookings, durationMinutes, slotStepMinutes, leadTimeMinutes } = params

  const slots: { date: string; startTime: string; endTime: string }[] = []
  const now = new Date()
  const leadTimeMs = leadTimeMinutes * 60 * 1000

  const start = new Date(fromDate + 'T00:00:00')
  const end = new Date(toDate + 'T23:59:59')

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0]!
    const dayOfWeek = d.getDay()

    const exception = exceptions.find((e) => e.date === dateStr)

    let dayStart: string | null = null
    let dayEnd: string | null = null

    if (exception) {
      if (!exception.isAvailable) continue
      dayStart = exception.startTime
      dayEnd = exception.endTime
    }

    if (!dayStart || !dayEnd) {
      const wh = hours.find((h) => h.dayOfWeek === dayOfWeek && h.isActive)
      if (!wh) continue
      dayStart = wh.startTime
      dayEnd = wh.endTime
    }

    const [startH, startM] = dayStart.split(':').map(Number) as [number, number]
    const [endH, endM] = dayEnd.split(':').map(Number) as [number, number]
    const dayStartMinutes = startH * 60 + startM
    const dayEndMinutes = endH * 60 + endM

    for (let m = dayStartMinutes; m + durationMinutes <= dayEndMinutes; m += slotStepMinutes) {
      const slotStart = `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
      const slotEndM = m + durationMinutes
      const slotEnd = `${String(Math.floor(slotEndM / 60)).padStart(2, '0')}:${String(slotEndM % 60).padStart(2, '0')}`

      const slotDate = new Date(`${dateStr}T${slotStart}:00`)
      if (slotDate.getTime() - now.getTime() < leadTimeMs) continue

      const hasConflict = confirmedBookings.some((b) => {
        if (b.confirmedDate !== dateStr || !b.confirmedTime) return false
        const [bH, bM] = b.confirmedTime.split(':').map(Number) as [number, number]
        const bookingStart = bH * 60 + bM
        const bookingEnd = bookingStart + (b.service.durationMinutes ?? 60)
        return m < bookingEnd && slotEndM > bookingStart
      })
      if (hasConflict) continue

      slots.push({ date: dateStr, startTime: slotStart, endTime: slotEnd })
    }
  }

  return slots
}

export default schedule
