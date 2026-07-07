import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import {
  normalizeRequestTraceEvent,
  type RequestTraceEventInput,
} from '@vibey/api-shared/observability'

let client: SupabaseClient | null | undefined
let warned = false

export function getObservabilityServiceClient(): SupabaseClient | null {
  if (client !== undefined) return client
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  client = url && key ? createClient(url, key, { auth: { persistSession: false } }) : null
  return client
}

export function reportProxyRouteEvent(input: RequestTraceEventInput): void {
  const supabase = getObservabilityServiceClient()
  if (!supabase) {
    if (!warned) {
      warned = true
      console.warn('[PROXY] request_trace_events disabled: missing Supabase service role env')
    }
    return
  }

  const row = normalizeRequestTraceEvent(input)

  void Promise.resolve(supabase.from('request_trace_events').insert(row))
    .then(({ error }) => {
      if (error && !warned) {
        warned = true
        console.warn(`[PROXY] Failed to persist request_trace_event: ${error.message}`)
      }
    })
    .catch((err: unknown) => {
      if (warned) return
      warned = true
      console.warn(
        `[PROXY] request_trace_events insert threw: ${err instanceof Error ? err.message : String(err)}`,
      )
    })
}
