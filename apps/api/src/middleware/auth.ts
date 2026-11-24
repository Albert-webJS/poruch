import { createMiddleware } from 'hono/factory'
import { verifyToken } from '@clerk/backend'
import type { AppEnv } from '../lib/bindings.js'
import { DomainError } from '../lib/errors.js'

/** Require authenticated user via Clerk JWT */
export const requireAuth = createMiddleware<AppEnv>(async (c, next) => {
  const authHeader = c.req.header('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    throw DomainError.unauthorized('Missing or invalid Authorization header')
  }

  const token = authHeader.slice(7)

  try {
    const payload = await verifyToken(token, {
      secretKey: c.env.CLERK_SECRET_KEY,
    })
    c.set('userId', payload.sub)
    c.set('role', (payload.public_metadata as any)?.role ?? 'client')
  } catch {
    throw DomainError.unauthorized('Invalid or expired token')
  }

  await next()
})

/** Optionally authenticate — set userId if token present, continue if not */
export const optionalAuth = createMiddleware<AppEnv>(async (c, next) => {
  const authHeader = c.req.header('Authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7)
    try {
      const payload = await verifyToken(token, {
        secretKey: c.env.CLERK_SECRET_KEY,
      })
      c.set('userId', payload.sub)
      c.set('role', (payload.public_metadata as any)?.role ?? 'client')
    } catch {
      // Invalid token — treat as unauthenticated
    }
  }
  await next()
})
