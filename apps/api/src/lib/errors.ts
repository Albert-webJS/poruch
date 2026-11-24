import type { ErrorCode } from '@poruch/types'

export class DomainError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly status: number = 400,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message)
    this.name = 'DomainError'
  }

  static notFound(message = 'Resource not found') {
    return new DomainError('NOT_FOUND', message, 404)
  }

  static forbidden(message = 'Access denied') {
    return new DomainError('FORBIDDEN', message, 403)
  }

  static conflict(message: string) {
    return new DomainError('CONFLICT', message, 409)
  }

  static validation(message: string, details?: Record<string, unknown>) {
    return new DomainError('VALIDATION_ERROR', message, 400, details)
  }

  static unauthorized(message = 'Authentication required') {
    return new DomainError('UNAUTHORIZED', message, 401)
  }

  static rateLimited(message = 'Too many requests') {
    return new DomainError('RATE_LIMITED', message, 429)
  }
}
