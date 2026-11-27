import type { Metadata } from 'next'
import Link from 'next/link'
import { api } from '@/lib/api'
import { ProviderCardComponent } from '@/components/provider-card'
import { notFound } from 'next/navigation'

interface Props {
  params: Promise<{ category: string }>
  searchParams: Promise<{ city?: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category: slug } = await params
  try {
    const categories = await api.getCategories()
    const cat = categories.find((c) => c.slug === slug)
    if (!cat) return { title: 'Категорія не знайдена' }
    return {
      title: `${cat.nameUk} — майстри у вашому місті`,
      description: `Знайдіть перевірених спеціалістів у категорії "${cat.nameUk}". Відгуки, ціни, онлайн-запис.`,
    }
  } catch {
    return { title: 'Категорія' }
  }
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { category: slug } = await params
  const { city } = await searchParams

  let category: Awaited<ReturnType<typeof api.getCategories>>[number] | undefined
  let providers: Awaited<ReturnType<typeof api.getProviders>> = []

  try {
    const categories = await api.getCategories()
    category = categories.find((c) => c.slug === slug)
    if (!category) notFound()

    providers = await api.getProviders({ category: slug, city })
  } catch {
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <nav className="text-sm text-ocean-500 mb-6">
        <Link href="/" className="hover:text-ocean-700 transition-colors">
          Головна
        </Link>
        <span className="mx-2">/</span>
        <span className="text-ocean-900">{category?.nameUk}</span>
      </nav>

      <h1 className="text-2xl md:text-3xl font-bold text-ocean-900 mb-6">
        {category?.nameUk}
      </h1>

      {providers.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {providers.map((p) => (
            <ProviderCardComponent key={p.id} provider={p} />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-ocean-100 p-8 text-center">
          <p className="text-ocean-700 text-lg mb-2">
            Поки що немає майстрів у категорії &laquo;{category?.nameUk}&raquo;
          </p>
          <p className="text-ocean-500 text-sm">
            <Link href="/pro/dashboard" className="text-primary font-medium hover:underline">
              Зареєструватися як майстер
            </Link>
          </p>
        </div>
      )}
    </div>
  )
}
