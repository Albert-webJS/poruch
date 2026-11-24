import { Hono } from 'hono'
import { eq } from 'drizzle-orm'
import { users, providerProfiles } from '@poruch/db/schema'
import type { AppEnv } from '../lib/bindings.js'
import { getDb } from '../lib/db.js'

const webhooks = new Hono<AppEnv>()

// POST /webhooks/clerk — handle Clerk webhook events
webhooks.post('/clerk', async (c) => {
  // Verify webhook signature (svix)
  const svixId = c.req.header('svix-id')
  const svixTimestamp = c.req.header('svix-timestamp')
  const svixSignature = c.req.header('svix-signature')

  if (!svixId || !svixTimestamp || !svixSignature) {
    return c.json({ error: 'Missing svix headers' }, 400)
  }

  // TODO: verify HMAC signature with CLERK_WEBHOOK_SECRET

  const body = await c.req.json()
  const { type, data } = body

  const db = getDb(c)

  // Idempotency: check if already processed
  const cached = await c.env.KV.get(`webhook:${svixId}`)
  if (cached) return c.json({ received: true })

  switch (type) {
    case 'user.created': {
      const role = data.public_metadata?.role ?? 'client'

      // Create user record
      await db.insert(users).values({
        clerkId: data.id,
        email: data.email_addresses?.[0]?.email_address,
        phone: data.phone_numbers?.[0]?.phone_number,
        role,
      }).onConflictDoNothing()

      // If master, create draft provider profile
      if (role === 'master') {
        const user = await db.query.users.findFirst({
          where: eq(users.clerkId, data.id),
        })

        if (user) {
          const slug = generateSlug(data.first_name, data.last_name, data.id)

          await db.insert(providerProfiles).values({
            userId: user.id,
            slug,
            name: `${data.first_name ?? ''} ${data.last_name ?? ''}`.trim() || 'Новий майстер',
            categoryId: '00000000-0000-0000-0000-000000000000', // placeholder, set during onboarding
            cityId: '00000000-0000-0000-0000-000000000000', // placeholder
            status: 'draft',
          }).onConflictDoNothing()
        }
      }
      break
    }

    case 'user.updated': {
      await db
        .update(users)
        .set({
          email: data.email_addresses?.[0]?.email_address,
          phone: data.phone_numbers?.[0]?.phone_number,
          role: data.public_metadata?.role ?? 'client',
          updatedAt: new Date(),
        })
        .where(eq(users.clerkId, data.id))
      break
    }

    case 'user.deleted': {
      // Soft delete: mark user and provider profile
      const user = await db.query.users.findFirst({
        where: eq(users.clerkId, data.id),
      })
      if (user) {
        await db
          .update(providerProfiles)
          .set({ deletedAt: new Date(), status: 'suspended' })
          .where(eq(providerProfiles.userId, user.id))
      }
      break
    }
  }

  // Mark as processed
  await c.env.KV.put(`webhook:${svixId}`, '1', { expirationTtl: 7 * 24 * 60 * 60 })

  return c.json({ received: true })
})

function generateSlug(firstName?: string, lastName?: string, id?: string): string {
  const translitMap: Record<string, string> = {
    а: 'a', б: 'b', в: 'v', г: 'h', ґ: 'g', д: 'd', е: 'e', є: 'ye',
    ж: 'zh', з: 'z', и: 'y', і: 'i', ї: 'yi', й: 'y', к: 'k', л: 'l',
    м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u',
    ф: 'f', х: 'kh', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'shch', ю: 'yu',
    я: 'ya', ь: '', "'": '',
  }

  const name = `${firstName ?? ''}-${lastName ?? ''}`.toLowerCase().trim()
  const transliterated = name
    .split('')
    .map((c) => translitMap[c] ?? c)
    .join('')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')

  const suffix = (id ?? crypto.randomUUID()).slice(-6)
  return transliterated ? `${transliterated}-${suffix}` : `master-${suffix}`
}

export default webhooks
