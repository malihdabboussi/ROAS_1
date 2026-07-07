'use client'

import { backendFetch, backendGet, backendPatch, backendPost } from '@/lib/api/backend-client'
import type { AuthConfig, AuthUser, TableInfo } from '../types'

export type SupabaseConnectionStatus = {
  connected: boolean
  status: string | null
  connectedAt: string | null
}

export type SupabaseOrg = {
  id: string
  name: string
  billing_email?: string
}

export type SupabaseProjectSummary = {
  id: string
  organization_id: string
  name: string
  region: string
  created_at: string
  status: string
}

export type ProvisionResult = {
  ref: string
  name: string
  region: string
  api_url: string
  anon_key: string | null
  service_role_key: string | null
}

export async function getSupabaseStatus(): Promise<SupabaseConnectionStatus> {
  const res = await backendGet<{ success: boolean } & SupabaseConnectionStatus>(
    '/api/integrations/supabase/status',
  )
  return { connected: res.connected, status: res.status, connectedAt: res.connectedAt }
}

export async function connectSupabase(redirectTo: string): Promise<string> {
  const res = await backendPost<{ success: boolean; authorizeUrl: string }>(
    '/api/integrations/supabase/connect',
    { redirectTo },
  )
  return res.authorizeUrl
}

export async function disconnectSupabase(): Promise<void> {
  await backendPost('/api/integrations/supabase/disconnect', {})
}

export async function listSupabaseOrganizations(): Promise<SupabaseOrg[]> {
  const res = await backendGet<{ success: boolean; organizations: SupabaseOrg[] }>(
    '/api/integrations/supabase/organizations',
  )
  return res.organizations ?? []
}

export async function listSupabaseProjects(): Promise<SupabaseProjectSummary[]> {
  const res = await backendGet<{ success: boolean; projects: SupabaseProjectSummary[] }>(
    '/api/integrations/supabase/projects',
  )
  return res.projects ?? []
}

export async function provisionSupabaseProject(params: {
  organization_id: string
  name: string
  region: string
  db_pass: string
  vibey_project_id: string
}): Promise<ProvisionResult> {
  const res = await backendPost<{ success: boolean; supabase_project: ProvisionResult }>(
    '/api/integrations/supabase/provision',
    params,
  )
  return res.supabase_project
}

export async function linkExistingSupabaseProject(params: {
  supabase_project_ref: string
  vibey_project_id: string
}): Promise<ProvisionResult> {
  const res = await backendPost<{ success: boolean; supabase_project: ProvisionResult }>(
    '/api/integrations/supabase/link-existing',
    params,
  )
  return res.supabase_project
}

// ── Database browser ──

export async function listTables(projectRef: string): Promise<TableInfo[]> {
  const res = await backendGet<{ success: boolean; tables: TableInfo[] }>(
    `/api/integrations/supabase/database/tables?projectRef=${encodeURIComponent(projectRef)}`,
  )
  return res.tables ?? []
}

export async function fetchTableRows(
  projectRef: string,
  table: string,
  offset = 0,
  limit = 50,
): Promise<{ rows: Record<string, unknown>[]; totalCount: number }> {
  const params = new URLSearchParams({
    projectRef,
    offset: String(offset),
    limit: String(limit),
  })
  const res = await backendGet<{
    success: boolean
    rows: Record<string, unknown>[]
    totalCount: number
  }>(`/api/integrations/supabase/database/tables/${encodeURIComponent(table)}/rows?${params}`)
  return { rows: res.rows ?? [], totalCount: res.totalCount ?? 0 }
}

export async function insertRow(
  projectRef: string,
  table: string,
  data: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const res = await backendPost<{ success: boolean; row: Record<string, unknown> }>(
    `/api/integrations/supabase/database/tables/${encodeURIComponent(table)}/rows?projectRef=${encodeURIComponent(projectRef)}`,
    { data },
  )
  return res.row
}

export async function updateRow(
  projectRef: string,
  table: string,
  primaryKeys: Record<string, unknown>,
  data: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const res = await backendPatch<{ success: boolean; row: Record<string, unknown> }>(
    `/api/integrations/supabase/database/tables/${encodeURIComponent(table)}/rows?projectRef=${encodeURIComponent(projectRef)}`,
    { primaryKeys, data },
  )
  return res.row
}

export async function deleteRow(
  projectRef: string,
  table: string,
  primaryKeys: Record<string, unknown>,
): Promise<void> {
  const res = await backendFetch(
    `/api/integrations/supabase/database/tables/${encodeURIComponent(table)}/rows?projectRef=${encodeURIComponent(projectRef)}`,
    {
      method: 'DELETE',
      body: JSON.stringify({ primaryKeys }),
      headers: { 'Content-Type': 'application/json' },
    },
  )
  if (!res.ok) throw new Error(`Delete failed: ${res.status}`)
}

// ── Auth Management ──

export async function listAuthUsers(
  projectRef: string,
  page = 1,
  perPage = 50,
): Promise<{ users: AuthUser[]; total: number }> {
  const params = new URLSearchParams({
    projectRef,
    page: String(page),
    perPage: String(perPage),
  })
  const res = await backendGet<{ success: boolean; users: AuthUser[]; total: number }>(
    `/api/integrations/supabase/auth/users?${params}`,
  )
  return { users: res.users ?? [], total: res.total ?? 0 }
}

export async function createAuthUser(
  projectRef: string,
  params: { email?: string; phone?: string; password?: string; email_confirm?: boolean },
): Promise<AuthUser> {
  const res = await backendPost<{ success: boolean; user: AuthUser }>(
    `/api/integrations/supabase/auth/users?projectRef=${encodeURIComponent(projectRef)}`,
    params,
  )
  return res.user
}

export async function updateAuthUser(
  projectRef: string,
  authUserId: string,
  params: { email?: string; ban_duration?: string; user_metadata?: Record<string, unknown> },
): Promise<AuthUser> {
  const res = await backendPatch<{ success: boolean; user: AuthUser }>(
    `/api/integrations/supabase/auth/users/${encodeURIComponent(authUserId)}?projectRef=${encodeURIComponent(projectRef)}`,
    params,
  )
  return res.user
}

export async function deleteAuthUser(projectRef: string, authUserId: string): Promise<void> {
  const res = await backendFetch(
    `/api/integrations/supabase/auth/users/${encodeURIComponent(authUserId)}?projectRef=${encodeURIComponent(projectRef)}`,
    { method: 'DELETE' },
  )
  if (!res.ok) throw new Error(`Delete failed: ${res.status}`)
}

export async function getAuthConfig(projectRef: string): Promise<AuthConfig> {
  const res = await backendGet<{ success: boolean; config: AuthConfig }>(
    `/api/integrations/supabase/auth/config?projectRef=${encodeURIComponent(projectRef)}`,
  )
  return res.config
}

export async function updateAuthConfig(
  projectRef: string,
  config: Partial<AuthConfig>,
): Promise<AuthConfig> {
  const res = await backendPatch<{ success: boolean; config: AuthConfig }>(
    `/api/integrations/supabase/auth/config?projectRef=${encodeURIComponent(projectRef)}`,
    config,
  )
  return res.config
}
