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

app.use('*', logger())
app.use(
  '*',
  cors({
    origin: (origin) => {
      const allowed = ['https://poruch.app', 'http://localhost:3000']
      if (origin.match(/^http:\/\/(localhost|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+)(:\d+)?$/)) {
        return origin
      }
      return allowed.includes(origin) ? origin : ''
    },
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key'],
    maxAge: 86400,
  }),
)

app.onError(errorHandler)

app.route('/api/v1/public', publicRoutes)
app.route('/api/v1/webhooks', webhooks)
app.route('/api/v1/providers', providers)
app.route('/api/v1/schedule', schedule)
app.route('/api/v1/bookings', bookings)

app.get('/health', async (c) => {
  return c.json({ status: 'ok', version: c.env.API_VERSION, timestamp: new Date().toISOString() })
})

app.notFound((c) => {
  return c.json({ error: { code: 'NOT_FOUND', message: 'Route not found' } }, 404)
})

export default app
