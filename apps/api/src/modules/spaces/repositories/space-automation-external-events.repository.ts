import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'

@Injectable()
export class SpaceAutomationExternalEventsRepository {
  async findExternalTriggerByAutomation(
    supabase: SupabaseClient,
    spaceId: string,
    automationId: string,
    select = '*',
  ): Promise<Record<string, unknown> | null> {
    const { data } = await supabase
      .from('space_external_automation_triggers')
      .select(select)
      .eq('space_id', spaceId)
      .eq('automation_id', automationId)
      .maybeSingle()
    return (data ?? null) as Record<string, unknown> | null
  }

  async upsertExternalTrigger(
    supabase: SupabaseClient,
    payload: Record<string, unknown>,
  ): Promise<void> {
    const { error } = await supabase
      .from('space_external_automation_triggers')
      .upsert(payload, { onConflict: 'space_id,automation_id' })
    if (error) throw new Error(error.message)
  }

  async upsertContactRoute(supabase: SupabaseClient, payload: Record<string, unknown>) {
    const { error } = await supabase
      .from('space_contact_automation_routes')
      .upsert(payload, { onConflict: 'space_id,automation_id' })
    if (error) throw new Error(error.message)
  }

  async disableContactRoute(supabase: SupabaseClient, spaceId: string, automationId: string) {
    await supabase
      .from('space_contact_automation_routes')
      .update({ status: 'disabled', updated_at: new Date().toISOString() })
      .eq('space_id', spaceId)
      .eq('automation_id', automationId)
  }

  async listActiveContactRoutes(
    supabase: SupabaseClient,
    event: { user_id: string; org_id?: string | null; type: string },
  ) {
    const eventOrgId = event.org_id ?? null
    let query = supabase
      .from('space_contact_automation_routes')
      .select('*')
      .eq('status', 'active')
      .eq('user_id', event.user_id)
      .eq('trigger_type', event.type)
    query = eventOrgId ? query.eq('org_id', eventOrgId) : query.is('org_id', null)
    const result = await query
    return Array.isArray(result.data) ? (result.data as Record<string, unknown>[]) : []
  }

  async listFathomUserRoutes(supabase: SupabaseClient, userIntegrationId: string) {
    const { data } = await supabase
      .from('space_external_automation_triggers')
      .select('id, space_id, automation_id, user_id, org_id, source')
      .eq('provider', 'fathom')
      .eq('status', 'active')
      .eq('source->>user_integration_id', userIntegrationId)
    return (data ?? []) as Array<Record<string, unknown>>
  }

  async listFathomSelfRoutes(supabase: SupabaseClient, fathomOwnerUserId: string) {
    const { data } = await supabase
      .from('space_external_automation_triggers')
      .select('id, space_id, automation_id, user_id, org_id, source')
      .eq('provider', 'fathom')
      .eq('status', 'active')
      .eq('user_id', fathomOwnerUserId)
    return (data ?? []) as Array<Record<string, unknown>>
  }

  async listDisconnectedFathomUserRoutes(
    supabase: SupabaseClient,
    userIntegrationId: string,
    disabledReason: string,
  ) {
    const { data, error } = await supabase
      .from('space_external_automation_triggers')
      .select('id, automation_id, source')
      .eq('provider', 'fathom')
      .eq('status', 'disabled')
      .eq('last_error', disabledReason)
      .eq('source->>user_integration_id', userIntegrationId)
    if (error) throw new Error(error.message)
    return (data ?? []) as Array<Record<string, unknown>>
  }

  async listDisconnectedFathomSelfRoutes(
    supabase: SupabaseClient,
    fathomOwnerUserId: string,
    disabledReason: string,
  ) {
    const { data, error } = await supabase
      .from('space_external_automation_triggers')
      .select('id, automation_id, source')
      .eq('provider', 'fathom')
      .eq('status', 'disabled')
      .eq('last_error', disabledReason)
      .eq('user_id', fathomOwnerUserId)
    if (error) throw new Error(error.message)
    return (data ?? []) as Array<Record<string, unknown>>
  }

  async disableExternalTriggersByIds(
    supabase: SupabaseClient,
    rowIds: string[],
    reason: string,
    nowIso: string,
  ) {
    const { error } = await supabase
      .from('space_external_automation_triggers')
      .update({ status: 'disabled', last_error: reason, updated_at: nowIso })
      .in('id', rowIds)
    if (error) throw new Error(error.message)
  }

