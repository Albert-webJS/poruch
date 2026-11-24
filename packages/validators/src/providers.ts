import { z } from 'zod'

// === Create / Update Provider Profile ===

export const CreateProviderProfile = z.object({
  name: z.string().min(2).max(100),
  categoryId: z.string().uuid(),
  cityId: z.string().uuid(),
  description: z.string().max(2000).optional(),
  phone: z.string().regex(/^\+380\d{9}$/).optional(),
})

export type CreateProviderProfile = z.infer<typeof CreateProviderProfile>

export const UpdateProviderProfile = z.object({
  name: z.string().min(2).max(100).optional(),
  categoryId: z.string().uuid().optional(),
  cityId: z.string().uuid().optional(),
  description: z.string().max(2000).optional(),
  phone: z.string().regex(/^\+380\d{9}$/).optional(),
  districts: z.array(z.string().uuid()).optional(),
})

export type UpdateProviderProfile = z.infer<typeof UpdateProviderProfile>

// === Provider Response ===

export const ProviderResponse = z.object({
  id: z.string().uuid(),
  slug: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  categoryId: z.string().uuid(),
  categoryName: z.string(),
  cityId: z.string().uuid(),
  cityName: z.string(),
  isPublished: z.boolean(),
  photoUrl: z.string().url().nullable(),
  createdAt: z.string().datetime(),
})

export type ProviderResponse = z.infer<typeof ProviderResponse>

// === Public Provider (for /p/[slug]) ===

export const PublicProviderResponse = z.object({
  id: z.string().uuid(),
  slug: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  categoryName: z.string(),
  cityName: z.string(),
  photoUrl: z.string().url().nullable(),
  services: z.array(
    z.object({
      id: z.string().uuid(),
      name: z.string(),
      description: z.string().nullable(),
      priceType: z.enum(['fixed', 'from', 'on_request']),
      priceAmount: z.number().nullable(),
      durationMinutes: z.number().nullable(),
    }),
  ),
  districts: z.array(z.string()),
  acceptingBookings: z.boolean(),
})

export type PublicProviderResponse = z.infer<typeof PublicProviderResponse>
