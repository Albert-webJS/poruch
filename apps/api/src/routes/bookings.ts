import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { eq, and, desc, isNull, lt } from 'drizzle-orm'
import { bookingRequests, bookingStatusHistory, clientContacts, providerProfiles, providerServices } from '@poruch/db/schema'
import { CreateBooking, ConfirmBooking, DeclineBooking, ProposeBooking, CancelBooking, BookingListQuery } from '@poruch/validators'
import type { AppEnv } from '../lib/bindings.js'
import { getDb } from '../lib/db.js'
import { success, paginated } from '../lib/response.js'
import { DomainError } from '../lib/errors.js'
import { assertTransition, getExpiresAt } from '../lib/booking-machine.js'
import { requireAuth } from '../middleware/auth.js'
import { requireMaster, resolveProvider } from '../middleware/rbac.js'

const bookings = new Hono<AppEnv>()

bookings.post('/', zValidator('json', CreateBooking), async (c) => {
  const db = getDb(c)
  const body = c.req.valid('json')

  if (c.env.ENVIRONMENT !== 'development') {
    const turnstileResult = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        secret: c.env.TURNSTILE_SECRET_KEY,
        response: body.turnstileToken,
        remoteip: c.req.header('CF-Connecting-IP'),
      }),
    })
    const turnstile = (await turnstileResult.json()) as { success: boolean }
    if (!turnstile.success) {
      throw DomainError.validation('Turnstile verification failed')
    }
  }

  const provider = await db.query.providerProfiles.findFirst({
    where: and(eq(providerProfiles.id, body.providerId), eq(providerProfiles.status, 'published'), isNull(providerProfiles.deletedAt)),
  })
  if (!provider) throw DomainError.notFound('Provider not found')

  const service = await db.query.providerServices.findFirst({
    where: and(eq(providerServices.id, body.serviceId), eq(providerServices.providerId, provider.id), eq(providerServices.isActive, true)),
  })
  if (!service) throw DomainError.notFound('Service not found')

  const idempotencyKey = c.req.header('Idempotency-Key')
  if (idempotencyKey) {
    const existing = await db.query.bookingRequests.findFirst({
      where: eq(bookingRequests.idempotencyKey, idempotencyKey),
    })
    if (existing) return success(c, existing, 201)
  }

  let clientContact = await db.query.clientContacts.findFirst({
    where: eq(clientContacts.phone, body.clientPhone),
  })

  if (!clientContact) {
    const [newContact] = await db
      .insert(clientContacts)
      .values({ phone: body.clientPhone, email: body.clientEmail, name: body.clientName })
      .returning()
    clientContact = newContact!
  }

  const tokenBytes = new Uint8Array(32)
  crypto.getRandomValues(tokenBytes)
  const accessToken = Array.from(tokenBytes, (b) => b.toString(16).padStart(2, '0')).join('')

  const expiresAt = getExpiresAt('pending', provider.responseTimeHours)

  const [booking] = await db
    .insert(bookingRequests)
    .values({
      providerId: provider.id,
      serviceId: service.id,
      clientContactId: clientContact.id,
      preferredDate: body.preferredDate,
      preferredTime: body.preferredTime,
      address: body.address,
      details: body.details,
      accessToken,
      idempotencyKey,
      expiresAt,
    })
    .returning()

  await db.insert(bookingStatusHistory).values({
    bookingId: booking!.id,
    previousStatus: 'pending',
    newStatus: 'pending',
    changedBy: 'client',
  })

  await c.env.NOTIFICATIONS_QUEUE?.send({
    type: 'booking_created',
    bookingId: booking!.id,
    providerId: provider.id,
    idempotencyKey: `${booking!.id}:created`,
  })

  return success(c, { ...booking, accessToken }, 201)
})

bookings.get('/', requireAuth, requireMaster, resolveProvider, zValidator('query', BookingListQuery), async (c) => {
  const db = getDb(c)
  const providerId = c.get('providerId')!
  const query = c.req.valid('query')

  const conditions = [eq(bookingRequests.providerId, providerId), isNull(bookingRequests.deletedAt)]

  if (query.status) {
    conditions.push(eq(bookingRequests.status, query.status))
  }
  if (query.cursor) {
    conditions.push(lt(bookingRequests.id, query.cursor))
  }

  const results = await db.query.bookingRequests.findMany({
    where: and(...conditions),
    with: {
      service: true,
      clientContact: true,
    },
    orderBy: [desc(bookingRequests.createdAt)],
    limit: query.limit + 1,
  })

  const hasMore = results.length > query.limit
  const data = hasMore ? results.slice(0, query.limit) : results
  const cursor = hasMore ? data[data.length - 1]!.id : null

  const masked = data.map((b) => ({
    ...b,
    clientContact: {
      ...b.clientContact,
      phone: b.status === 'confirmed' || b.status === 'completed'
        ? b.clientContact.phone
        : maskPhone(b.clientContact.phone),
    },
  }))

  return paginated(c, masked, cursor)
})

