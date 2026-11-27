import type { Metadata } from 'next'
import Link from 'next/link'
import { api } from '@/lib/api'
import { notFound } from 'next/navigation'
import { BookingForm } from '@/components/booking-form'

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const provider = await api.getProvider(slug).catch(() => null)
  if (!provider) return { title: 'Не знайдено' }
  return { title: `Записатися до ${provider.name} — Порuch` }
}

export default async function BookingPage({ params }: Props) {
  const { slug } = await params
  const provider = await api.getProvider(slug).catch(() => null)
  if (!provider) notFound()

  return (
    <main className="max-w-2xl mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-ocean-500 mb-6">
        <Link href="/" className="hover:text-ocean-700">Головна</Link>
        <span>/</span>
        <Link href={`/p/${provider.slug}`} className="hover:text-ocean-700">{provider.name}</Link>
        <span>/</span>
        <span className="text-ocean-900">Записатися</span>
      </nav>

      <h1 className="text-2xl font-bold text-ocean-900 mb-6">
        Записатися до {provider.name}
      </h1>

      <BookingForm
        slug={provider.slug}
        providerId={provider.id}
        providerName={provider.name}
        services={provider.services}
      />
    </main>
  )
}
