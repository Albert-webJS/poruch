import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import type { AppEnv } from './lib/bindings.js'
import { errorHandler } from './middleware/error-handler.js'
import providers from './routes/providers.js'
import bookings from './routes/bookings.js'
import schedule from './routes/schedule.js'
import publicRoutes from './routes/public.js'
import webhooks from './routes/webhooks.js'

const app = new Hono<AppEnv>()

// === Global middleware ===

app.use('*', logger())
app.use(
  '*',
  cors({
    origin: ['https://poruch.app', 'http://localhost:3000'],
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key'],
    maxAge: 86400,
  }),
)

// === Error handler ===

app.onError(errorHandler)

// === Routes ===

// Public API (no auth)
app.route('/api/v1/public', publicRoutes)

// Webhooks (verified by signature, not auth)
app.route('/api/v1/webhooks', webhooks)

// Provider API (auth required)
app.route('/api/v1/providers', providers)
app.route('/api/v1/schedule', schedule)

// Bookings (mixed: create is public, list is auth)
app.route('/api/v1/bookings', bookings)

// === Health check ===

app.get('/health', async (c) => {
  return c.json({ status: 'ok', version: c.env.API_VERSION, timestamp: new Date().toISOString() })
})

// === 404 fallback ===

app.notFound((c) => {
  return c.json({ error: { code: 'NOT_FOUND', message: 'Route not found' } }, 404)
})

export default app
