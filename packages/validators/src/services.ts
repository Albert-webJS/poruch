import { z } from 'zod'
import { PRICE_TYPES } from '@poruch/types'

export const CreateProviderService = z.object({
  name: z.string().min(2).max(200),
  description: z.string().max(1000).optional(),
  priceType: z.enum(PRICE_TYPES),
  priceAmount: z.number().int().min(100).max(100_000_000).nullable(),
  durationMinutes: z.number().int().min(15).max(480).nullable(),
})

export type CreateProviderService = z.infer<typeof CreateProviderService>

export const UpdateProviderService = CreateProviderService.partial()

export type UpdateProviderService = z.infer<typeof UpdateProviderService>

export function validatePriceConsistency(priceType: string, priceAmount: number | null): boolean {
  if (priceType === 'on_request') return priceAmount === null
  return priceAmount !== null && priceAmount >= 100
}
