import { createMiddleware } from 'hono/factory'
import type { Role } from '@poruch/types'
import type { AppEnv } from '../lib/bindings.js'
import { DomainError } from '../lib/errors.js'

/** Require specific role(s) */
export function requireRole(...roles: Role[]) {
  return createMiddleware<AppEnv>(async (c, next) => {
    const userRole = c.get('role') as Role
    if (!roles.includes(userRole)) {
      throw DomainError.forbidden(`Role '${userRole}' is not allowed. Required: ${roles.join(', ')}`)
    }
    await next()
  })
}

/** Require admin role */
export const requireAdmin = requireRole('admin')

/** Require master (provider) role */
export const requireMaster = requireRole('master')
