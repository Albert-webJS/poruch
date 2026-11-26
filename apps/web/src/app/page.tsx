import Link from 'next/link'
import { api } from '@/lib/api'
import { CategoryIcon } from '@/components/category-icon'
import { ProviderCardComponent } from '@/components/provider-card'
import { SearchBar } from '@/components/search-bar'

export default async function Home() {
  let categories: Awaited<ReturnType<typeof api.getCategories>> = []
  let providers: Awaited<ReturnType<typeof api.getProviders>> = []

  try {
    ;[categories, providers] = await Promise.all([api.getCategories(), api.getProviders()])
  } catch {
    // API not available during build
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* Hero + Search */}
      <section className="mb-10">
        <h1 className="text-3xl md:text-4xl font-extrabold text-ocean-900 mb-2">
          Знайдіть перевіреного майстра поруч
        </h1>
        <p className="text-ocean-700 mb-6 text-lg">
          Електрики, сантехніки та інші спеціалісти у вашому місті
        </p>
        <SearchBar categories={categories} />
      </section>

      {/* Categories */}
      <section className="mb-10">
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
          {categories.map((cat) => (
            <Link
              key={cat.id}
              href={`/services/${cat.slug}`}
              className="flex flex-col items-center gap-2 px-6 py-4 bg-white rounded-2xl border border-ocean-100 hover:border-ocean-300 hover:shadow-sm transition-all shrink-0 min-w-[100px]"
            >
              <CategoryIcon name={cat.iconName} label={cat.nameUk} className="text-2xl" />
              <span className="text-sm font-medium text-ocean-900">{cat.nameUk}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Recommended providers */}
      <section>
        <h2 className="text-xl font-bold text-ocean-900 mb-4">Рекомендовані майстри</h2>
        {providers.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {providers.map((p) => (
              <ProviderCardComponent key={p.id} provider={p} />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-ocean-100 p-8 text-center">
            <p className="text-ocean-700 text-lg mb-2">Поки що немає майстрів</p>
            <p className="text-ocean-500 text-sm">
              Станьте першим!{' '}
              <Link href="/pro/dashboard" className="text-primary font-medium hover:underline">
                Зареєструватися як майстер
              </Link>
            </p>
          </div>
        )}
      </section>
    </div>
  )
}
