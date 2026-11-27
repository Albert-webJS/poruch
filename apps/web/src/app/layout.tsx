import type { Metadata } from 'next'
import { ClerkProvider } from '@clerk/nextjs'
import { ukUA } from '@clerk/localizations'
import Image from 'next/image'
import Link from 'next/link'
import { CitySelector } from '@/components/city-selector'
import { api } from '@/lib/api'
import './globals.css'

export const metadata: Metadata = {
  title: {
    default: 'Poruch — Знайди майстра поруч',
    template: '%s | Poruch',
  },
  description: 'Маркетплейс локальних послуг. Електрики, сантехніки та інші майстри у вашому місті.',
  icons: {
    icon: '/favicon.svg',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider localization={ukUA}>
      <html lang="uk">
        <body className="min-h-screen flex flex-col bg-surface">
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
        </body>
      </html>
    </ClerkProvider>
  )
}

async function Header() {
  let cities: { slug: string; nameUk: string }[] = []
  try {
    cities = await api.getCities()
  } catch {
  }

  return (
    <header className="sticky top-0 z-50 border-b border-ocean-100 bg-white/95 backdrop-blur-sm">
      <div className="mx-auto max-w-6xl flex items-center justify-between px-4 h-16">
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <Image src="/logo.svg" alt="Poruch" width={120} height={32} priority />
        </Link>

        <div className="flex items-center gap-3">
          <CitySelector cities={cities} />
          <Link
            href="/pro/dashboard"
            className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-hover transition-colors"
          >
            Я майстер
          </Link>
        </div>
      </div>
    </header>
  )
}

function Footer() {
  return (
    <footer className="border-t border-ocean-100 bg-white py-8 mt-auto">
      <div className="mx-auto max-w-6xl px-4 flex items-center justify-between text-sm text-ocean-700">
        <span>&copy; {new Date().getFullYear()} Poruch</span>
        <nav className="flex gap-4">
          <Link href="/privacy" className="hover:text-ocean-900 transition-colors">
            Конфіденційність
          </Link>
        </nav>
      </div>
    </footer>
  )
}
