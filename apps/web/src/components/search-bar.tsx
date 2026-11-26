'use client'

import { useRouter } from 'next/navigation'
import { useState, useRef } from 'react'

interface Category {
  slug: string
  nameUk: string
}

export function SearchBar({ categories }: { categories: Category[] }) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const filtered = categories.filter((c) =>
    c.nameUk.toLowerCase().includes(query.toLowerCase()),
  )

  return (
    <div className="relative max-w-lg">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setShowSuggestions(true)
          }}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          placeholder="Яку послугу шукаєте?"
          className="w-full bg-white border border-ocean-100 rounded-xl px-4 py-3 pl-11 text-ocean-900 placeholder:text-ocean-700 focus:outline-none focus:ring-2 focus:ring-ocean-500/20 focus:border-ocean-300 transition-all"
        />
        <svg
          className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-ocean-500/60"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </div>

      {showSuggestions && query.length > 0 && filtered.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl border border-ocean-100 shadow-lg overflow-hidden z-10">
          {filtered.map((cat) => (
            <button
              key={cat.slug}
              onMouseDown={() => {
                router.push(`/services/${cat.slug}`)
                setShowSuggestions(false)
                setQuery('')
              }}
              className="w-full text-left px-4 py-3 hover:bg-ocean-100/50 text-ocean-900 text-sm transition-colors"
            >
              {cat.nameUk}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
