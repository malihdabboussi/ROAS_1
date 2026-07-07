import { randomUUID } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { reportWebServerError } from '@/lib/observability/server-error-reporter.server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

const DEFAULT_REPAIR_MODEL = 'anthropic/claude-opus-4.6'

function backendUrl() {
  return (
    process.env.MAIN_API_URL ||
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    process.env.BACKEND_URL ||
    ''
  ).replace(/\/$/, '')
}

async function recordProviderAttempt(input: Record<string, unknown>) {
  const url = backendUrl()
  const internalToken = process.env.INTERNAL_API_TOKEN || ''
  if (!url || !internalToken) throw new Error('provider billing internal API is not configured')
  const response = await fetch(`${url}/api/internal/provider-billing/attempts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${internalToken}` },
    body: JSON.stringify(input),
  })
  if (!response.ok) throw new Error(`provider billing attempt failed: ${response.status}`)
}

async function settleProviderAttempt(providerGenerationId: string | null) {
  if (!providerGenerationId) return
  const url = backendUrl()
  const internalToken = process.env.INTERNAL_API_TOKEN || ''
  if (!url || !internalToken) throw new Error('provider billing internal API is not configured')
  const response = await fetch(`${url}/api/internal/provider-billing/settle`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${internalToken}` },
    body: JSON.stringify({ providerGenerationId }),
  })
  if (!response.ok) throw new Error(`provider billing settle failed: ${response.status}`)
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.OPENROUTER_API_KEY || ''
  if (!apiKey) {
    return NextResponse.json({ disabled: true })
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const code = typeof body.code === 'string' ? body.code : ''
  const error = typeof body.error === 'string' ? body.error : ''
  const orgId =
    typeof body.orgId === 'string' && body.orgId.trim()
      ? body.orgId.trim()
      : typeof body.org_id === 'string' && body.org_id.trim()
        ? body.org_id.trim()
        : null
  const modelId =
    typeof body.model === 'string' && body.model.trim() ? body.model.trim() : DEFAULT_REPAIR_MODEL
  if (!code || !error) {
    return NextResponse.json({ error: 'code and error are required' }, { status: 400 })
  }

  try {
    const attemptKey = ['tsx-repair', randomUUID()].join(':')
    const baseAttempt = {
      attemptKey,
      sourceApp: 'web',
      sourcePath: 'app/api/tsx-repair',
      billingOwnerType: orgId ? 'org' : 'personal',
      userId: user.id,
      orgId,
      feature: 'tsx_repair',
      action: 'repair',
      serviceType: 'text',
      provider: 'openrouter',
      requestedModel: modelId,
      metadata: {
        code_chars: code.length,
        error_chars: error.length,
      },
    }
    await recordProviderAttempt(baseAttempt)
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: modelId,
        messages: [
          {
            role: 'system',
            content:
              'You are a TypeScript/React expert. You fix broken TSX components. Return ONLY the fixed TSX code, no explanation, no markdown fences.',
          },
          {
            role: 'user',
            content: `Fix the following TSX component so it renders without errors.

RUNTIME ERROR:
${error}

BROKEN TSX:
\`\`\`tsx
${code}
\`\`\`

Rules:
- Return ONLY the fixed TSX code, no explanation, no markdown fences.
- Keep the same visual design, layout, and content.
- The component must have an export default.
- Use only React, lucide-react, framer-motion as imports.
- All styles should use Tailwind CSS utility classes or inline style objects.
- Do NOT use TypeScript type annotations — write plain JSX/JS only.`,
          },
        ],
      }),
    })
    const providerGenerationId = res.headers.get('x-generation-id') || null
    const providerRequestId = res.headers.get('x-request-id') || res.headers.get('cf-ray') || null

    if (!res.ok) {
      const errorBody = await res.text().catch(() => '')
      reportWebServerError({
        request,
        route: '/api/tsx-repair',
        feature: 'tsx_repair',
        error_code: 'TSX_REPAIR_OPENROUTER_FAILED',
        message: `OpenRouter returned ${res.status}`,
        statusCode: 500,
        context: {
          model_id: modelId,
          upstream_status: res.status,
          upstream_body: errorBody.slice(0, 500),
        },
      })
      console.error(`[tsx-repair] OpenRouter returned ${res.status}`)
      return NextResponse.json({ error: 'Repair failed' }, { status: 500 })
    }

    const json = (await res.json()) as {
      id?: string
      model?: string
      choices?: Array<{ message?: { content?: string } }>
      usage?: {
        prompt_tokens?: number
        completion_tokens?: number
        total_tokens?: number
        cost?: number
      }
    }
    const settledGenerationId = providerGenerationId || json.id || null
    await recordProviderAttempt({
      ...baseAttempt,
      resolvedModel: json.model ?? modelId,
      providerGenerationId: settledGenerationId,
      providerRequestId,
      inputTokens: json.usage?.prompt_tokens ?? 0,
      outputTokens: json.usage?.completion_tokens ?? 0,
      totalTokens:
        json.usage?.total_tokens ??
        (json.usage?.prompt_tokens ?? 0) + (json.usage?.completion_tokens ?? 0),
      providerCostUsd: typeof json.usage?.cost === 'number' ? json.usage.cost : null,
      metadata: {
        ...baseAttempt.metadata,
        openrouter_response_id: json.id ?? null,
        openrouter_usage: json.usage ?? null,
      },
    })
    await settleProviderAttempt(settledGenerationId)
    let text = json.choices?.[0]?.message?.content?.trim() ?? ''
    if (text.startsWith('```')) {
      text = text
        .replace(/^```[a-zA-Z]*\n?/, '')
        .replace(/\n?```$/, '')
        .trim()
    }

    if (!text) {
      return NextResponse.json({ error: 'Repair produced empty result' }, { status: 422 })
    }

    return NextResponse.json({ code: text })
  } catch (err) {
    reportWebServerError({
      request,
      route: '/api/tsx-repair',
      feature: 'tsx_repair',
      error_code: 'TSX_REPAIR_LLM_CALL_FAILED',
      error: err,
      statusCode: 500,
      context: { model_id: modelId },
    })
    console.error('[tsx-repair] LLM call failed:', err)
    return NextResponse.json({ error: 'Repair failed' }, { status: 500 })
  }
}
