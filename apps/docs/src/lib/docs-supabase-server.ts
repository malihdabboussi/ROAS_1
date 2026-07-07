import { createClient } from '@supabase/supabase-js'

export function createDocsSupabaseAnon() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL
  const anon = process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anon) {
    throw new Error('Missing SUPABASE_URL / SUPABASE_ANON_KEY for docs RAG')
  }
  return createClient(url, anon)
}
