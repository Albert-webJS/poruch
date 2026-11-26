const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8787'

async function fetchApi<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}/api/v1${path}`, {
    next: { revalidate: 60 },
  })
  if (!res.ok) {
    throw new Error(`API error: ${res.status}`)
  }
  const json = await res.json()
  return json.data as T
}

export interface Category {
  id: string
  slug: string
  nameUk: string
  iconName: string | null
  sortOrder: number
}

export interface City {
  id: string
  slug: string
  nameUk: string
}

export interface ProviderCard {
  id: string
  slug: string
  name: string
  photoUrl: string | null
  categoryName: string
  cityName: string
  rating: number | null
  reviewCount: number
  priceFrom: number | null
}

export interface ProviderProfile {
  id: string
  slug: string
  name: string
  description: string | null
  categoryName: string
  cityName: string
  photoUrl: string | null
  services: {
    id: string
    name: string
    description: string | null
    priceType: string
    priceAmount: number | null
    durationMinutes: number | null
  }[]
  districts: string[]
  photos: { id: string; url: string }[]
  reviews: {
    rating: number
    comment: string | null
    clientName: string
    createdAt: string
    providerReply: string | null
  }[]
  phone: string | null
  acceptingBookings: boolean
}

export const api = {
  getCategories: () => fetchApi<Category[]>('/public/categories'),
  getCities: () => fetchApi<City[]>('/public/cities'),
  getProviders: (params?: { category?: string; city?: string }) => {
    const search = new URLSearchParams()
    if (params?.category) search.set('category', params.category)
    if (params?.city) search.set('city', params.city)
    const qs = search.toString()
    return fetchApi<ProviderCard[]>(`/public/providers${qs ? `?${qs}` : ''}`)
  },
  getProvider: (slug: string) => fetchApi<ProviderProfile>(`/public/providers/${slug}`),
}
