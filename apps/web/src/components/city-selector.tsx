'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { Suspense, useState, useRef, useEffect, useCallback } from 'react'

interface City {
  slug: string
  nameUk: string
}

function CitySelectorInner({ cities }: { cities: City[] }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const current = searchParams.get('city')
  const selected = cities.find((c) => c.slug === current)
  const label = selected?.nameUk ?? 'Усі міста'

  const handleSelect = useCallback(
    (slug: string | null) => {
      const params = new URLSearchParams(searchParams.toString())
      if (slug) {
        params.set('city', slug)
      } else {
        params.delete('city')
      }
      const qs = params.toString()
      router.push(`${pathname}${qs ? `?${qs}` : ''}`)
      setOpen(false)
    },
    [router, pathname, searchParams],
  )

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  const options = [{ slug: null, nameUk: 'Усі міста' }, ...cities.map((c) => ({ slug: c.slug as string | null, nameUk: c.nameUk }))]
  const [focusIndex, setFocusIndex] = useState(-1)

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!open) {
        if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
          e.preventDefault()
          setOpen(true)
          setFocusIndex(0)
        }
        return
      }
      switch (e.key) {
        case 'Escape':
          setOpen(false)
          setFocusIndex(-1)
          break
        case 'ArrowDown':
          e.preventDefault()
          setFocusIndex((i) => Math.min(i + 1, options.length - 1))
          break
        case 'ArrowUp':
          e.preventDefault()
          setFocusIndex((i) => Math.max(i - 1, 0))
          break
        case 'Enter':
        case ' ':
          e.preventDefault()
          if (focusIndex >= 0) handleSelect(options[focusIndex]!.slug)
          break
      }
    },
    [open, focusIndex, options, handleSelect],
  )

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        onKeyDown={handleKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex items-center gap-1.5 text-sm border border-ocean-100 rounded-lg px-3 py-2 text-ocean-900 hover:border-ocean-300 transition-colors bg-white"
      >
        <svg className="w-4 h-4 text-ocean-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        {label}
        <svg className={`w-3.5 h-3.5 text-ocean-500 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div role="listbox" className="absolute top-full right-0 mt-1 bg-white rounded-xl border border-ocean-100 shadow-lg overflow-hidden z-50 min-w-[160px]">
          {options.map((opt, i) => (
            <button
              key={opt.slug ?? 'all'}
              role="option"
              aria-selected={opt.slug === current || (!opt.slug && !current)}
              onClick={() => handleSelect(opt.slug)}
              className={`w-full text-left px-4 py-2.5 text-sm hover:bg-ocean-100/50 transition-colors ${
                (opt.slug === current || (!opt.slug && !current)) ? 'text-primary font-medium' : 'text-ocean-900'
              } ${i === focusIndex ? 'bg-ocean-100/50' : ''}`}
            >
              {opt.nameUk}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export function CitySelector({ cities }: { cities: City[] }) {
  return (
    <Suspense fallback={<div className="w-24 h-9 rounded-lg border border-ocean-100 bg-white" />}>
      <CitySelectorInner cities={cities} />
    </Suspense>
  )
}