bookings.post('/:id/confirm', requireAuth, requireMaster, resolveProvider, zValidator('json', ConfirmBooking), async (c) => {
  const db = getDb(c)
  const bookingId = c.req.param('id')
  const body = c.req.valid('json')
  const providerId = c.get('providerId')!

  const result = await db.transaction(async (tx) => {
    const [booking] = await tx
      .select()
      .from(bookingRequests)
      .where(eq(bookingRequests.id, bookingId))
      .for('update')

    if (!booking || booking.providerId !== providerId) throw DomainError.notFound('Booking not found')

    assertTransition(booking.status, 'confirmed')

    const confirmedDate = body.confirmedDate ?? booking.preferredDate
    const confirmedTime = body.confirmedTime ?? booking.preferredTime

    const [updated] = await tx
      .update(bookingRequests)
      .set({
        status: 'confirmed',
        confirmedDate,
        confirmedTime,
        expiresAt: null,
        version: booking.version + 1,
        updatedAt: new Date(),
      })
      .where(and(eq(bookingRequests.id, bookingId), eq(bookingRequests.version, booking.version)))
      .returning()

    if (!updated) throw DomainError.conflict('Booking was modified by another request')

    await tx.insert(bookingStatusHistory).values({
      bookingId,
      previousStatus: booking.status,
      newStatus: 'confirmed',
      changedBy: c.get('userId'),
    })

    return updated
  })

  await c.env.NOTIFICATIONS_QUEUE?.send({
    type: 'booking_confirmed',
    bookingId,
    idempotencyKey: `${bookingId}:confirmed:${Date.now()}`,
  })

  return success(c, result)
})

bookings.post('/:id/decline', requireAuth, requireMaster, resolveProvider, zValidator('json', DeclineBooking), async (c) => {
  const db = getDb(c)
  const bookingId = c.req.param('id')
  const body = c.req.valid('json')
  const providerId = c.get('providerId')!

  const result = await db.transaction(async (tx) => {
    const [booking] = await tx.select().from(bookingRequests).where(eq(bookingRequests.id, bookingId)).for('update')
    if (!booking || booking.providerId !== providerId) throw DomainError.notFound('Booking not found')

    assertTransition(booking.status, 'declined')

    const [updated] = await tx
      .update(bookingRequests)
      .set({
        status: 'declined',
        declineReason: body.reason,
        expiresAt: null,
        version: booking.version + 1,
        updatedAt: new Date(),
      })
      .where(and(eq(bookingRequests.id, bookingId), eq(bookingRequests.version, booking.version)))
      .returning()

    if (!updated) throw DomainError.conflict('Booking was modified by another request')

    await tx.insert(bookingStatusHistory).values({
      bookingId,
      previousStatus: booking.status,
      newStatus: 'declined',
      changedBy: c.get('userId'),
      reason: body.reason,
    })

    return updated
  })

  await c.env.NOTIFICATIONS_QUEUE?.send({
    type: 'booking_declined',
    bookingId,
    idempotencyKey: `${bookingId}:declined:${Date.now()}`,
  })

  return success(c, result)
})

bookings.post('/:id/propose', requireAuth, requireMaster, resolveProvider, zValidator('json', ProposeBooking), async (c) => {
  const db = getDb(c)
  const bookingId = c.req.param('id')
  const body = c.req.valid('json')
  const providerId = c.get('providerId')!

  const result = await db.transaction(async (tx) => {
    const [booking] = await tx.select().from(bookingRequests).where(eq(bookingRequests.id, bookingId)).for('update')
    if (!booking || booking.providerId !== providerId) throw DomainError.notFound('Booking not found')

    assertTransition(booking.status, 'proposed')

    const expiresAt = getExpiresAt('proposed', 24)

    const [updated] = await tx
      .update(bookingRequests)
      .set({
        status: 'proposed',
        proposedDate: body.proposedDate,
        proposedTime: body.proposedTime,
        proposedMessage: body.message,
        expiresAt,
        version: booking.version + 1,
        updatedAt: new Date(),
      })
      .where(and(eq(bookingRequests.id, bookingId), eq(bookingRequests.version, booking.version)))
      .returning()

    if (!updated) throw DomainError.conflict('Booking was modified by another request')

    await tx.insert(bookingStatusHistory).values({
      bookingId,
      previousStatus: booking.status,
      newStatus: 'proposed',
      changedBy: c.get('userId'),
    })

    return updated
  })

  await c.env.NOTIFICATIONS_QUEUE?.send({
    type: 'booking_proposed',
    bookingId,
    idempotencyKey: `${bookingId}:proposed:${Date.now()}`,
  })

  return success(c, result)
})

