import { z } from 'zod'

export const PaginationParams = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

export type PaginationParams = z.infer<typeof PaginationParams>

export const UuidParam = z.object({
  id: z.string().uuid(),
})

export const SlugParam = z.object({
  slug: z
    .string()
    .min(2)
    .max(100)
    .regex(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/, 'Slug must be lowercase alphanumeric with hyphens'),
})

export const PhoneSchema = z
  .string()
  .regex(/^\+380\d{9}$/, 'Phone must be in format +380XXXXXXXXX')

export const EmailSchema = z.string().email().max(255)

export const IdempotencyKeyHeader = z.object({
  'idempotency-key': z.string().uuid(),
})