  async disableAutomationRule(supabase: SupabaseClient, automationId: string, nowIso: string) {
    await supabase
      .from('space_automations')
      .update({ enabled: false, updated_at: nowIso })
      .eq('id', automationId)
  }

  async restoreExternalTriggersByIds(supabase: SupabaseClient, rowIds: string[], nowIso: string) {
    const { error } = await supabase
      .from('space_external_automation_triggers')
      .update({ status: 'active', last_error: null, updated_at: nowIso })
      .in('id', rowIds)
    if (error) throw new Error(error.message)
  }

  async enableAutomationRule(supabase: SupabaseClient, automationId: string, nowIso: string) {
    const { error } = await supabase
      .from('space_automations')
      .update({ enabled: true, updated_at: nowIso })
      .eq('id', automationId)
    if (error) throw new Error(error.message)
  }

  async listAutomationDetails(supabase: SupabaseClient, automationIds: string[]) {
    const { data } = await supabase
      .from('space_automations')
      .select('id, created_by, name, space_id, org_id')
      .in('id', automationIds)
    return (data ?? []) as Array<{
      id: string
      created_by: string
      name: string
      space_id: string
      org_id: string | null
    }>
  }

  async insertNotifications(
    supabase: SupabaseClient,
    notifications: Array<Record<string, unknown>>,
  ) {
    const result = await supabase.from('user_notifications').insert(notifications)
    return result.error?.message ?? null
  }

  async disableExternalTrigger(supabase: SupabaseClient, spaceId: string, automationId: string) {
    await supabase
      .from('space_external_automation_triggers')
      .update({ status: 'disabled', updated_at: new Date().toISOString() })
      .eq('space_id', spaceId)
      .eq('automation_id', automationId)
  }

  async insertExternalEvent(supabase: SupabaseClient, payload: Record<string, unknown>) {
    return supabase.from('space_external_automation_events').insert(payload).select().single()
  }

  async updateExternalEvent(
    supabase: SupabaseClient,
    eventId: string,
    patch: Record<string, unknown>,
  ) {
    const { error } = await supabase
      .from('space_external_automation_events')
      .update(patch)
      .eq('id', eventId)
    if (error) throw new Error(error.message)
  }

  async findActiveExternalRouteByTriggerId(supabase: SupabaseClient, composioTriggerId: string) {
    const { data } = await supabase
      .from('space_external_automation_triggers')
      .select('*')
      .eq('composio_trigger_id', composioTriggerId)
      .eq('status', 'active')
      .maybeSingle()
    return (data ?? null) as Record<string, unknown> | null
  }

  async listActiveSelfFathomRoutes(supabase: SupabaseClient, userId: string) {
    const { data } = await supabase
      .from('space_external_automation_triggers')
      .select('*')
      .eq('provider', 'fathom')
      .eq('status', 'active')
      .eq('user_id', userId)
    return (data ?? []) as Array<Record<string, unknown>>
  }

  async listFathomIntegrationIdsForUser(supabase: SupabaseClient, userId: string) {
    const { data } = await supabase
      .from('user_integrations')
      .select('id')
      .eq('user_id', userId)
      .eq('integration_id', 'fathom')
    return ((data ?? []) as Array<{ id: string }>).map((row) => String(row.id))
  }

  async listActiveFathomRoutesByIntegrationIds(supabase: SupabaseClient, integrationIds: string[]) {
    if (integrationIds.length === 0) return [] as Array<Record<string, unknown>>
    const { data } = await supabase
      .from('space_external_automation_triggers')
      .select('*')
      .eq('provider', 'fathom')
      .eq('status', 'active')
      .in('source->>user_integration_id', integrationIds)
    return (data ?? []) as Array<Record<string, unknown>>
  }

  async listAgentTeamIdsForUser(supabase: SupabaseClient, userId: string) {
    const { data } = await supabase
      .from('agent_team_members')
      .select('team_id')
      .eq('user_id', userId)
    return ((data ?? []) as Array<{ team_id: string }>).map((row) => String(row.team_id))
  }

  async listActiveFathomRoutesByTeamIds(supabase: SupabaseClient, teamIds: string[]) {
    if (teamIds.length === 0) return [] as Array<Record<string, unknown>>
    const { data } = await supabase
      .from('space_external_automation_triggers')
      .select('*')
      .eq('provider', 'fathom')
      .eq('status', 'active')
      .in('source->>team_id', teamIds)
    return (data ?? []) as Array<Record<string, unknown>>
  }
}