bookings.post('/:id/complete', requireAuth, requireMaster, resolveProvider, async (c) => {
  const db = getDb(c)
  const bookingId = c.req.param('id')
  const providerId = c.get('providerId')!

  const result = await db.transaction(async (tx) => {
    const [booking] = await tx.select().from(bookingRequests).where(eq(bookingRequests.id, bookingId)).for('update')
    if (!booking || booking.providerId !== providerId) throw DomainError.notFound('Booking not found')

    assertTransition(booking.status, 'completed')

    const [updated] = await tx
      .update(bookingRequests)
      .set({ status: 'completed', version: booking.version + 1, updatedAt: new Date() })
      .where(and(eq(bookingRequests.id, bookingId), eq(bookingRequests.version, booking.version)))
      .returning()

    if (!updated) throw DomainError.conflict('Booking was modified by another request')

    await tx.insert(bookingStatusHistory).values({
      bookingId,
      previousStatus: booking.status,
      newStatus: 'completed',
      changedBy: c.get('userId'),
    })

    return updated
  })

  return success(c, result)
})

bookings.get('/status/:token', async (c) => {
  const db = getDb(c)
  const token = c.req.param('token')

  const booking = await db.query.bookingRequests.findFirst({
    where: and(eq(bookingRequests.accessToken, token), isNull(bookingRequests.deletedAt)),
    with: {
      provider: { columns: { name: true, slug: true, photoUrl: true } },
      service: { columns: { name: true } },
    },
  })

  if (!booking) throw DomainError.notFound('Booking not found')

  return success(c, {
    id: booking.id,
    status: booking.status,
    providerName: booking.provider.name,
    providerSlug: booking.provider.slug,
    providerPhoto: booking.provider.photoUrl,
    serviceName: booking.service.name,
    preferredDate: booking.preferredDate,
    preferredTime: booking.preferredTime,
    confirmedDate: booking.confirmedDate,
    confirmedTime: booking.confirmedTime,
    proposedDate: booking.proposedDate,
    proposedTime: booking.proposedTime,
    proposedMessage: booking.proposedMessage,
    createdAt: booking.createdAt,
  })
})

bookings.post('/status/:token/cancel', zValidator('json', CancelBooking), async (c) => {
  const db = getDb(c)
  const token = c.req.param('token')
  const body = c.req.valid('json')

  const result = await db.transaction(async (tx) => {
    const [booking] = await tx
      .select()
      .from(bookingRequests)
      .where(and(eq(bookingRequests.accessToken, token), isNull(bookingRequests.deletedAt)))
      .for('update')

    if (!booking) throw DomainError.notFound('Booking not found')

    assertTransition(booking.status, 'cancelled')

    const [updated] = await tx
      .update(bookingRequests)
      .set({
        status: 'cancelled',
        cancelReason: body.reason,
        expiresAt: null,
        version: booking.version + 1,
        updatedAt: new Date(),
      })
      .where(and(eq(bookingRequests.id, booking.id), eq(bookingRequests.version, booking.version)))
      .returning()

    if (!updated) throw DomainError.conflict('Booking was modified')

    await tx.insert(bookingStatusHistory).values({
      bookingId: booking.id,
      previousStatus: booking.status,
      newStatus: 'cancelled',
      changedBy: 'client',
      reason: body.reason,
    })

    return updated
  })

  await c.env.NOTIFICATIONS_QUEUE?.send({
    type: 'booking_cancelled',
    bookingId: result.id,
    idempotencyKey: `${result.id}:cancelled:${Date.now()}`,
  })

  return success(c, { status: 'cancelled' })
})

bookings.post('/status/:token/accept', async (c) => {
  const db = getDb(c)
  const token = c.req.param('token')

  const result = await db.transaction(async (tx) => {
    const [booking] = await tx
      .select()
      .from(bookingRequests)
      .where(and(eq(bookingRequests.accessToken, token), isNull(bookingRequests.deletedAt)))
      .for('update')

    if (!booking) throw DomainError.notFound('Booking not found')

    assertTransition(booking.status, 'confirmed')

    if (!booking.proposedDate || !booking.proposedTime) {
      throw DomainError.conflict('No proposal to accept')
    }

    const [updated] = await tx
      .update(bookingRequests)
      .set({
        status: 'confirmed',
        confirmedDate: booking.proposedDate,
        confirmedTime: booking.proposedTime,
        expiresAt: null,
        version: booking.version + 1,
        updatedAt: new Date(),
      })
      .where(and(eq(bookingRequests.id, booking.id), eq(bookingRequests.version, booking.version)))
      .returning()

    if (!updated) throw DomainError.conflict('Booking was modified')

    await tx.insert(bookingStatusHistory).values({
      bookingId: booking.id,
      previousStatus: booking.status,
      newStatus: 'confirmed',
      changedBy: 'client',
    })

    return updated
  })

  await c.env.NOTIFICATIONS_QUEUE?.send({
    type: 'booking_confirmed',
    bookingId: result.id,
    idempotencyKey: `${result.id}:confirmed:${Date.now()}`,
  })

  return success(c, { status: 'confirmed' })
})

function maskPhone(phone: string): string {
  if (phone.length < 8) return '****'
  return phone.slice(0, 4) + '****' + phone.slice(-4)
}

export default bookings
