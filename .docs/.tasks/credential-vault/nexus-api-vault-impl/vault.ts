import { Hono } from 'hono'
import { supabase } from '../db.js'
import { decrypt } from '../lib/encrypt.js'

const vault = new Hono()

// GET /api/vault/capabilities — returns { service, scope } for credentials where agent is in allowed_agents
vault.get('/capabilities', async (c) => {
  const agent = c.get('agent') as { memberId: string | null }
  const memberId = agent.memberId
  if (!memberId) {
    return c.json({ capabilities: [] })
  }

  const { data, error } = await supabase
    .from('credential_vault')
    .select('service_key, scope')
    .eq('revoked', false)
    .contains('allowed_agents', [memberId])

  if (error) {
    console.error('[vault] capabilities error:', error)
    return c.json({ error: 'Failed to fetch capabilities' }, 500)
  }

  const capabilities = (data || []).map((r) => ({
    service: r.service_key,
    scope: r.scope || null,
  }))

  return c.json({ capabilities })
})

// POST /api/vault/execute — { service, scope?, action, params }
vault.post('/execute', async (c) => {
  const agent = c.get('agent') as { memberId: string | null }
  const memberId = agent.memberId
  if (!memberId) {
    return c.json({ success: false, error: 'Agent has no member ID' }, 403)
  }

  let body: { service: string; scope?: string; action: string; params?: Record<string, unknown> }
  try {
    body = await c.req.json()
  } catch {
    return c.json({ success: false, error: 'Invalid JSON body' }, 400)
  }

  const { service, scope, action, params = {} } = body
  if (!service || !action) {
    return c.json({ success: false, error: 'service and action required' }, 400)
  }

  let q = supabase
    .from('credential_vault')
    .select('id, encrypted_value')
    .eq('service_key', service)
    .eq('revoked', false)
    .contains('allowed_agents', [memberId])
  const scopeVal = scope == null || scope === '' ? 'default' : scope
  q = q.eq('scope', scopeVal)
  const { data: cred, error: fetchError } = await q.maybeSingle()

  if (fetchError || !cred) {
    return c.json({ success: false, error: 'Integration not available' }, 404)
  }

  let secret: string
  try {
    secret = decrypt(cred.encrypted_value)
  } catch (e) {
    console.error('[vault] decrypt error:', e)
    return c.json({ success: false, error: 'Decryption failed' }, 500)
  }

  // Dispatch to integration handlers
  const result = await executeIntegration(service, scope, action, params, secret)

  // Audit
  await supabase.from('credential_usage').insert({
    credential_id: cred.id,
    agent_id: memberId,
    action: `${service}:${action}`,
    params: sanitizeParams(params),
    response_status: result.status || 200,
  })

  if (result.error) {
    return c.json({ success: false, error: result.error }, result.status || 500)
  }
  return c.json({ success: true, data: result.data })
})

function sanitizeParams(p: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(p)) {
    if (
      typeof v === 'string' &&
      (v.includes('key') || v.includes('token') || v.includes('secret'))
    ) {
      out[k] = '[REDACTED]'
    } else {
      out[k] = v
    }
  }
  return out
}

