export type Bindings = {
  HYPERDRIVE: Hyperdrive
  KV: KVNamespace
  R2: R2Bucket
  NOTIFICATIONS_QUEUE: Queue
  CLERK_SECRET_KEY: string
  CLERK_PUBLISHABLE_KEY: string
  TURNSTILE_SECRET_KEY: string
  ENVIRONMENT: string
  API_VERSION: string
}

export type AppVariables = {
  userId: string
  role: string
  providerId?: string
}

export type AppEnv = {
  Bindings: Bindings
  Variables: AppVariables
}
