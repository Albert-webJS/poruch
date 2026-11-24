import { createDb } from '@poruch/db'
import { eq } from 'drizzle-orm'
import { bookingRequests, notifications } from '@poruch/db/schema'
import { sendSMS } from './sms.js'
import { getTemplate } from './templates.js'

interface Env {
  HYPERDRIVE: Hyperdrive
  KV: KVNamespace
  TURBOSMS_TOKEN: string
  TURBOSMS_SENDER: string
}

interface NotificationMessage {
  type: string
  bookingId: string
  providerId?: string
  idempotencyKey: string
}

export default {
  async queue(batch: MessageBatch<NotificationMessage>, env: Env, _ctx: ExecutionContext): Promise<void> {
    const db = createDb(env.HYPERDRIVE.connectionString)

    for (const msg of batch.messages) {
      try {
        // Deduplication check
        const existing = await env.KV.get(`notif:${msg.body.idempotencyKey}`)
        if (existing) {
          msg.ack()
          continue
        }

        // Load booking with relations
        const booking = await db.query.bookingRequests.findFirst({
          where: eq(bookingRequests.id, msg.body.bookingId),
          with: {
            provider: true,
            service: true,
            clientContact: true,
          },
        })

        if (!booking) {
          console.error(`Booking ${msg.body.bookingId} not found`)
          msg.ack()
          continue
        }

        // Determine recipients and templates
        const tasks = getNotificationTasks(msg.body.type, booking)

        for (const task of tasks) {
          // Send SMS
          await sendSMS({
            phone: task.phone,
            message: task.message,
            token: env.TURBOSMS_TOKEN,
            sender: env.TURBOSMS_SENDER,
          })

          // Record in DB
          await db.insert(notifications).values({
            bookingId: booking.id,
            channel: 'sms',
            status: 'sent',
            recipientPhone: task.phone,
            templateKey: msg.body.type,
            idempotencyKey: `${msg.body.idempotencyKey}:${task.recipient}`,
            sentAt: new Date(),
          })
        }

        // Mark as processed
        await env.KV.put(`notif:${msg.body.idempotencyKey}`, '1', { expirationTtl: 24 * 60 * 60 })
        msg.ack()
      } catch (err) {
        console.error(`Failed to process notification:`, err)

        if (msg.attempts < 3) {
          const delay = Math.min(60 * Math.pow(2, msg.attempts), 900)
          msg.retry({ delaySeconds: delay })
        } else {
          // Record failure
          try {
            const db2 = createDb(env.HYPERDRIVE.connectionString)
            await db2.insert(notifications).values({
              bookingId: msg.body.bookingId,
              channel: 'sms',
              status: 'dlq',
              templateKey: msg.body.type,
              idempotencyKey: msg.body.idempotencyKey,
              failedAt: new Date(),
              errorMessage: err instanceof Error ? err.message : 'Unknown error',
            })
          } catch {
            // Best effort
          }
          msg.ack() // Let DLQ handle it
        }
      }
    }
  },
}

interface BookingWithRelations {
  id: string
  provider: { name: string; phone: string | null }
  service: { name: string }
  clientContact: { phone: string; name: string }
  preferredDate: string
  preferredTime: string
  confirmedDate: string | null
  confirmedTime: string | null
  proposedDate: string | null
  proposedTime: string | null
}

interface NotificationTask {
  recipient: 'provider' | 'client'
  phone: string
  message: string
}

function getNotificationTasks(type: string, booking: BookingWithRelations): NotificationTask[] {
  const tasks: NotificationTask[] = []

  switch (type) {
    case 'booking_created':
      if (booking.provider.phone) {
        tasks.push({
          recipient: 'provider',
          phone: booking.provider.phone,
          message: getTemplate('booking_created_provider', {
            clientName: booking.clientContact.name,
            serviceName: booking.service.name,
            dateTime: `${booking.preferredDate} ${booking.preferredTime}`,
          }),
        })
      }
      break

    case 'booking_confirmed':
      tasks.push({
        recipient: 'client',
        phone: booking.clientContact.phone,
        message: getTemplate('booking_confirmed_client', {
          masterName: booking.provider.name,
          serviceName: booking.service.name,
          dateTime: `${booking.confirmedDate ?? booking.preferredDate} ${booking.confirmedTime ?? booking.preferredTime}`,
        }),
      })
      break

    case 'booking_declined':
      tasks.push({
        recipient: 'client',
        phone: booking.clientContact.phone,
        message: getTemplate('booking_declined_client', {
          masterName: booking.provider.name,
        }),
      })
      break

    case 'booking_proposed':
      tasks.push({
        recipient: 'client',
        phone: booking.clientContact.phone,
        message: getTemplate('booking_proposed_client', {
          masterName: booking.provider.name,
          dateTime: `${booking.proposedDate} ${booking.proposedTime}`,
        }),
      })
      break

    case 'booking_cancelled':
      if (booking.provider.phone) {
        tasks.push({
          recipient: 'provider',
          phone: booking.provider.phone,
          message: getTemplate('booking_cancelled_provider', {
            clientName: booking.clientContact.name,
            dateTime: `${booking.preferredDate} ${booking.preferredTime}`,
          }),
        })
      }
      break
  }

  return tasks
}