async function executeIntegration(
  service: string,
  scope: string | undefined,
  action: string,
  params: Record<string, unknown>,
  secret: string,
): Promise<{ data?: unknown; error?: string; status?: number }> {
  const key = `${service}:${scope || 'default'}:${action}`

  switch (key) {
    case 'shopify:healing_waves:list_products':
    case 'shopify:default:list_products': {
      const store = scope === 'healing_waves' ? 'healing-waves' : 'healing-waves'
      const limit = (params.limit as number) || 50
      const res = await fetch(
        `https://${store}.myshopify.com/admin/api/2024-01/products.json?limit=${limit}`,
        { headers: { 'X-Shopify-Access-Token': secret } },
      )
      const data = await res.json()
      if (!res.ok) return { error: data.errors?.[0] || 'Shopify API error', status: res.status }
      return { data: data.products || [] }
    }

    case 'fathom:default:list_meetings': {
      const limit = (params.limit as number) || 10
      const res = await fetch(
        `https://api.fathom.ai/external/v1/meetings?limit=${limit}&include_transcript=true&include_summary=true&include_action_items=true`,
        { headers: { 'x-api-key': secret } },
      )
      const data = await res.json()
      if (!res.ok) return { error: data.message || 'Fathom API error', status: res.status }
      return { data: data.data || data }
    }

    case 'kit:default:list_subscribers': {
      const perPage = Math.min((params.per_page as number) || 50, 1000)
      const status = (params.status as string) || 'active'
      const res = await fetch(
        `https://api.kit.com/v4/subscribers?per_page=${perPage}&status=${status}`,
        { headers: { 'X-Kit-Api-Key': secret } },
      )
      const data = await res.json()
      if (!res.ok) return { error: data.errors?.[0] || 'Kit API error', status: res.status }
      return { data }
    }

    case 'kit:default:list_tags': {
      const res = await fetch('https://api.kit.com/v4/tags', {
        headers: { 'X-Kit-Api-Key': secret },
      })
      const data = await res.json()
      if (!res.ok) return { error: data.errors?.[0] || 'Kit API error', status: res.status }
      return { data }
    }

    case 'manychat:healing_waves:get_page_info':
    case 'manychat:default:get_page_info': {
      const res = await fetch('https://api.manychat.com/fb/page/getInfo', {
        headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' },
      })
      const data = await res.json()
      if (!res.ok) return { error: data.error_message || 'ManyChat API error', status: res.status }
      return { data }
    }

    case 'stripe:live:list_customers':
    case 'stripe:default:list_customers': {
      const limit = Math.min((params.limit as number) || 10, 100)
      const res = await fetch(`https://api.stripe.com/v1/customers?limit=${limit}`, {
        headers: { Authorization: `Bearer ${secret}` },
      })
      const data = await res.json()
      if (data.error) return { error: data.error.message || 'Stripe API error', status: 400 }
      return { data: data.data || [] }
    }

    case 'stripe:live:get_balance':
    case 'stripe:default:get_balance': {
      const res = await fetch('https://api.stripe.com/v1/balance', {
        headers: { Authorization: `Bearer ${secret}` },
      })
      const data = await res.json()
      if (data.error) return { error: data.error.message || 'Stripe API error', status: 400 }
      return { data }
    }

    case 'elevenlabs:default:text_to_speech': {
      const voiceId = (params.voice_id as string) || '6jzW7DgYgzGUd5l8Sp5D'
      const text = params.text as string
      if (!text) return { error: 'text required', status: 400 }
      const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
        method: 'POST',
        headers: {
          'xi-api-key': secret,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text, model_id: 'eleven_multilingual_v2' }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        return { error: err.detail?.message || 'ElevenLabs API error', status: res.status }
      }
      const buf = await res.arrayBuffer()
      return { data: { audio_base64: Buffer.from(buf).toString('base64') } }
    }

    case 'youtube:default:search': {
      const q = (params.q as string) || ''
      const maxResults = Math.min((params.max_results as number) || 10, 50)
      const res = await fetch(
        `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&q=${encodeURIComponent(q)}&maxResults=${maxResults}&key=${secret}`,
      )
      const data = await res.json()
      if (data.error) return { error: data.error.message || 'YouTube API error', status: 400 }
      return { data: data.items || [] }
    }

    case 'cloudflare:default:list_zones': {
      const res = await fetch('https://api.cloudflare.com/client/v4/zones', {
        headers: { Authorization: `Bearer ${secret}` },
      })
      const data = await res.json()
      if (!data.success)
        return { error: data.errors?.[0]?.message || 'Cloudflare API error', status: 400 }
      return { data: data.result || [] }
    }

    case 'vercel:default:list_projects': {
      const res = await fetch('https://api.vercel.com/v9/projects', {
        headers: { Authorization: `Bearer ${secret}` },
      })
      const data = await res.json()
      if (data.error) return { error: data.error.message || 'Vercel API error', status: 400 }
      return { data: data.projects || [] }
    }

    case 'vercel:default:list_deployments': {
      const projectId = params.project_id as string
      const url = projectId
        ? `https://api.vercel.com/v6/deployments?projectId=${projectId}`
        : 'https://api.vercel.com/v6/deployments'
      const res = await fetch(url, { headers: { Authorization: `Bearer ${secret}` } })
      const data = await res.json()
      if (data.error) return { error: data.error.message || 'Vercel API error', status: 400 }
      return { data: data.deployments || [] }
    }

    case 'github:default:list_repos': {
      const org = (params.org as string) || 'Sefy-Tofan'
      const res = await fetch(`https://api.github.com/orgs/${org}/repos`, {
        headers: {
          Authorization: `Bearer ${secret}`,
          Accept: 'application/vnd.github.v3+json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
      })
      const data = await res.json()
      if (!res.ok) return { error: data.message || 'GitHub API error', status: res.status }
      return { data: Array.isArray(data) ? data : [] }
    }

    case 'airtable:default:list_records': {
      const baseId = (params.base_id as string) || 'appa6HeuHRQE7cLAS'
      const table = (params.table as string) || 'Knowledge Base'
      const tableEnc = encodeURIComponent(table)
      const res = await fetch(
        `https://api.airtable.com/v0/${baseId}/${tableEnc}?pageSize=${Math.min((params.page_size as number) || 100, 100)}`,
        { headers: { Authorization: `Bearer ${secret}` } },
      )
      const data = await res.json()
      if (data.error) return { error: data.error.message || 'Airtable API error', status: 400 }
      return { data: data.records || [] }
    }

    case 'n8n:default:list_workflows': {
      const baseUrl = (params.base_url as string) || 'https://n8n-olympus-u37257.vm.elestio.app'
      const res = await fetch(`${baseUrl.replace(/\/$/, '')}/api/v1/workflows?limit=50`, {
        headers: { 'X-N8N-API-KEY': secret },
      })
      const data = await res.json()
      if (!res.ok) return { error: data.message || 'n8n API error', status: res.status }
      return { data: data.data || [] }
    }

    case 'quickbooks:default:list_customers': {
      const realmId = params.realm_id as string
      if (!realmId) return { error: 'realm_id required (QuickBooks company ID)', status: 400 }
      const limit = Math.min((params.limit as number) || 10, 100)
      const res = await fetch(
        `https://quickbooks.api.intuit.com/v3/company/${realmId}/query?query=select+*+from+Customer+MaxResults+${limit}`,
        { headers: { Authorization: `Bearer ${secret}` } },
      )
      const data = await res.json()
      if (data.Fault)
        return { error: data.Fault.Error?.[0]?.Message || 'QuickBooks API error', status: 400 }
      return { data: data.QueryResponse?.Customer || [] }
    }

    default:
      return { error: `Unknown action: ${service}:${action}`, status: 400 }
  }
}

export { vault }
