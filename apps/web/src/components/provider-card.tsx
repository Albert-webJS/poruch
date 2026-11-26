import Image from 'next/image'
import Link from 'next/link'
import type { ProviderCard } from '@/lib/api'

function StarRating({ rating, count }: { rating: number | null; count: number }) {
  if (!rating) return <span className="text-sm text-ocean-500">Новий</span>
  return (
    <span className="inline-flex items-center gap-1 text-sm font-medium">
      <span className="text-amber-500">&#9733;</span>
      <span className="text-ocean-900">{rating}</span>
      <span className="text-ocean-500">({count})</span>
    </span>
  )
}

function formatPrice(amount: number | null) {
  if (!amount) return null
  return `від ${amount} грн`
}

export function ProviderCardComponent({ provider }: { provider: ProviderCard }) {
  return (
    <Link
      href={`/p/${provider.slug}`}
      className="bg-white rounded-2xl border border-ocean-100 overflow-hidden hover:shadow-md transition-shadow"
    >
      <div className="aspect-[4/3] bg-ocean-100 relative">
        {provider.photoUrl ? (
          <Image
            src={provider.photoUrl}
            alt={provider.name}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-5xl text-ocean-300">
            {provider.name.charAt(0)}
          </div>
        )}
        <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm rounded-full px-2.5 py-1">
          <StarRating rating={provider.rating} count={provider.reviewCount} />
        </div>
      </div>
      <div className="p-4">
        <h3 className="font-bold text-ocean-900 text-lg">{provider.name}</h3>
        <p className="text-sm text-ocean-700 mt-0.5">
          {provider.categoryName} &middot; {provider.cityName}
        </p>
        {provider.priceFrom && (
          <p className="text-sm text-ocean-500 mt-2 font-medium">
            {formatPrice(provider.priceFrom)}
          </p>
        )}
      </div>
    </Link>
  )
}
