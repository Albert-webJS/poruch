import type { Context } from 'hono'

export function success(c: Context, data: unknown, status: 200 | 201 = 200) {
  return c.json({ data }, status)
}

export function paginated(c: Context, data: unknown[], cursor: string | null, total?: number) {
  return c.json({ data, meta: { cursor, total } })
}

export function apiError(c: Context, code: string, message: string, status: number, details?: Record<string, unknown>) {
  return c.json({ error: { code, message, ...(details && { details }) } }, status as any)
}
