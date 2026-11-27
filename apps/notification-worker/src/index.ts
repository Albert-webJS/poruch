import { createDb } from '@poruch/db'
import { eq } from 'drizzle-orm'
import { bookingRequests, notifications } from '@poruch/db/schema'
import type { ChannelAdapter } from './channels/index.js'
import { TurboSMSAdapter } from './channels/sms.js'
import { ConsoleAdapter } from './channels/console.js'
import { getTemplate } from './templates.js'

interface Env {
  HYPERDRIVE?: Hyperdrive
  DATABASE_URL?: string
  KV?: KVNamespace
  TURBOSMS_TOKEN?: string
  TURBOSMS_SENDER?: string
  APP_URL?: string
  ENVIRONMENT?: string
}

interface NotificationMessage {
  type: string
  bookingId: string
  providerId?: string
  idempotencyKey: string
}

function getConnectionString(env: Env): string {
  const cs = env.HYPERDRIVE?.connectionString ?? env.DATABASE_URL
  if (!cs) throw new Error('No database connection string')
  return cs
}

function getSmsAdapter(env: Env): ChannelAdapter {
  if (env.TURBOSMS_TOKEN && env.TURBOSMS_SENDER) {
    return new TurboSMSAdapter(env.TURBOSMS_TOKEN, env.TURBOSMS_SENDER)
  }
  return new ConsoleAdapter()
}

function getAppUrl(env: Env): string {
  return env.APP_URL ?? 'https://poruch.app'
}

export default {
  async queue(batch: MessageBatch<NotificationMessage>, env: Env, _ctx: ExecutionContext): Promise<void> {
    const db = createDb(getConnectionString(env))
    const sms = getSmsAdapter(env)
    const appUrl = getAppUrl(env)

    for (const msg of batch.messages) {
      try {
        const existing = await env.KV?.get(`notif:${msg.body.idempotencyKey}`)
        if (existing) {
          msg.ack()
          continue
        }

        const booking = await db.query.bookingRequests.findFirst({
          where: eq(bookingRequests.id, msg.body.bookingId),
          with: {
            provider: { columns: { name: true, phone: true, slug: true } },
            service: { columns: { name: true } },
            clientContact: { columns: { phone: true, name: true } },
          },
        })

        if (!booking) {
          console.error(`Booking ${msg.body.bookingId} not found`)
          msg.ack()
          continue
        }

        const statusUrl = `${appUrl}/booking/${booking.accessToken}`
        const tasks = getNotificationTasks(msg.body.type, booking, statusUrl)

        for (const task of tasks) {
          const result = await sms.send(task.phone, task.message)

          await db.insert(notifications).values({
            bookingId: booking.id,
            channel: 'sms',
            status: 'sent',
            recipientPhone: task.phone,
            templateKey: task.templateKey,
            idempotencyKey: `${msg.body.idempotencyKey}:${task.recipient}`,
            payload: { messageId: result.messageId },
            sentAt: new Date(),
          })
        }

        await env.KV?.put(`notif:${msg.body.idempotencyKey}`, '1', { expirationTtl: 24 * 60 * 60 })
        msg.ack()
      } catch (err) {
        console.error('Failed to process notification:', err)

        if (msg.attempts < 3) {
          const delay = Math.min(60 * Math.pow(2, msg.attempts), 900)
          msg.retry({ delaySeconds: delay })
        } else {
          try {
            await db.insert(notifications).values({
              bookingId: msg.body.bookingId,
              channel: 'sms',
              status: 'dlq',
              templateKey: msg.body.type,
              idempotencyKey: msg.body.idempotencyKey,
              failedAt: new Date(),
              errorMessage: err instanceof Error ? err.message : 'Unknown error',
              attempts: msg.attempts,
            })
          } catch {
          }
          msg.ack()
        }
      }
    }
  },
}

interface BookingData {
  id: string
  accessToken: string
  provider: { name: string; phone: string | null; slug: string }
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
  templateKey: string
  phone: string
  message: string
}

function getNotificationTasks(type: string, booking: BookingData, statusUrl: string): NotificationTask[] {
  const tasks: NotificationTask[] = []
  const preferredDT = `${booking.preferredDate} ${booking.preferredTime}`

  switch (type) {
    case 'booking_created':
      if (booking.provider.phone) {
        tasks.push({
          recipient: 'provider',
          templateKey: 'booking_created_provider',
          phone: booking.provider.phone,
          message: getTemplate('booking_created_provider', {
            clientName: booking.clientContact.name,
            serviceName: booking.service.name,
            dateTime: preferredDT,
          }),
        })
      }
      tasks.push({
        recipient: 'client',
        templateKey: 'booking_created_client',
        phone: booking.clientContact.phone,
        message: getTemplate('booking_created_client', {
          masterName: booking.provider.name,
          serviceName: booking.service.name,
          statusUrl,
        }),
      })
      break

    case 'booking_confirmed': {
      const confirmedDT = `${booking.confirmedDate ?? booking.preferredDate} ${booking.confirmedTime ?? booking.preferredTime}`
      tasks.push({
        recipient: 'client',
        templateKey: 'booking_confirmed_client',
        phone: booking.clientContact.phone,
        message: getTemplate('booking_confirmed_client', {
          masterName: booking.provider.name,
          serviceName: booking.service.name,
          dateTime: confirmedDT,
          statusUrl,
        }),
      })
      break
    }

    case 'booking_declined':
      tasks.push({
        recipient: 'client',
        templateKey: 'booking_declined_client',
        phone: booking.clientContact.phone,
        message: getTemplate('booking_declined_client', {
          masterName: booking.provider.name,
        }),
      })
      break

    case 'booking_proposed': {
      const proposedDT = `${booking.proposedDate} ${booking.proposedTime}`
      tasks.push({
        recipient: 'client',
        templateKey: 'booking_proposed_client',
        phone: booking.clientContact.phone,
        message: getTemplate('booking_proposed_client', {
          masterName: booking.provider.name,
          dateTime: proposedDT,
          statusUrl,
        }),
      })
      break
    }

    case 'booking_cancelled':
      if (booking.provider.phone) {
        tasks.push({
          recipient: 'provider',
          templateKey: 'booking_cancelled_provider',
          phone: booking.provider.phone,
          message: getTemplate('booking_cancelled_provider', {
            clientName: booking.clientContact.name,
            dateTime: preferredDT,
          }),
        })
      }
      break
  }

  return tasks
}
