#!/usr/bin/env tsx
/**
 * Sync auth user_metadata.full_name + avatar_url from profiles for YC demo humans.
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const DEMO_EMAILS = ['yc-demo@vibey.im', 'nico@foundrycreative.io', 'jules@foundrycreative.io']

function loadDotEnv(): void {
  const envPath = resolve(process.cwd(), 'apps/api/.env')
  const raw = readFileSync(envPath, 'utf8')
  for (const line of raw.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq < 0) continue
    const key = trimmed.slice(0, eq).trim()
    let val = trimmed.slice(eq + 1).trim()
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1)
    }
    if (!process.env[key]) process.env[key] = val
  }
}

async function main(): Promise<void> {
  loadDotEnv()
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')

  const supabase = createClient(url, key, { auth: { persistSession: false } })

  for (const email of DEMO_EMAILS) {
    const { data: profile, error: profErr } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url')
      .eq('email', email)
      .maybeSingle()
    if (profErr || !profile?.id) {
      throw new Error(`Profile not found for ${email}: ${profErr?.message ?? 'missing'}`)
    }

    const { data: authUser, error: authErr } = await supabase.auth.admin.getUserById(profile.id)
    if (authErr || !authUser?.user) {
      throw new Error(`Auth user not found for ${email}: ${authErr?.message ?? 'missing'}`)
    }

    const { error: updateErr } = await supabase.auth.admin.updateUserById(profile.id, {
      user_metadata: {
        ...(authUser.user.user_metadata ?? {}),
        display_name: profile.full_name ?? authUser.user.user_metadata?.display_name,
        full_name: profile.full_name,
        avatar_url: profile.avatar_url,
      },
    })
    if (updateErr) throw new Error(`updateUserById(${email}): ${updateErr.message}`)

    console.log(`Synced ${email} → ${profile.full_name}`)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
