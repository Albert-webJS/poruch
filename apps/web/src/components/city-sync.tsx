'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useEffect } from 'react'

/** Silently sets ?city= in the URL so the header city selector shows the right city */
export function CitySync({ citySlug }: { citySlug: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (searchParams.get('city') === citySlug) return
    const params = new URLSearchParams(searchParams.toString())
    params.set('city', citySlug)
    router.replace(`${pathname}?${params}`, { scroll: false })
  }, [citySlug, pathname, router, searchParams])

  return null
}
