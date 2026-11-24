import { z } from 'zod'

// === Pagination ===

export const PaginationParams = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

export type PaginationParams = z.infer<typeof PaginationParams>

// === UUID ===

export const UuidParam = z.object({
  id: z.string().uuid(),
})

// === Slug ===

export const SlugParam = z.object({
  slug: z
    .string()
    .min(2)
    .max(100)
    .regex(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/, 'Slug must be lowercase alphanumeric with hyphens'),
})

// === Phone (Ukrainian) ===

export const PhoneSchema = z
  .string()
  .regex(/^\+380\d{9}$/, 'Phone must be in format +380XXXXXXXXX')

// === Email ===

export const EmailSchema = z.string().email().max(255)

// === Idempotency Key ===

export const IdempotencyKeyHeader = z.object({
  'idempotency-key': z.string().uuid(),
})
