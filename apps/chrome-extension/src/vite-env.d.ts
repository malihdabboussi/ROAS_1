/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_VIBEY_APP_ORIGIN: string
  readonly VITE_VIBEY_WEB_ORIGIN: string
  readonly VITE_VIBEY_API_ORIGIN: string
  readonly VITE_VIBEY_AGENT_API_ORIGIN: string
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
