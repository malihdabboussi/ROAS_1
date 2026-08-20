import { BadRequestException } from '@nestjs/common'

export type PageGraderHttpResult = {
  ok: boolean
  status: number
  statusText: string
  body: Record<string, unknown>
  text: string
}

export function normalizePageGraderBaseUrl(baseUrl: string): string {
  return baseUrl.trim().replace(/\/+$/, '')
}

export function pageGraderAuthHeaders(apiKey: string): Record<string, string> {
  return {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  }
}

export function pageGraderErrorMessage(result: PageGraderHttpResult): string {
  return typeof result.body.error === 'string'
    ? result.body.error
    : result.text || result.statusText || 'Request failed'
}

export function throwPageGrader(label: string, result: PageGraderHttpResult): never {
  throw new BadRequestException(`${label} (${result.status}): ${pageGraderErrorMessage(result)}`)
}

export async function pageGraderHttp(
  url: string,
  apiKey: string,
  init: { method?: string; body?: unknown } = {},
): Promise<PageGraderHttpResult> {
  const res = await fetch(url, {
    method: init.method ?? 'GET',
    headers: pageGraderAuthHeaders(apiKey),
    ...(init.body !== undefined ? { body: JSON.stringify(init.body) } : {}),
  })
  const text = await res.text().catch(() => '')
  let body: Record<string, unknown> = {}
  try {
    body = text ? (JSON.parse(text) as Record<string, unknown>) : {}
  } catch {
    body = { error: text }
  }
  return { ok: res.ok, status: res.status, statusText: res.statusText, body, text }
}

export async function requirePageGraderJson(
  url: string,
  apiKey: string,
  label: string,
  init: { method?: string; body?: unknown } = {},
): Promise<Record<string, unknown>> {
  const result = await pageGraderHttp(url, apiKey, init)
  if (!result.ok) throwPageGrader(label, result)
  return result.body
}
