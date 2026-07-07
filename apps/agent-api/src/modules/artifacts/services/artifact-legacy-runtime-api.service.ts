import { randomUUID } from 'crypto'
import { Injectable } from '@nestjs/common'
import { getAdminSkillBuilderContext } from '../../admin-skill-builder/admin-skill-builder-context.store'
import { parseTargetAgentKeyFromSessionKey } from '../../admin-skill-builder/admin-skill-builder-session.util'
import { ArtifactLegacyRuntimeRepository } from '../repositories/artifact-legacy-runtime.repository'

const GENERIC_HTTP_ERROR_MESSAGES = new Set([
  'bad request',
  'unauthorized',
  'forbidden',
  'not found',
  'conflict',
  'unprocessable entity',
  'too many requests',
  'internal server error',
  'bad gateway',
  'service unavailable',
  'gateway timeout',
  'invalid request',
  'validation failed',
  'request validation failed',
])

function cleanString(value: unknown): string | null {
  if (typeof value === 'string' && value.trim()) return value.trim()
  return null
}

function formatErrorPath(value: unknown): string | null {
  const direct = cleanString(value)
  if (direct) return direct
  if (Array.isArray(value)) {
    const parts = value
      .map((item) => {
        if (typeof item === 'string' || typeof item === 'number') return String(item).trim()
        return ''
      })
      .filter((item): item is string => Boolean(item))
    return parts.length > 0 ? parts.join('.') : null
  }
  return null
}

function collectErrorStrings(value: unknown): string[] {
  const direct = cleanString(value)
  if (direct) return [direct]

  if (Array.isArray(value)) return value.flatMap((item) => collectErrorStrings(item))

  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>
    const path = formatErrorPath(obj.path)
    const message = cleanString(obj.message)
    if (path && message) return [`${path}: ${message}`]

    const messages: string[] = []
    const fieldErrors = obj.fieldErrors
    if (fieldErrors && typeof fieldErrors === 'object' && !Array.isArray(fieldErrors)) {
      for (const [field, errors] of Object.entries(fieldErrors as Record<string, unknown>)) {
        for (const fieldMessage of collectErrorStrings(errors)) {
          messages.push(`${field}: ${fieldMessage}`)
        }
      }
    }
    messages.push(...collectErrorStrings(obj.formErrors))
    if (messages.length > 0) return messages

    return [
      ...collectErrorStrings(obj.message),
      ...collectErrorStrings(obj.error),
      ...collectErrorStrings(obj.details),
      ...collectErrorStrings(obj.detail),
    ]
  }

  return []
}

function firstString(value: unknown): string | null {
  const parts = collectErrorStrings(value)
  if (parts.length === 0) return null
  return [...new Set(parts)].join('; ')
}

function combineMessageParts(...values: Array<string | null>): string | null {
  const parts: string[] = []
  for (const value of values) {
    if (!value) continue
    const normalized = value.toLowerCase()
    if (parts.some((part) => part.toLowerCase() === normalized)) continue
    const broaderIndex = parts.findIndex((part) => normalized.includes(part.toLowerCase()))
    if (broaderIndex >= 0) {
      parts[broaderIndex] = value
    } else {
      parts.push(value)
    }
  }
  return parts.length > 0 ? parts.join('; ') : null
}

function isGenericHttpErrorMessage(value: string | null): boolean {
  if (!value) return false
  return GENERIC_HTTP_ERROR_MESSAGES.has(value.trim().toLowerCase())
}

function parseMainApiErrorMessage(raw: string, fallback: string): string {
  if (!raw.trim()) return fallback
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>
    const error = firstString(parsed.error)
    const message = firstString(parsed.message)
    const details = firstString(parsed.details) ?? firstString(parsed.detail)
    const specificMessage = combineMessageParts(message, details)
    if (specificMessage && (!error || isGenericHttpErrorMessage(error))) return specificMessage
    if (parsed.success === false && error && !isGenericHttpErrorMessage(error)) return error
    return specificMessage ?? error ?? fallback
  } catch {
    return raw.trim() || fallback
  }
}

