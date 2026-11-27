const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8787'

type Token = string | null

function authHeaders(token: Token): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`
  return headers
}

async function authFetch<T>(path: string, token: Token, opts?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}/api/v1${path}`, {
    ...opts,
    headers: { ...authHeaders(token), ...opts?.headers },
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error?.message ?? `API error: ${res.status}`)
  return json.data as T
}

async function authFetchPaginated<T>(path: string, token: Token): Promise<{ data: T[]; cursor: string | null }> {
  const res = await fetch(`${API_URL}/api/v1${path}`, {
    headers: authHeaders(token),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error?.message ?? `API error: ${res.status}`)
  return { data: json.data as T[], cursor: json.meta?.cursor ?? null }
}

export interface ProviderBooking {
  id: string
  status: string
  preferredDate: string
  preferredTime: string
  confirmedDate: string | null
  confirmedTime: string | null
  proposedDate: string | null
  proposedTime: string | null
  proposedMessage: string | null
  address: string | null
  details: string | null
  expiresAt: string | null
  createdAt: string
  service: {
    id: string
    name: string
    priceType: string
    priceAmount: number | null
    durationMinutes: number | null
  }
  clientContact: {
    name: string | null
    phone: string
    email: string | null
  }
}

export interface ProviderFullProfile {
  id: string
  slug: string
  name: string
  description: string | null
  phone: string | null
  status: string
  photoUrl: string | null
  responseTimeHours: number | null
  category: { id: string; slug: string; nameUk: string } | null
  city: { id: string; slug: string; nameUk: string } | null
  services: ProviderServiceItem[]
  serviceAreas: { district: { id: string; nameUk: string } }[]
}

export interface ProviderServiceItem {
  id: string
  name: string
  description: string | null
  priceType: string
  priceAmount: number | null
  durationMinutes: number | null
  isActive: boolean
  sortOrder: number
}

export interface WorkingHour {
  id: string
  dayOfWeek: number
  startTime: string
  endTime: string
  isActive: boolean
}

export interface AvailabilityException {
  id: string
  date: string
  exceptionType: string
  isAvailable: boolean
  startTime: string | null
  endTime: string | null
  reason: string | null
}

export const providerApi = {
  getProfile: (token: Token) =>
    authFetch<ProviderFullProfile>('/providers/me', token),

  updateProfile: (token: Token, data: Record<string, unknown>) =>
    authFetch<ProviderFullProfile>('/providers/me', token, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  updateSlug: (token: Token, slug: string) =>
    authFetch<ProviderFullProfile>('/providers/me/slug', token, {
      method: 'PATCH',
      body: JSON.stringify({ slug }),
    }),

  publish: (token: Token) =>
    authFetch<ProviderFullProfile>('/providers/me/publish', token, { method: 'POST' }),

  getBookings: (token: Token, params?: { status?: string; limit?: number }) => {
    const search = new URLSearchParams()
    if (params?.status) search.set('status', params.status)
    if (params?.limit) search.set('limit', String(params.limit))
    const qs = search.toString()
    return authFetchPaginated<ProviderBooking>(`/bookings${qs ? `?${qs}` : ''}`, token)
  },

  confirmBooking: (token: Token, id: string, data?: { confirmedDate?: string; confirmedTime?: string }) =>
    authFetch<ProviderBooking>(`/bookings/${id}/confirm`, token, {
      method: 'POST',
      body: JSON.stringify(data ?? {}),
    }),

  declineBooking: (token: Token, id: string, reason?: string) =>
    authFetch<ProviderBooking>(`/bookings/${id}/decline`, token, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),

  proposeBooking: (token: Token, id: string, data: { proposedDate: string; proposedTime: string; message?: string }) =>
    authFetch<ProviderBooking>(`/bookings/${id}/propose`, token, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  completeBooking: (token: Token, id: string) =>
    authFetch<ProviderBooking>(`/bookings/${id}/complete`, token, {
      method: 'POST',
      body: '{}',
    }),

  getServices: (token: Token) =>
    authFetch<ProviderServiceItem[]>('/providers/me/services', token),

  createService: (token: Token, data: Record<string, unknown>) =>
    authFetch<ProviderServiceItem>('/providers/me/services', token, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateService: (token: Token, id: string, data: Record<string, unknown>) =>
    authFetch<ProviderServiceItem>(`/providers/me/services/${id}`, token, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  deleteService: (token: Token, id: string) =>
    authFetch<{ deleted: boolean }>(`/providers/me/services/${id}`, token, {
      method: 'DELETE',
    }),

  getHours: (token: Token) =>
    authFetch<WorkingHour[]>('/schedule/hours', token),

  updateHours: (token: Token, schedule: { dayOfWeek: number; startTime: string; endTime: string; isActive?: boolean }[]) =>
    authFetch<WorkingHour[]>('/schedule/hours', token, {
      method: 'PUT',
      body: JSON.stringify({ schedule }),
    }),

  getExceptions: (token: Token) =>
    authFetch<AvailabilityException[]>('/schedule/exceptions', token),

  createException: (token: Token, data: { date: string; isAvailable: boolean; startTime?: string; endTime?: string; reason?: string }) =>
    authFetch<AvailabilityException>('/schedule/exceptions', token, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  deleteException: (token: Token, id: string) =>
    authFetch<{ deleted: boolean }>(`/schedule/exceptions/${id}`, token, {
      method: 'DELETE',
    }),
}
