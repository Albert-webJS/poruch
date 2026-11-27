'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export function Footer() {
  const pathname = usePathname()

  if (pathname.startsWith('/pro')) return null

  return (
    <footer className="border-t border-ocean-100 bg-white py-8 mt-auto">
      <div className="mx-auto max-w-6xl px-4 flex items-center justify-between text-sm text-ocean-700">
        <span suppressHydrationWarning>&copy; {new Date().getFullYear()} Poruch</span>
        <nav className="flex gap-4">
          <Link href="/privacy" className="hover:text-ocean-900 transition-colors">
            Конфіденційність
          </Link>
        </nav>
      </div>
    </footer>
  )
}
