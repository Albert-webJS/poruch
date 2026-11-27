import type { Metadata } from 'next'
import { ClerkProvider } from '@clerk/nextjs'
import { ukUA } from '@clerk/localizations'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { api } from '@/lib/api'
import './globals.css'
import { Manrope } from 'next/font/google'
import { cn } from '@/lib/utils'

const manrope = Manrope({ subsets: ['latin', 'cyrillic'], variable: '--font-sans' })

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

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  let cities: { slug: string; nameUk: string }[] = []
  try {
    cities = await api.getCities()
  } catch {}

  return (
    <ClerkProvider localization={ukUA}>
      <html lang="uk" className={cn('font-sans', manrope.variable)}>
        <body className="min-h-screen flex flex-col bg-surface">
          <Header cities={cities} />
          <main className="flex-1">{children}</main>
          <Footer />
        </body>
      </html>
    </ClerkProvider>
  )
}
