const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8787'

async function fetchApi<T>(path: string, opts?: { revalidate?: number | false }): Promise<T> {
  const fetchOpts: RequestInit & { next?: { revalidate: number } } = {}
  if (typeof opts?.revalidate === 'number') {
    fetchOpts.next = { revalidate: opts.revalidate }
  } else if (opts?.revalidate === false) {
    fetchOpts.cache = 'no-store'
  }
  const res = await fetch(`${API_URL}/api/v1${path}`, fetchOpts)
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

export interface Slot {
  date: string
  startTime: string
  endTime: string
}

export interface BookingStatus {
  id: string
  status: string
  providerName: string
  providerSlug: string
  providerPhoto: string | null
  serviceName: string
  preferredDate: string
  preferredTime: string
  confirmedDate: string | null
  confirmedTime: string | null
  proposedDate: string | null
  proposedTime: string | null
  proposedMessage: string | null
  createdAt: string
}

export interface CreateBookingPayload {
  providerId: string
  serviceId: string
  preferredDate: string
  preferredTime: string
  clientName: string
  clientPhone: string
  clientEmail?: string
  address?: string
  details?: string
  turnstileToken: string
}

async function postApi<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_URL}/api/v1${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    cache: 'no-store',
  })
  const json = await res.json()
  if (!res.ok) {
    throw new Error(json.error?.message ?? `API error: ${res.status}`)
  }
  return json.data as T
}

export const api = {
  getCategories: () => fetchApi<Category[]>('/public/categories', { revalidate: 300 }),
  getCities: () => fetchApi<City[]>('/public/cities', { revalidate: 300 }),
  getProviders: (params?: { category?: string; city?: string }) => {
    const search = new URLSearchParams()
    if (params?.category) search.set('category', params.category)
    if (params?.city) search.set('city', params.city)
    const qs = search.toString()
    return fetchApi<ProviderCard[]>(`/public/providers${qs ? `?${qs}` : ''}`, { revalidate: 60 })
  },
  getProvider: (slug: string) => fetchApi<ProviderProfile>(`/public/providers/${slug}`, { revalidate: 60 }),
  getSlots: (slug: string, params: { serviceId: string; fromDate: string; toDate?: string }) => {
    const search = new URLSearchParams({ serviceId: params.serviceId, fromDate: params.fromDate })
    if (params.toDate) search.set('toDate', params.toDate)
    return fetchApi<Slot[]>(`/schedule/slots/${slug}?${search}`, { revalidate: false })
  },
  createBooking: (payload: CreateBookingPayload) =>
    postApi<{ id: string; accessToken: string }>('/bookings', payload),
  getBookingStatus: (token: string) => fetchApi<BookingStatus>(`/bookings/status/${token}`, { revalidate: false }),
}
