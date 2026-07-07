'use client'

import { createClient } from '@/lib/supabase/client'

function formatAdminErrorBody(status: number, text: string): string {
  const raw = text.trim()
  if (raw.startsWith('{')) {
    try {
      const j = JSON.parse(raw) as { message?: string | string[] }
      if (typeof j.message === 'string' && j.message.length > 0) return j.message
      if (Array.isArray(j.message) && j.message.length > 0) return j.message.join(', ')
    } catch {
      /* use raw */
    }
  }
  return raw || `Request failed: ${status}`
}

export async function adminGet<T>(path: string): Promise<T> {
  const supabase = createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  const response = await fetch(`/api/proxy/admin/${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
    },
    cache: 'no-store',
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(formatAdminErrorBody(response.status, text))
  }

  return response.json() as Promise<T>
}

export async function adminPost<T>(path: string, body: unknown): Promise<T> {
  const supabase = createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  const response = await fetch(`/api/proxy/admin/${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
    },
    body: JSON.stringify(body),
    cache: 'no-store',
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(formatAdminErrorBody(response.status, text))
  }

  return response.json() as Promise<T>
}

export async function adminDelete<T>(path: string): Promise<T> {
  const supabase = createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  const response = await fetch(`/api/proxy/admin/${path}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
    },
    cache: 'no-store',
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(formatAdminErrorBody(response.status, text))
  }

  return response.json() as Promise<T>
}

export async function adminPatch<T>(path: string, body: unknown): Promise<T> {
  const supabase = createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  const response = await fetch(`/api/proxy/admin/${path}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
    },
    body: JSON.stringify(body),
    cache: 'no-store',
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(formatAdminErrorBody(response.status, text))
  }

  return response.json() as Promise<T>
}

/** Proxies to Nest `/api/${path}` (same routing as web `/api/proxy/*`). Not under `/api/admin/*`. */
async function nestBackendFetch(path: string, init?: RequestInit): Promise<Response> {
  const supabase = createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  return fetch(`/api/proxy/${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
      ...init?.headers,
    },
    cache: 'no-store',
  })
}

export async function nestBackendGet<T>(path: string): Promise<T> {
  const response = await nestBackendFetch(path, { method: 'GET' })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(formatAdminErrorBody(response.status, text))
  }

  return response.json() as Promise<T>
}

export async function nestBackendPatch<T>(path: string, body: unknown): Promise<T> {
  const response = await nestBackendFetch(path, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(formatAdminErrorBody(response.status, text))
  }

  return response.json() as Promise<T>
}
