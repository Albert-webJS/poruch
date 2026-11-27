import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { serviceCategories, cities, districts } from './schema'

async function seed() {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL is required')

  const sql = neon(url)
  const db = drizzle(sql)

  console.log('Seeding categories...')
  const [electricians, plumbers] = await db
    .insert(serviceCategories)
    .values([
      { slug: 'electricians', nameUk: 'Електрики', nameEn: 'Electricians', iconName: 'zap', sortOrder: 1 },
      { slug: 'plumbers', nameUk: 'Сантехніки', nameEn: 'Plumbers', iconName: 'droplets', sortOrder: 2 },
    ])
    .returning()

  console.log(`  ✓ ${electricians.nameUk}, ${plumbers.nameUk}`)

  console.log('Seeding cities...')
  const [kyiv, irpin] = await db
    .insert(cities)
    .values([
      { slug: 'kyiv', nameUk: 'Київ', nameEn: 'Kyiv' },
      { slug: 'irpin', nameUk: 'Ірпінь', nameEn: 'Irpin' },
    ])
    .returning()

  console.log(`  ✓ ${kyiv.nameUk}, ${irpin.nameUk}`)

  console.log('Seeding districts...')

  const kyivDistricts = await db
    .insert(districts)
    .values([
      { cityId: kyiv.id, slug: 'holosiivskyi', nameUk: 'Голосіївський', nameEn: 'Holosiivskyi', sortOrder: 1 },
      { cityId: kyiv.id, slug: 'darnytskyi', nameUk: 'Дарницький', nameEn: 'Darnytskyi', sortOrder: 2 },
      { cityId: kyiv.id, slug: 'desnianskyi', nameUk: 'Деснянський', nameEn: 'Desnianskyi', sortOrder: 3 },
      { cityId: kyiv.id, slug: 'dniprovskyi', nameUk: 'Дніпровський', nameEn: 'Dniprovskyi', sortOrder: 4 },
      { cityId: kyiv.id, slug: 'obolonskyi', nameUk: 'Оболонський', nameEn: 'Obolonskyi', sortOrder: 5 },
      { cityId: kyiv.id, slug: 'pecherskyi', nameUk: 'Печерський', nameEn: 'Pecherskyi', sortOrder: 6 },
      { cityId: kyiv.id, slug: 'podilskyi', nameUk: 'Подільський', nameEn: 'Podilskyi', sortOrder: 7 },
      { cityId: kyiv.id, slug: 'sviatoshynskyi', nameUk: 'Святошинський', nameEn: 'Sviatoshynskyi', sortOrder: 8 },
      { cityId: kyiv.id, slug: 'solomianskyi', nameUk: 'Солом\'янський', nameEn: 'Solomianskyi', sortOrder: 9 },
      { cityId: kyiv.id, slug: 'shevchenkivskyi', nameUk: 'Шевченківський', nameEn: 'Shevchenkivskyi', sortOrder: 10 },
    ])
    .returning()

  console.log(`  ✓ Київ: ${kyivDistricts.length} районів`)

  const irpinDistricts = await db
    .insert(districts)
    .values([
      { cityId: irpin.id, slug: 'irpin-center', nameUk: 'Ірпінь (центр)', nameEn: 'Irpin (center)', sortOrder: 1 },
      { cityId: irpin.id, slug: 'bucha', nameUk: 'Буча', nameEn: 'Bucha', sortOrder: 2 },
      { cityId: irpin.id, slug: 'vorzel', nameUk: 'Ворзель', nameEn: 'Vorzel', sortOrder: 3 },
      { cityId: irpin.id, slug: 'hostomel', nameUk: 'Гостомель', nameEn: 'Hostomel', sortOrder: 4 },
      { cityId: irpin.id, slug: 'kotsyubynske', nameUk: 'Коцюбинське', nameEn: 'Kotsyubynske', sortOrder: 5 },
    ])
    .returning()

  console.log(`  ✓ Ірпінь: ${irpinDistricts.length} районів`)

  console.log('\nSeed completed!')
}

seed().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
