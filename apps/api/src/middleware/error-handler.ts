import type { ErrorHandler } from 'hono'
import { ZodError } from 'zod'
import type { AppEnv } from '../lib/bindings.js'
import { DomainError } from '../lib/errors.js'

export const errorHandler: ErrorHandler<AppEnv> = (err, c) => {
  if (err instanceof ZodError) {
    return c.json(
      {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request data',
          details: { issues: err.issues },
        },
      },
      400,
    )
  }

  if (err instanceof DomainError) {
    return c.json(
      {
        error: {
          code: err.code,
          message: err.message,
          ...(err.details && { details: err.details }),
        },
      },
      err.status as any,
    )
  }

  console.error('Unhandled error:', err)
  const isDev = c.env.ENVIRONMENT === 'development'
  return c.json(
    {
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
        ...(isDev && { debug: err instanceof Error ? err.message : String(err) }),
      },
    },
    500,
  )
}
