import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { eq } from 'drizzle-orm'
import {
  users,
  providerProfiles,
  providerServices,
  serviceAreas,
  reviews,
  clientContacts,
  serviceCategories,
  cities,
  districts,
  workingHours,
} from './schema'

async function seedDemo() {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL is required')

  const sql = neon(url)
  const db = drizzle(sql)

  const [electricians] = await db.select().from(serviceCategories).where(eq(serviceCategories.slug, 'electricians'))
  const [plumbers] = await db.select().from(serviceCategories).where(eq(serviceCategories.slug, 'plumbers'))
  const [kyiv] = await db.select().from(cities).where(eq(cities.slug, 'kyiv'))
  const [irpin] = await db.select().from(cities).where(eq(cities.slug, 'irpin'))
  const kyivDistricts = await db.select().from(districts).where(eq(districts.cityId, kyiv.id))
  const irpinDistricts = await db.select().from(districts).where(eq(districts.cityId, irpin.id))

  console.log('Creating demo users...')
  const demoUsers = await db
    .insert(users)
    .values([
      { clerkId: 'demo_oleksandr', email: 'oleksandr@demo.poruch.app', phone: '+380501234567', role: 'master' },
      { clerkId: 'demo_iryna', email: 'iryna@demo.poruch.app', phone: '+380671234567', role: 'master' },
      { clerkId: 'demo_mykola', email: 'mykola@demo.poruch.app', phone: '+380931234567', role: 'master' },
    ])
    .returning()

  console.log(`  ✓ ${demoUsers.length} користувачів`)

  console.log('Creating provider profiles...')
  const [oleksandr] = await db
    .insert(providerProfiles)
    .values({
      userId: demoUsers[0].id,
      slug: 'oleksandr',
      name: 'Олександр Коваленко',
      description: 'Електрик з 12-річним досвідом. Монтаж проводки, встановлення розеток, підключення побутової техніки. Працюю швидко та акуратно.',
      categoryId: electricians.id,
      cityId: kyiv.id,
      phone: '+380501234567',
      status: 'published',
      responseTimeHours: 2,
    })
    .returning()

  const [iryna] = await db
    .insert(providerProfiles)
    .values({
      userId: demoUsers[1].id,
      slug: 'iryna-santehnik',
      name: 'Ірина Мельник',
      description: 'Сантехнік-професіонал. Заміна труб, встановлення сантехніки, усунення протікань. Чисто і з гарантією.',
      categoryId: plumbers.id,
      cityId: kyiv.id,
      phone: '+380671234567',
      status: 'published',
      responseTimeHours: 4,
    })
    .returning()

  const [mykola] = await db
    .insert(providerProfiles)
    .values({
      userId: demoUsers[2].id,
      slug: 'mykola-elektryk',
      name: 'Микола Бондаренко',
      description: 'Електромонтажні роботи будь-якої складності. Новобудови, квартири, приватні будинки.',
      categoryId: electricians.id,
      cityId: irpin.id,
      phone: '+380931234567',
      status: 'published',
      responseTimeHours: 1,
    })
    .returning()

  console.log(`  ✓ Олександр, Ірина, Микола`)

  console.log('Creating services...')
  await db.insert(providerServices).values([
    { providerId: oleksandr.id, name: 'Встановлення розетки', priceType: 'fixed' as const, priceAmount: 350, durationMinutes: 30, sortOrder: 1 },
    { providerId: oleksandr.id, name: 'Монтаж проводки (кімната)', priceType: 'from' as const, priceAmount: 2500, durationMinutes: 180, sortOrder: 2 },
    { providerId: oleksandr.id, name: 'Підключення люстри', priceType: 'fixed' as const, priceAmount: 500, durationMinutes: 45, sortOrder: 3 },
    { providerId: oleksandr.id, name: 'Діагностика електромережі', priceType: 'fixed' as const, priceAmount: 800, durationMinutes: 60, sortOrder: 4 },

    { providerId: iryna.id, name: 'Усунення протікання', priceType: 'from' as const, priceAmount: 400, durationMinutes: 60, sortOrder: 1 },
    { providerId: iryna.id, name: 'Встановлення змішувача', priceType: 'fixed' as const, priceAmount: 600, durationMinutes: 45, sortOrder: 2 },
    { providerId: iryna.id, name: 'Заміна труб (погонний метр)', priceType: 'from' as const, priceAmount: 350, durationMinutes: 30, sortOrder: 3 },
    { providerId: iryna.id, name: 'Встановлення унітазу', priceType: 'fixed' as const, priceAmount: 1200, durationMinutes: 120, sortOrder: 4 },

    { providerId: mykola.id, name: 'Повна розводка квартири', priceType: 'from' as const, priceAmount: 15000, durationMinutes: 480, sortOrder: 1 },
    { providerId: mykola.id, name: 'Встановлення автоматів у щитку', priceType: 'fixed' as const, priceAmount: 200, durationMinutes: 20, sortOrder: 2 },
    { providerId: mykola.id, name: 'Монтаж теплої підлоги', priceType: 'from' as const, priceAmount: 3000, durationMinutes: 240, sortOrder: 3 },
  ])
  console.log(`  ✓ 11 послуг`)

  console.log('Creating service areas...')
  await db.insert(serviceAreas).values([
    { providerId: oleksandr.id, districtId: kyivDistricts[4].id },
    { providerId: oleksandr.id, districtId: kyivDistricts[6].id },
    { providerId: oleksandr.id, districtId: kyivDistricts[9].id },
    { providerId: iryna.id, districtId: kyivDistricts[5].id },
    { providerId: iryna.id, districtId: kyivDistricts[0].id },
    { providerId: iryna.id, districtId: kyivDistricts[8].id },
    ...irpinDistricts.map((d) => ({ providerId: mykola.id, districtId: d.id })),
  ])
  console.log(`  ✓ Зони обслуговування`)

  console.log('Creating working hours...')
  const weekdayHours = [1, 2, 3, 4, 5].map((day) => ({ dayOfWeek: day, startTime: '09:00', endTime: '18:00' }))
  const saturdayHours = { dayOfWeek: 6, startTime: '10:00', endTime: '15:00' }

  await db.insert(workingHours).values([
    ...weekdayHours.map((h) => ({ ...h, providerId: oleksandr.id })),
    { ...saturdayHours, providerId: oleksandr.id },
    ...weekdayHours.map((h) => ({ ...h, providerId: iryna.id })),
    { ...saturdayHours, providerId: iryna.id },
    ...weekdayHours.map((h) => ({ ...h, providerId: mykola.id })),
    { ...saturdayHours, providerId: mykola.id },
  ])
  console.log('  ✓ Робочі години (Пн-Пт 09:00-18:00, Сб 10:00-15:00)')

  console.log('Creating reviews...')
  const demoClients = await db
    .insert(clientContacts)
    .values([
      { phone: '+380991111111', name: 'Андрій К.' },
      { phone: '+380992222222', name: 'Марина Л.' },
      { phone: '+380993333333', name: 'Сергій В.' },
      { phone: '+380994444444', name: 'Олена П.' },
      { phone: '+380995555555', name: 'Дмитро Ш.' },
    ])
    .returning()

  await db.insert(reviews).values([
    { providerId: oleksandr.id, clientContactId: demoClients[0].id, rating: 5, comment: 'Дуже швидко замінив розетку, все працює ідеально. Рекомендую!', isPublished: true },
    { providerId: oleksandr.id, clientContactId: demoClients[1].id, rating: 5, comment: 'Професійно зробив проводку в новобудові. Акуратний і пунктуальний.', isPublished: true, providerReply: 'Дякую за довіру! Звертайтесь.' },
    { providerId: oleksandr.id, clientContactId: demoClients[2].id, rating: 4, comment: 'Добре зробив роботу, але трохи запізнився.', isPublished: true },
    { providerId: oleksandr.id, clientContactId: demoClients[3].id, rating: 5, comment: 'Відмінний електрик! Вже вдруге звертаємось.', isPublished: true },
    { providerId: iryna.id, clientContactId: demoClients[0].id, rating: 5, comment: 'Нарешті знайшла хорошого сантехніка! Все зробила чисто і якісно.', isPublished: true },
    { providerId: iryna.id, clientContactId: demoClients[4].id, rating: 4, comment: 'Швидко усунула протікання. Ціна адекватна.', isPublished: true },
    { providerId: iryna.id, clientContactId: demoClients[2].id, rating: 5, comment: 'Встановила змішувач за годину. Супер!', isPublished: true },
    { providerId: mykola.id, clientContactId: demoClients[1].id, rating: 5, comment: 'Зробив всю електрику в будинку. Якість на вищому рівні.', isPublished: true },
    { providerId: mykola.id, clientContactId: demoClients[3].id, rating: 5, comment: 'Швидко, якісно, з гарантією. Однозначно рекомендую!', isPublished: true },
  ])
  console.log(`  ✓ 9 відгуків`)

  console.log('\nDemo seed completed!')
}

seedDemo().catch((err) => {
  console.error('Demo seed failed:', err)
  process.exit(1)
})
