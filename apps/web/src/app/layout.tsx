import type { Metadata } from 'next'
import { ClerkProvider } from '@clerk/nextjs'
import { ukUA } from '@clerk/localizations'
import './globals.css'

export const metadata: Metadata = {
  title: {
    default: 'Poruch — Знайди майстра поруч',
    template: '%s | Poruch',
  },
  description: 'Маркетплейс локальних послуг. Електрики, сантехніки та інші майстри у вашому місті.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider localization={ukUA}>
      <html lang="uk">
        <body className="min-h-screen flex flex-col">
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
        </body>
      </html>
    </ClerkProvider>
  )
}

function Header() {
  return (
    <header className="border-b border-ocean-100 bg-white">
      <div className="mx-auto max-w-6xl flex items-center justify-between px-4 h-16">
        <a href="/" className="text-xl font-extrabold text-ocean-900 tracking-tight">
          Poruch
        </a>
        <nav className="flex items-center gap-6 text-sm">
          <a href="/services" className="text-ocean-700 hover:text-ocean-900 transition-colors">
            Послуги
          </a>
          <a
            href="/pro/dashboard"
            className="bg-primary text-white px-4 py-2 rounded-lg font-medium hover:bg-primary-hover transition-colors"
          >
            Я майстер
          </a>
        </nav>
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
          <a href="/privacy" className="hover:text-ocean-900 transition-colors">
            Конфіденційність
          </a>
        </nav>
      </div>
    </footer>
  )
}
