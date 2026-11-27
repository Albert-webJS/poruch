import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { Suspense } from 'react'
import { api } from '@/lib/api'
import { notFound } from 'next/navigation'
import { CitySync } from '@/components/city-sync'

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  try {
    const provider = await api.getProvider(slug)
    return {
      title: `${provider.name} — ${provider.categoryName}`,
      description: provider.description ?? `${provider.categoryName} у місті ${provider.cityName}. Відгуки, ціни, онлайн-запис.`,
    }
  } catch {
    return { title: 'Майстер не знайдений' }
  }
}

function formatPrice(type: string, amount: number | null): string {
  if (type === 'on_request') return 'За запитом'
  if (!amount) return ''
  if (type === 'from') return `від ${amount} грн`
  return `${amount} грн`
}

function formatDuration(minutes: number | null): string | null {
  if (!minutes) return null
  if (minutes < 60) return `${minutes} хв`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h} год ${m} хв` : `${h} год`
}

function StarRating({ rating, count }: { rating: number; count: number }) {
  return (
    <div className="flex items-center gap-1.5 shrink-0 whitespace-nowrap">
      <span className="text-amber-500 text-lg">&#9733;</span>
      <span className="font-bold text-ocean-900">{Math.round(rating * 10) / 10}</span>
      <span className="text-ocean-500 text-sm">({count})</span>
    </div>
  )
}

export default async function ProviderPage({ params }: Props) {
  const { slug } = await params

  let provider: Awaited<ReturnType<typeof api.getProvider>> | null = null
  try {
    provider = await api.getProvider(slug)
  } catch {
    notFound()
  }
  if (!provider) notFound()

  const ratings = provider.reviews.map((r) => r.rating)
  const avgRating = ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <Suspense>
        <CitySync citySlug={provider.citySlug} />
      </Suspense>
      {/* Breadcrumb */}
      <nav className="text-sm text-ocean-500 mb-6">
        <Link href="/" className="hover:text-ocean-700 transition-colors">
          Головна
        </Link>
        <span className="mx-2">/</span>
        <span className="text-ocean-900">{provider.name}</span>
      </nav>

      {/* Profile header */}
      <div className="bg-white rounded-2xl border border-ocean-100 p-6 md:p-8 mb-6">
        <div className="flex flex-col md:flex-row gap-6">
          {/* Photo */}
          <div className="w-32 h-32 md:w-40 md:h-40 rounded-2xl bg-ocean-100 overflow-hidden shrink-0">
            {provider.photoUrl ? (
              <Image src={provider.photoUrl} alt={provider.name} fill sizes="160px" className="object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-5xl text-ocean-300 font-bold">
                {provider.name.charAt(0)}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-ocean-900">{provider.name}</h1>
                <p className="text-ocean-700 mt-1">
                  {provider.categoryName} &middot; {provider.cityName}
                </p>
              </div>
              {avgRating && <StarRating rating={avgRating} count={ratings.length} />}
            </div>

            {provider.description && (
              <p className="text-ocean-700 mt-4 leading-relaxed">{provider.description}</p>
            )}

            {provider.districts.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4">
                {provider.districts.map((d) => (
                  <span key={d} className="text-xs bg-ocean-100 text-ocean-700 px-2.5 py-1 rounded-full">
                    {d}
                  </span>
                ))}
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-3 mt-6">
              <Link
                href={`/p/${provider.slug}/booking`}
                className="bg-primary text-white px-6 py-3 rounded-xl font-medium hover:bg-primary-hover transition-colors"
              >
                Записатися
              </Link>
              {provider.phone && (
                <a
                  href={`tel:${provider.phone}`}
                  className="border border-ocean-100 text-ocean-700 px-6 py-3 rounded-xl font-medium hover:border-ocean-300 hover:text-ocean-900 transition-colors text-center"
                >
                  Подзвонити
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Services */}
      {provider.services.length > 0 && (
        <section className="bg-white rounded-2xl border border-ocean-100 p-6 md:p-8 mb-6">
          <h2 className="text-xl font-bold text-ocean-900 mb-4">Послуги</h2>
          <div className="divide-y divide-ocean-100">
            {provider.services.map((s) => (
              <div key={s.id} className="py-4 first:pt-0 last:pb-0 flex items-center justify-between gap-4">
                <div>
                  <h3 className="font-medium text-ocean-900">{s.name}</h3>
                  {s.description && (
                    <p className="text-sm text-ocean-500 mt-0.5">{s.description}</p>
                  )}
                  {formatDuration(s.durationMinutes) && (
                    <p className="text-xs text-ocean-500 mt-1">{formatDuration(s.durationMinutes)}</p>
                  )}
                </div>
                <span className="text-sm font-medium text-ocean-900 whitespace-nowrap">
                  {formatPrice(s.priceType, s.priceAmount)}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Reviews */}
      {provider.reviews.length > 0 && (
        <section className="bg-white rounded-2xl border border-ocean-100 p-6 md:p-8">
          <h2 className="text-xl font-bold text-ocean-900 mb-4">
            Відгуки ({provider.reviews.length})
          </h2>
          <div className="space-y-4">
            {provider.reviews.map((r, i) => (
              <div key={i} className="border-b border-ocean-100 pb-4 last:border-0 last:pb-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-ocean-900">{r.clientName}</span>
                  <span className="text-amber-500 text-sm">
                    {'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}
                  </span>
                </div>
                {r.comment && <p className="text-sm text-ocean-700">{r.comment}</p>}
                {r.providerReply && (
                  <div className="mt-2 ml-4 pl-4 border-l-2 border-ocean-100">
                    <p className="text-sm text-ocean-500">
                      <span className="font-medium">Відповідь:</span> {r.providerReply}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
