import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  getFlowCapability,
  searchFlowCapabilities,
  type FlowCapability,
  type FlowCapabilityKind,
} from '@vibey/api-shared'
import { ArtifactFlowsRepository } from '../repositories/artifact-flows.repository'
import type { ArtifactActionHandler } from './artifact-action.registry'

type FlowValidationResult = {
  valid: boolean
  errors: string[]
}

function stringValue(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function objectValue(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function objectArrayValue(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value)
    ? value.filter(
        (entry): entry is Record<string, unknown> =>
          !!entry && typeof entry === 'object' && !Array.isArray(entry),
      )
    : []
}

function normalizeLimit(value: unknown): number {
  const parsed = Number(value ?? 50)
  if (!Number.isFinite(parsed)) return 50
  return Math.min(Math.max(Math.trunc(parsed), 1), 100)
}

function missingRequiredFields(
  capability: FlowCapability,
  payload: Record<string, unknown>,
): string[] {
  return capability.requiredFields.filter((field) => {
    const value = payload[field]
    if (value === undefined || value === null) return true
    if (typeof value === 'string') return !value.trim()
    return false
  })
}

function triggerCapabilityId(trigger: Record<string, unknown>): string | null {
  const type = stringValue(trigger.type)
  if (!type) return null
  if (type === 'external_app_event') {
    const slug = stringValue(trigger.trigger_slug)
    return slug ? `trigger.external_app_event.${slug}` : 'trigger.external_app_event'
  }
  return `trigger.${type}`
}

function actionCapabilityId(action: Record<string, unknown>): string | null {
  const type = stringValue(action.type)
  return type ? `action.${type}` : null
}

function backendPublishSyncReason(flow: Record<string, unknown>): string | null {
  const trigger = objectValue(flow.trigger)
  const type = stringValue(trigger?.type)
  if (!type) return null
  if (type === 'schedule') return 'schedule trigger next-fire calculation'
  if (type === 'webhook_received') return 'webhook endpoint validation'
  if (
    type === 'external_email_received' ||
    type === 'external_slack_message_received' ||
    type === 'external_fathom_recording_ready' ||
    type === 'external_app_event'
  ) {
    return 'external trigger route sync'
  }
  if (
    type === 'contact_created' ||
    type === 'contact_updated' ||
    type === 'contact_tag_added' ||
    type === 'contact_tag_removed' ||
    type === 'contact_type_changed' ||
    type === 'contact_source_changed'
  ) {
    return 'contact trigger route sync'
  }
  return null
}

@Injectable()
export class ArtifactFlowsService {
  constructor(private readonly repository = new ArtifactFlowsRepository()) {}

  getHandlers(target: Record<string, any>): Record<string, ArtifactActionHandler> {
    return {
      search_flow_capabilities: (data) => this.searchFlowCapabilities(data),
      get_flow_capability: (data) => this.getFlowCapability(data),
      list_flows: (data, sessionKey) => this.listFlows(target, data, sessionKey),
      get_flow: (data, sessionKey) => this.getFlow(target, data, sessionKey),
      create_flow_draft: (data, sessionKey) => this.createFlowDraft(target, data, sessionKey),
      update_flow_draft: (data, sessionKey) => this.updateFlowDraft(target, data, sessionKey),
      validate_flow_draft: (data, sessionKey) => this.validateFlowDraft(target, data, sessionKey),
      publish_flow: (data, sessionKey) => this.publishFlow(target, data, sessionKey),
    }
  }

  private resolveUserId(target: Record<string, any>, sessionKey?: string): string {
    const userId =
      typeof target.resolveUserId === 'function'
        ? String(target.resolveUserId(sessionKey) ?? '')
        : ''
    if (!userId) throw new Error('Unable to resolve user for flow action')
    return userId
  }

  private async getUserClient(
    target: Record<string, any>,
    userId: string,
    sessionKey?: string,
  ): Promise<SupabaseClient> {
    return (await target.getUserClient(userId, sessionKey as string)) as SupabaseClient
  }

  private async loadSpace(supabase: SupabaseClient, spaceId: string) {
    const { data, error } = await this.repository.findSpace(supabase, spaceId)
    if (error) throw new Error(error.message)
    if (!data) throw new Error('Space not found')
    return data as { id: string; user_id: string; org_id?: string | null }
  }

  private validateFlowPayload(input: Record<string, unknown>): FlowValidationResult {
    const errors: string[] = []
    const name = stringValue(input.name)
    const trigger = objectValue(input.trigger)
    const actions = objectArrayValue(input.actions)

    if (!name) errors.push('Flow name is required.')
    if (!trigger) {
      errors.push('Flow trigger is required.')
    } else {
      const capabilityId = triggerCapabilityId(trigger)
      const capability = capabilityId ? getFlowCapability(capabilityId) : null
      if (!capability) {
        errors.push(`Unsupported trigger: ${stringValue(trigger.type) ?? 'missing type'}.`)
      } else {
        const missing = missingRequiredFields(capability, trigger)
        if (missing.length) {
          errors.push(`Trigger ${capability.type} is missing: ${missing.join(', ')}.`)
        }
      }
    }

    if (actions.length === 0) {
      errors.push('At least one flow action is required.')
    }
    actions.forEach((action, index) => {
      const capabilityId = actionCapabilityId(action)
      const capability = capabilityId ? getFlowCapability(capabilityId) : null
      if (!capability) {
        errors.push(
          `Unsupported action at index ${index}: ${stringValue(action.type) ?? 'missing type'}.`,
        )
        return
      }
      const missing = missingRequiredFields(capability, action)
      if (missing.length) {
        errors.push(`Action ${index + 1} (${capability.type}) is missing: ${missing.join(', ')}.`)
      }
    })

    return { valid: errors.length === 0, errors }
  }

  private searchFlowCapabilities(data: Record<string, unknown>) {
    return {
      success: true,
      ...searchFlowCapabilities({
        query: stringValue(data.query),
        kind: (data.kind === 'trigger' || data.kind === 'action'
          ? data.kind
          : null) as FlowCapabilityKind | null,
        category: stringValue(data.category),
        limit: typeof data.limit === 'number' ? data.limit : null,
        cursor: stringValue(data.cursor),
      }),
    }
  }

  private getFlowCapability(data: Record<string, unknown>) {
    const capabilityId = stringValue(data.capability_id)
    if (!capabilityId) return { success: false, error: 'capability_id is required' }
    const capability = getFlowCapability(capabilityId)
    if (!capability) return { success: false, error: 'Flow capability not found' }
    return { success: true, capability }
  }

  private async listFlows(
    target: Record<string, any>,
    data: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const userId = this.resolveUserId(target, sessionKey)
    const spaceId = stringValue(data.space_id)
    if (!spaceId) return { success: false, error: 'space_id is required' }
    const supabase = await this.getUserClient(target, userId, sessionKey)
    const { data: rows, error } = await this.repository.listFlows(supabase, {
      spaceId,
      limit: normalizeLimit(data.limit),
    })
    if (error) return { success: false, error: error.message }
    return { success: true, flows: rows ?? [] }
  }

  private async getFlow(
    target: Record<string, any>,
    data: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const userId = this.resolveUserId(target, sessionKey)
    const spaceId = stringValue(data.space_id)
    const automationId = stringValue(data.automation_id)
    if (!spaceId || !automationId)
      return { success: false, error: 'space_id and automation_id are required' }
    const supabase = await this.getUserClient(target, userId, sessionKey)
    const { data: row, error } = await this.repository.findFlow(supabase, {
      spaceId,
      automationId,
    })
    if (error) return { success: false, error: error.message }
    if (!row) return { success: false, error: 'Flow not found' }
    return { success: true, flow: row }
  }

  private async createFlowDraft(
    target: Record<string, any>,
    data: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const userId = this.resolveUserId(target, sessionKey)
    const spaceId = stringValue(data.space_id)
    if (!spaceId) return { success: false, error: 'space_id is required' }
    const supabase = await this.getUserClient(target, userId, sessionKey)
    const space = await this.loadSpace(supabase, spaceId)
    const payload = {
      name: stringValue(data.name) ?? 'Untitled flow draft',
      trigger: objectValue(data.trigger) ?? {},
      actions: objectArrayValue(data.actions),
    }
    const validation = this.validateFlowPayload(payload)
    const { data: row, error } = await this.repository.createFlowDraft(supabase, {
      space_id: space.id,
      user_id: space.user_id,
      org_id: space.org_id ?? null,
      created_by: userId,
      ...payload,
      enabled: false,
      is_draft: true,
    })
    if (error) return { success: false, error: error.message }
    return { success: true, flow: row, validation }
  }

  private async updateFlowDraft(
    target: Record<string, any>,
    data: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const userId = this.resolveUserId(target, sessionKey)
    const spaceId = stringValue(data.space_id)
    const automationId = stringValue(data.automation_id)
    if (!spaceId || !automationId)
      return { success: false, error: 'space_id and automation_id are required' }
    const supabase = await this.getUserClient(target, userId, sessionKey)
    const existingResult = await this.getFlow(target, data, sessionKey)
    if (!(existingResult as { success?: boolean }).success) return existingResult
    const existing = (existingResult as { flow: Record<string, unknown> }).flow
    if (existing.is_draft !== true) {
      return { success: false, error: 'Only drafts can be updated with update_flow_draft.' }
    }
    const patch: Record<string, unknown> = { enabled: false, is_draft: true }
    for (const key of ['name', 'trigger', 'actions'] as const) {
      if (data[key] !== undefined) patch[key] = data[key]
    }
    const validation = this.validateFlowPayload({ ...existing, ...patch })
    const { data: row, error } = await this.repository.updateFlow(supabase, {
      spaceId,
      automationId,
      patch: { ...patch, updated_at: new Date().toISOString() },
    })
    if (error) return { success: false, error: error.message }
    return { success: true, flow: row, validation }
  }

  private async validateFlowDraft(
    target: Record<string, any>,
    data: Record<string, unknown>,
    sessionKey?: string,
  ) {
    if (data.automation_id) {
      const result = await this.getFlow(target, data, sessionKey)
      if (!(result as { success?: boolean }).success) return result
      const validation = this.validateFlowPayload(
        (result as { flow: Record<string, unknown> }).flow,
      )
      return { success: true, validation }
    }
    const flow = objectValue(data.flow) ?? data
    return { success: true, validation: this.validateFlowPayload(flow) }
  }

  private async publishFlow(
    target: Record<string, any>,
    data: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const spaceId = stringValue(data.space_id)
    const automationId = stringValue(data.automation_id)
    if (!spaceId || !automationId)
      return { success: false, error: 'space_id and automation_id are required' }
    const result = await this.getFlow(target, data, sessionKey)
    if (!(result as { success?: boolean }).success) return result
    const flow = (result as { flow: Record<string, unknown> }).flow
    const validation = this.validateFlowPayload(flow)
    if (!validation.valid) return { success: false, validation }
    const syncReason = backendPublishSyncReason(flow)
    if (syncReason) {
      return {
        success: false,
        error:
          `publish_flow requires the admin Flows API for ${syncReason}. ` +
          'Save and validate the draft, then publish it from /flows so backend sync runs.',
        validation,
      }
    }
    const userId = this.resolveUserId(target, sessionKey)
    const supabase = await this.getUserClient(target, userId, sessionKey)
    const { data: row, error } = await this.repository.updateFlow(supabase, {
      spaceId,
      automationId,
      patch: { is_draft: false, enabled: true, updated_at: new Date().toISOString() },
    })
    if (error) return { success: false, error: error.message }
    return { success: true, flow: row, validation }
  }
}
