'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { CitySelector } from './city-selector'

interface Props {
  cities: { slug: string; nameUk: string }[]
}

export function Header({ cities }: Props) {
  const pathname = usePathname()
  const isPro = pathname.startsWith('/pro')

  return (
    <header className="sticky top-0 z-50 border-b border-ocean-100 bg-white/95 backdrop-blur-sm">
      <div className="mx-auto max-w-6xl flex items-center justify-between px-4 h-14">
        <Link href={isPro ? '/pro/bookings' : '/'} className="flex items-center gap-2 shrink-0">
          <Image src="/logo.svg" alt="Poruch" width={110} height={28} priority />
        </Link>

        {isPro ? (
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="flex items-center gap-1.5 text-sm text-ocean-500 hover:text-ocean-700 transition-colors px-3 py-2 rounded-lg hover:bg-ocean-100/50"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              На сайт
            </Link>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <CitySelector cities={cities} />
            <Link
              href="/pro/bookings"
              className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-hover transition-colors"
            >
              Я майстер
            </Link>
          </div>
        )}
      </div>
    </header>
  )
}
