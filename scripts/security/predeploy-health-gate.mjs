#!/usr/bin/env node
import dns from 'dns/promises'
import { URL } from 'url'

function required(name) {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required env var: ${name}`)
  }
  return value
}

async function checkDns(supabaseUrl) {
  const host = new URL(supabaseUrl).hostname
  await dns.lookup(host)
  console.log(`[health-gate] dns_ok host=${host}`)
}

async function checkAuthEndpoint(supabaseUrl, anonKey) {
  const baseUrl = supabaseUrl.replace(/\/$/, '')
  const response = await fetch(`${baseUrl}/auth/v1/settings`, {
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
    },
  })
  if (!response.ok) {
    throw new Error(`Auth endpoint failed: HTTP ${response.status}`)
  }
  console.log('[health-gate] auth_ok')

  const jwksResponse = await fetch(`${baseUrl}/auth/v1/.well-known/jwks.json`)
  if (!jwksResponse.ok) {
    throw new Error(`JWKS endpoint failed: HTTP ${jwksResponse.status}`)
  }
  console.log('[health-gate] jwks_ok')
}

async function postgrestRequest(supabaseUrl, serviceRoleKey, path, init = {}) {
  const response = await fetch(`${supabaseUrl.replace(/\/$/, '')}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
      ...(init.headers || {}),
    },
  })

  const text = await response.text()
  let body = null
  if (text) {
    try {
      body = JSON.parse(text)
    } catch {
      body = text
    }
  }

  if (!response.ok) {
    throw new Error(`PostgREST ${path} failed: HTTP ${response.status} body=${JSON.stringify(body)}`)
  }

  return body
}

async function checkDbRoundtrip(supabaseUrl, serviceRoleKey) {
  const missionRows = await postgrestRequest(
    supabaseUrl,
    serviceRoleKey,
    'missions?select=id&limit=1',
    { method: 'GET', headers: { Prefer: 'count=exact' } },
  )
  const rows = Array.isArray(missionRows) ? missionRows.length : 0
  console.log(`[health-gate] db_ok rows=${rows}`)
}

async function checkOutboxInsertSelect(supabaseUrl, serviceRoleKey) {
  const missionRows = await postgrestRequest(
    supabaseUrl,
    serviceRoleKey,
    'missions?select=id,user_id&order=created_at.desc&limit=1',
    { method: 'GET' },
  )
  const mission = Array.isArray(missionRows) ? missionRows[0] : null
  if (!mission?.id || !mission?.user_id) {
    throw new Error('Cannot find mission for outbox sanity check')
  }

  const dedupeKey = `healthcheck:${Date.now()}`
  const payload = { probe: true, created_at: new Date().toISOString() }
  await postgrestRequest(supabaseUrl, serviceRoleKey, 'mission_outbox', {
    method: 'POST',
    body: JSON.stringify([
      {
        mission_id: mission.id,
        user_id: mission.user_id,
        event_type: 'healthcheck.predeploy',
        dedupe_key: dedupeKey,
        payload,
        status: 'pending',
      },
    ]),
  })

  const selected = await postgrestRequest(
    supabaseUrl,
    serviceRoleKey,
    `mission_outbox?select=id,dedupe_key&dedupe_key=eq.${encodeURIComponent(dedupeKey)}&limit=1`,
    { method: 'GET' },
  )
  const selectedRow = Array.isArray(selected) ? selected[0] : null
  if (!selectedRow?.id) throw new Error('Outbox select failed: row not found')

  await postgrestRequest(
    supabaseUrl,
    serviceRoleKey,
    `mission_outbox?dedupe_key=eq.${encodeURIComponent(dedupeKey)}`,
    { method: 'DELETE' },
  )

  console.log('[health-gate] outbox_ok')
}

async function main() {
  const supabaseUrl = required('SUPABASE_URL')
  const anonKey = required('SUPABASE_ANON_KEY')
  const serviceRoleKey = required('SUPABASE_SERVICE_ROLE_KEY')

  await checkDns(supabaseUrl)
  await checkAuthEndpoint(supabaseUrl, anonKey)
  await checkDbRoundtrip(supabaseUrl, serviceRoleKey)
  await checkOutboxInsertSelect(supabaseUrl, serviceRoleKey)

  console.log('[health-gate] all_checks_passed')
}

main().catch((error) => {
  console.error(`[health-gate] failed: ${error instanceof Error ? error.message : String(error)}`)
  process.exit(1)
})
