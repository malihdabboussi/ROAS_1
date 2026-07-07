/**
 * Environment loader for the YC demo seeder.
 *
 * All env vars are required up front; missing values throw immediately so the
 * script never half-runs against the wrong target. Service role only — anon
 * is never used.
 *
 * When vars are not exported in the shell, loads apps/api/.env (+ agent-api)
 * before validating.
 */
import { applyEnvFallbacks, loadLocalDotEnvFiles } from './load-dotenv'

export interface SeederEnv {
  supabaseUrl: string
  supabaseServiceRoleKey: string
  apiBaseUrl: string
  internalApiToken: string
  openaiApiKey: string | null
}

let dotEnvLoaded = false

function ensureDotEnvLoaded(): void {
  if (dotEnvLoaded) return
  loadLocalDotEnvFiles()
  applyEnvFallbacks()
  dotEnvLoaded = true
}

function require_(name: string): string {
  const value = process.env[name]
  if (!value || value.length === 0) {
    throw new Error(`Missing required env var: ${name} (export it or add it to apps/api/.env)`)
  }
  return value
}

function optional(name: string): string | null {
  const value = process.env[name]
  if (!value || value.length === 0) return null
  return value
}

function resolveApiBaseUrl(): string {
  if (process.env.APPS_API_URL) return process.env.APPS_API_URL
  const explicit = process.env.API_BASE_URL
  // Local shells often inherit AGENT_API_URL (:3003) as API_BASE_URL — seeder hits apps/api.
  if (explicit && !explicit.includes(':3003')) return explicit
  const port = process.env.PORT ?? '3001'
  return `http://localhost:${port}`
}

export function loadEnv(): SeederEnv {
  ensureDotEnvLoaded()
  return {
    supabaseUrl: require_('SUPABASE_URL'),
    supabaseServiceRoleKey: require_('SUPABASE_SERVICE_ROLE_KEY'),
    apiBaseUrl: resolveApiBaseUrl(),
    internalApiToken: require_('INTERNAL_API_TOKEN'),
    openaiApiKey: optional('OPENAI_API_KEY'),
  }
}
