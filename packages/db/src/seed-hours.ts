import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { eq } from 'drizzle-orm'
import { providerProfiles, workingHours } from './schema'

async function seedHours() {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL is required')

  const sql = neon(url)
  const db = drizzle(sql)

  const providers = await db.select({ id: providerProfiles.id, slug: providerProfiles.slug })
    .from(providerProfiles)
    .where(eq(providerProfiles.status, 'published'))

  console.log(`Found ${providers.length} published providers`)

  const weekdays = [1, 2, 3, 4, 5].map((day) => ({ dayOfWeek: day, startTime: '09:00', endTime: '18:00' }))
  const saturday = { dayOfWeek: 6, startTime: '10:00', endTime: '15:00' }

  for (const p of providers) {
    const existing = await db.select().from(workingHours).where(eq(workingHours.providerId, p.id))
    if (existing.length > 0) {
      console.log(`  ⏭ ${p.slug} — already has ${existing.length} records`)
      continue
    }

    await db.insert(workingHours).values([
      ...weekdays.map((h) => ({ ...h, providerId: p.id })),
      { ...saturday, providerId: p.id },
    ])
    console.log(`  ✓ ${p.slug} — added 6 working day records`)
  }

  console.log('Done!')
}

seedHours().catch((err) => {
  console.error('Failed:', err)
  process.exit(1)
})