@Injectable()
export class ArtifactLegacyRuntimeApiService {
  constructor(
    private readonly repository: ArtifactLegacyRuntimeRepository = new ArtifactLegacyRuntimeRepository(),
  ) {}

  async mainApiCall(
    target: Record<string, any>,
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    path: string,
    sessionKey?: string,
    body?: Record<string, unknown>,
  ): Promise<unknown> {
    if (sessionKey?.includes('::admin-skill-builder')) {
      return this.adminEnterpriseSkillApiCall(target, method, path, sessionKey, body)
    }
    const userId = target.resolveUserId(sessionKey)
    const orgId = typeof target.resolveOrgId === 'function' ? target.resolveOrgId(sessionKey) : null
    if (sessionKey && target.isMissionSessionKey(sessionKey))
      return this.mainApiCallMissionSessionDirect(target, method, path, userId, body, orgId)
    const accessToken = await target.getAccessTokenFromSessionKey(sessionKey as string, userId)
    const mainApiUrl =
      (target.config.get('MAIN_API_URL') as string | undefined) || 'http://localhost:3001'
    const url = `${mainApiUrl}${path}`
    const headers: Record<string, string> = {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    }
    if (orgId) headers['x-org-id'] = orgId
    if (method !== 'GET' && method !== 'DELETE') headers['Content-Type'] = 'application/json'
    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    })
    const raw = await response.text()
    if (!response.ok) {
      const msg = parseMainApiErrorMessage(raw, `Main API call failed (${response.status})`)
      throw new Error(msg)
    }
    return raw ? (JSON.parse(raw) as unknown) : { success: true }
  }

  async mainApiCallMissionSessionDirect(
    target: Record<string, any>,
    method: string,
    path: string,
    userId: string,
    body?: Record<string, unknown>,
    orgId?: string | null,
  ): Promise<unknown> {
    const missionIdMatch = path.match(/\/api\/missions\/([0-9a-f-]{36})/)
    const missionId = missionIdMatch?.[1] ?? ''
    if (method === 'GET' && /^\/api\/missions\/?(\?|$)/.test(path)) {
      const { data, error } = await this.repository.listMissionSessionMissions(
        target.serviceClient,
        { orgId, userId },
      )
      if (error) throw new Error(`Failed to list missions: ${error.message}`)
      return data || []
    }
    if (method === 'GET' && missionId && !path.includes('/comment') && !path.includes('/status')) {
      const { data, error } = await this.repository.findMissionSessionMission(
        target.serviceClient,
        { missionId, orgId, userId },
      )
      if (error) throw new Error(`Mission not found: ${error.message}`)
      return data
    }
    if (method === 'PATCH' && missionId && path.includes('/status')) {
      const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
      for (const key of [
        'status',
        'error',
        'output',
        'current_agent_key',
        'retry_count',
        'progress_notes',
        'plan_id',
      ])
        if (body?.[key] !== undefined) updates[key] = body[key]
      if (body?.status === 'in_progress') updates.started_at = new Date().toISOString()
      if (body?.status === 'done' || body?.status === 'error' || body?.status === 'failed')
        updates.completed_at = new Date().toISOString()
      const { data, error } = await this.repository.updateMissionSessionMission(
        target.serviceClient,
        { missionId, orgId, updates, userId },
      )
      if (error) throw new Error(`Failed to update mission status: ${error.message}`)
      return data
    }
    if (method === 'PATCH' && missionId) {
      const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
      for (const key of ['title', 'brief', 'priority', 'description'])
        if (body?.[key] !== undefined) updates[key] = body[key]
      const { data, error } = await this.repository.updateMissionSessionMission(
        target.serviceClient,
        { missionId, orgId, updates, userId },
      )
      if (error) throw new Error(`Failed to update mission: ${error.message}`)
      return data
    }
    if (method === 'POST' && missionId && path.includes('/comment')) {
      const message = body?.message as string
      if (!message) throw new Error('message is required')
      const { data, error } = await this.repository.insertMissionSessionComment(
        target.serviceClient,
        {
          mission_id: missionId,
          user_id: userId,
          org_id: orgId ?? null,
          event_type: 'user.comment',
          payload: { message },
        },
      )
      if (error) throw new Error(`Failed to add comment: ${error.message}`)
      return data
    }
    if (method === 'POST' && path === '/api/missions') {
      const { data, error } = await this.repository.createMissionSessionMission(
        target.serviceClient,
        {
          user_id: userId,
          org_id: orgId ?? null,
          title: body?.title,
          brief: body?.brief || null,
          description: body?.description || null,
          status: 'inbox',
          priority: body?.priority || 'medium',
          assigned_agent_key: body?.assigned_agent_key || null,
          campaign_id: body?.campaign_id || null,
          space_id: body?.space_id || null,
          source_space_item_id: body?.source_space_item_id || null,
          parent_mission_id: body?.parent_mission_id || null,
          idempotency_key: body?.idempotency_key || null,
          input: body?.input || {},
          retry_count: 0,
          correlation_id: randomUUID(),
        },
      )
      if (error) throw new Error(`Failed to create mission: ${error.message}`)
      return data
    }
    const agentSkillsMatch = path.match(/\/api\/missions\/agents\/([^/]+)\/skills/)
    if (agentSkillsMatch && method === 'GET') {
      const agentKey = agentSkillsMatch[1]
      const { data, error } = await this.repository.listMissionSessionAgentSkills(
        target.serviceClient,
        { agentKey, userId },
      )
      if (error) throw new Error(`Failed to list skills: ${error.message}`)
      return data || []
    }
    return this.proxyToMainApiViaInternalToken(target, method, path, userId, body, orgId)
  }

  private async proxyToMainApiViaInternalToken(
    target: Record<string, any>,
    method: string,
    path: string,
    userId: string,
    body?: Record<string, unknown>,
    orgId?: string | null,
  ): Promise<unknown> {
    const mainApiUrl =
      (target.config.get('MAIN_API_URL') as string | undefined) || 'http://localhost:3001'
    const internalToken =
      (target.config.get('INTERNAL_API_TOKEN') as string | undefined) ||
      process.env.INTERNAL_API_TOKEN ||
      ''
    if (!internalToken) {
      throw new Error('INTERNAL_API_TOKEN is required for mission API proxy')
    }
    const url = `${mainApiUrl}${path}`
    const headers: Record<string, string> = {
      'x-internal-token': internalToken,
      'x-user-id': userId,
      Accept: 'application/json',
    }
    if (orgId) headers['x-org-id'] = orgId
    if (method !== 'GET' && method !== 'DELETE') headers['Content-Type'] = 'application/json'
    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    })
    const raw = await response.text()
    if (!response.ok) {
      let msg = `Mission API proxy failed (${response.status}) ${method} ${path}`
      try {
        const parsed = JSON.parse(raw) as { error?: string; message?: string }
        msg = parsed.error || parsed.message || msg
      } catch {}
      throw new Error(msg)
    }
    return raw ? (JSON.parse(raw) as unknown) : { success: true }
  }

  private async adminEnterpriseSkillApiCall(
    target: Record<string, any>,
    method: string,
    path: string,
    sessionKey: string,
    body?: Record<string, unknown>,
  ): Promise<unknown> {
    const conversationId =
      typeof target.parseConversationId === 'function'
        ? target.parseConversationId(sessionKey)
        : null
    const ctx = getAdminSkillBuilderContext(conversationId)
    if (!ctx) {
      throw new Error('Admin skill builder context not found for session')
    }

    const mainApiUrl =
      (target.config.get('MAIN_API_URL') as string | undefined) || 'http://localhost:3001'
    const internalToken =
      (target.config.get('INTERNAL_API_TOKEN') as string | undefined) ||
      process.env.INTERNAL_API_TOKEN ||
      ''
    if (!internalToken) {
      throw new Error('INTERNAL_API_TOKEN is required for admin enterprise skill API')
    }

    const defaultAgentKey = parseTargetAgentKeyFromSessionKey(sessionKey) ?? ctx.targetAgentKey
    const agentKey = String(body?.agent_key ?? defaultAgentKey).trim()

    const basePayload = {
      admin_user_id: ctx.adminUserId,
      acting_user_id: ctx.actingUserId,
      org_id: ctx.orgId,
      agent_key: agentKey,
    }

    const headers: Record<string, string> = {
      Authorization: `Bearer ${internalToken}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    }

    const skillsListMatch = path.match(/^\/api\/missions\/agents\/([^/]+)\/skills\/?$/)
    if (method === 'GET' && skillsListMatch) {
      const response = await fetch(`${mainApiUrl}/api/internal/enterprise/skills/list`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          acting_user_id: ctx.actingUserId,
          org_id: ctx.orgId,
          agent_key: skillsListMatch[1] ?? agentKey,
        }),
      })
      return this.parseAdminEnterpriseResponse(response)
    }

    if (method === 'POST' && skillsListMatch) {
      const response = await fetch(`${mainApiUrl}/api/internal/enterprise/skills/create`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          ...basePayload,
          skill_key: body?.skill_key,
          name: body?.name,
          description: body?.description,
          markdown_content: body?.markdown_content,
          is_enabled: body?.is_enabled,
        }),
      })
      return this.parseAdminEnterpriseResponse(response)
    }

    const skillPatchMatch = path.match(/^\/api\/missions\/agents\/([^/]+)\/skills\/([^/]+)$/)
    if (method === 'PATCH' && skillPatchMatch) {
      const { skill_key: _sk, ...updates } = body ?? {}
      const response = await fetch(`${mainApiUrl}/api/internal/enterprise/skills/update`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          ...basePayload,
          agent_key: skillPatchMatch[1] ?? agentKey,
          skill_id: skillPatchMatch[2],
          updates,
        }),
      })
      return this.parseAdminEnterpriseResponse(response)
    }

    if (method === 'DELETE' && skillPatchMatch) {
      const response = await fetch(`${mainApiUrl}/api/internal/enterprise/skills/delete`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          ...basePayload,
          agent_key: skillPatchMatch[1] ?? agentKey,
          skill_id: skillPatchMatch[2],
        }),
      })
      return this.parseAdminEnterpriseResponse(response)
    }

    const resourceMatch = path.match(
      /^\/api\/missions\/agents\/([^/]+)\/skills\/([^/]+)\/resources$/,
    )
    if (method === 'POST' && resourceMatch) {
      const response = await fetch(`${mainApiUrl}/api/internal/enterprise/skills/resource`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          ...basePayload,
          agent_key: resourceMatch[1] ?? agentKey,
          skill_key: decodeURIComponent(resourceMatch[2] ?? ''),
          file_path: body?.file_path,
          content: body?.content,
        }),
      })
      return this.parseAdminEnterpriseResponse(response)
    }

    throw new Error(`Admin enterprise skill API does not support ${method} ${path}`)
  }

  private async parseAdminEnterpriseResponse(response: Response): Promise<unknown> {
    const raw = await response.text()
    if (!response.ok) {
      let msg = `Admin enterprise API failed (${response.status})`
      try {
        const parsed = JSON.parse(raw) as { error?: string; message?: string }
        msg = parsed.error || parsed.message || msg
      } catch {}
      throw new Error(msg)
    }
    if (!raw) return { success: true }
    const parsed = JSON.parse(raw) as unknown
    if (parsed && typeof parsed === 'object' && 'skills' in (parsed as Record<string, unknown>)) {
      return (parsed as { skills: unknown }).skills
    }
    return parsed
  }
}
