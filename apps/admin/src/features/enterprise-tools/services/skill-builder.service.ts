'use client'

import { createClient } from '@/lib/supabase/client'
import type {
  SkillBuilderAgent,
  SkillBuilderMessage,
  SkillBuilderScope,
  SkillBuilderSession,
  SkillBuilderSkill,
  SkillBuilderUser,
} from '../types/skill-builder.types'

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

async function adminEnterpriseGet<T>(path: string): Promise<T> {
  const supabase = createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  const response = await fetch(`/api/proxy/admin/enterprise/skill-builder/${path}`, {
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

async function adminEnterprisePost<T>(path: string, body: unknown): Promise<T> {
  const supabase = createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  const response = await fetch(`/api/proxy/admin/enterprise/skill-builder/${path}`, {
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

export async function searchSkillBuilderUsers(q: string): Promise<{ users: SkillBuilderUser[] }> {
  const params = new URLSearchParams()
  if (q.trim()) params.set('q', q.trim())
  return adminEnterpriseGet(`users/search?${params.toString()}`)
}

export async function fetchSkillBuilderScopes(
  userId: string,
): Promise<{ scopes: SkillBuilderScope[] }> {
  return adminEnterpriseGet(`users/${userId}/scopes`)
}

export async function fetchSkillBuilderAgents(
  userId: string,
  orgId: string | null,
): Promise<{ agents: SkillBuilderAgent[] }> {
  const params = new URLSearchParams({ userId })
  params.set('orgId', orgId ?? 'personal')
  return adminEnterpriseGet(`agents?${params.toString()}`)
}

export async function fetchSkillBuilderSkills(
  userId: string,
  orgId: string | null,
  agentKey: string,
): Promise<{ skills: SkillBuilderSkill[] }> {
  const params = new URLSearchParams({ userId })
  params.set('orgId', orgId ?? 'personal')
  return adminEnterpriseGet(`agents/${encodeURIComponent(agentKey)}/skills?${params.toString()}`)
}

export async function createSkillBuilderSession(input: {
  acting_user_id: string
  org_id?: string | null
  target_agent_key: string
}): Promise<SkillBuilderSession> {
  return adminEnterprisePost('sessions', input)
}

export async function fetchSkillBuilderSessions(): Promise<{ sessions: SkillBuilderSession[] }> {
  return adminEnterpriseGet('sessions')
}

export async function fetchSkillBuilderMessages(
  sessionId: string,
): Promise<{ messages: SkillBuilderMessage[] }> {
  return adminEnterpriseGet(`sessions/${sessionId}/messages`)
}

export async function triggerSkillBuilderSync(input: {
  acting_user_id: string
  org_id?: string | null
  agent_key: string
}): Promise<{ synced: boolean }> {
  return adminEnterprisePost('sync', input)
}
