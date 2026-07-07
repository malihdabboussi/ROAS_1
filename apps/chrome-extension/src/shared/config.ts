/** Built-in defaults for local dev; override via .env (VITE_*) at build time. */
export function getAppOrigin(): string {
  return import.meta.env.VITE_VIBEY_APP_ORIGIN ?? 'http://localhost:3000'
}

export function getWebOrigin(): string {
  return import.meta.env.VITE_VIBEY_WEB_ORIGIN ?? getAppOrigin()
}

export function getApiOrigin(): string {
  return import.meta.env.VITE_VIBEY_API_ORIGIN ?? 'http://localhost:3001'
}

/** @deprecated Chat now routes through the web proxy so it can reuse pinned machine routing. */
export function getAgentApiOrigin(): string {
  return import.meta.env.VITE_VIBEY_AGENT_API_ORIGIN ?? 'http://localhost:3003'
}

export function getSupabaseUrl(): string {
  return import.meta.env.VITE_SUPABASE_URL ?? ''
}

export function getSupabaseAnonKey(): string {
  return import.meta.env.VITE_SUPABASE_ANON_KEY ?? ''
}

export function supabaseCookiePrefix(): string {
  const url = getSupabaseUrl()
  if (!url) return 'sb-localhost'
  try {
    const host = new URL(url).hostname
    const ref = host.split('.')[0] || 'project'
    return `sb-${ref}`
  } catch {
    return 'sb-project'
  }
}
