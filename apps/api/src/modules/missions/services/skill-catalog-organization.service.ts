import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { DEFAULT_ROAS_AGENCY_AUTOMATION_FOLDER } from '../lib/skill-catalog.constants'

type Scope = { userId: string; orgId?: string | null }

function applyOwnerFilter<T extends { eq: Function; is: Function }>(
  query: T,
  scope: Scope,
): T {
  if (scope.orgId) {
    return query.eq('org_id', scope.orgId).is('user_id', null) as T
  }
  return query.eq('user_id', scope.userId).is('org_id', null) as T
}

function ownerInsert(scope: Scope): { org_id: string | null; user_id: string | null } {
  return scope.orgId
    ? { org_id: scope.orgId, user_id: null }
    : { org_id: null, user_id: scope.userId }
}

@Injectable()
export class SkillCatalogOrganizationService {
  async listFolders(supabase: SupabaseClient, scope: Scope) {
    let q = supabase
      .from('skill_folders')
      .select('id, name, parent_id, sort_order, org_id, user_id, created_at, updated_at')
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true })
    q = applyOwnerFilter(q, scope)
    const { data, error } = await q
    if (error) throw new Error(`Failed to list skill folders: ${error.message}`)
    return data ?? []
  }

  async createFolder(
    supabase: SupabaseClient,
    scope: Scope,
    input: { name: string; parent_id?: string | null; sort_order?: number },
  ) {
    const name = input.name.trim()
    if (!name) throw new Error('Folder name is required')
    const { data, error } = await supabase
      .from('skill_folders')
      .insert({
        ...ownerInsert(scope),
        name,
        parent_id: input.parent_id ?? null,
        sort_order: input.sort_order ?? 0,
      })
      .select('*')
      .single()
    if (error) throw new Error(`Failed to create skill folder: ${error.message}`)
    return data
  }

  async ensureDefaultAgencyFolder(supabase: SupabaseClient, scope: Scope) {
    const folders = await this.listFolders(supabase, scope)
    const existing = folders.find(
      (f) =>
        String(f.name).toLowerCase() === DEFAULT_ROAS_AGENCY_AUTOMATION_FOLDER.toLowerCase() &&
        !f.parent_id,
    )
    if (existing) return existing
    return this.createFolder(supabase, scope, { name: DEFAULT_ROAS_AGENCY_AUTOMATION_FOLDER })
  }

  async renameFolder(supabase: SupabaseClient, scope: Scope, folderId: string, name: string) {
    const trimmed = name.trim()
    if (!trimmed) throw new Error('Folder name is required')
    let q = supabase
      .from('skill_folders')
      .update({ name: trimmed, updated_at: new Date().toISOString() })
      .eq('id', folderId)
    q = applyOwnerFilter(q, scope)
    const { data, error } = await q.select('*').single()
    if (error) throw new Error(`Failed to rename skill folder: ${error.message}`)
    return data
  }

  async deleteFolder(supabase: SupabaseClient, scope: Scope, folderId: string) {
    let q = supabase.from('skill_folders').delete().eq('id', folderId)
    q = applyOwnerFilter(q, scope)
    const { error } = await q
    if (error) throw new Error(`Failed to delete skill folder: ${error.message}`)
    return { deleted: true }
  }

  async listFolderMemberships(supabase: SupabaseClient, scope: Scope) {
    let q = supabase
      .from('skill_folder_memberships')
      .select('id, folder_id, skill_key, org_id, user_id, created_at')
    q = applyOwnerFilter(q, scope)
    const { data, error } = await q
    if (error) throw new Error(`Failed to list folder memberships: ${error.message}`)
    return data ?? []
  }

  async setSkillFolder(
    supabase: SupabaseClient,
    scope: Scope,
    input: { skill_key: string; folder_id: string | null },
  ) {
    const skillKey = input.skill_key.trim()
    if (!skillKey) throw new Error('skill_key is required')

    let del = supabase.from('skill_folder_memberships').delete().eq('skill_key', skillKey)
    del = applyOwnerFilter(del, scope)
    const { error: delErr } = await del
    if (delErr) throw new Error(`Failed to clear skill folder: ${delErr.message}`)

    if (!input.folder_id) return { skill_key: skillKey, folder_id: null }

    const { data, error } = await supabase
      .from('skill_folder_memberships')
      .insert({
        ...ownerInsert(scope),
        folder_id: input.folder_id,
        skill_key: skillKey,
      })
      .select('*')
      .single()
    if (error) throw new Error(`Failed to set skill folder: ${error.message}`)
    return data
  }

  async listTags(supabase: SupabaseClient, scope: Scope) {
    let q = supabase
      .from('skill_tags')
      .select('id, name, org_id, user_id, created_at, updated_at')
      .order('name', { ascending: true })
    q = applyOwnerFilter(q, scope)
    const { data, error } = await q
    if (error) throw new Error(`Failed to list skill tags: ${error.message}`)
    return data ?? []
  }

  async createTag(supabase: SupabaseClient, scope: Scope, name: string) {
    const trimmed = name.trim()
    if (!trimmed) throw new Error('Tag name is required')
    const { data, error } = await supabase
      .from('skill_tags')
      .insert({ ...ownerInsert(scope), name: trimmed })
      .select('*')
      .single()
    if (error) throw new Error(`Failed to create skill tag: ${error.message}`)
    return data
  }

  async deleteTag(supabase: SupabaseClient, scope: Scope, tagId: string) {
    let q = supabase.from('skill_tags').delete().eq('id', tagId)
    q = applyOwnerFilter(q, scope)
    const { error } = await q
    if (error) throw new Error(`Failed to delete skill tag: ${error.message}`)
    return { deleted: true }
  }

  async listTagMemberships(supabase: SupabaseClient, scope: Scope) {
    let q = supabase
      .from('skill_tag_memberships')
      .select('id, tag_id, skill_key, org_id, user_id, created_at')
    q = applyOwnerFilter(q, scope)
    const { data, error } = await q
    if (error) throw new Error(`Failed to list tag memberships: ${error.message}`)
    return data ?? []
  }

  async setSkillTags(
    supabase: SupabaseClient,
    scope: Scope,
    input: { skill_key: string; tag_ids: string[] },
  ) {
    const skillKey = input.skill_key.trim()
    if (!skillKey) throw new Error('skill_key is required')
    const tagIds = [...new Set(input.tag_ids.filter(Boolean))]

    let del = supabase.from('skill_tag_memberships').delete().eq('skill_key', skillKey)
    del = applyOwnerFilter(del, scope)
    const { error: delErr } = await del
    if (delErr) throw new Error(`Failed to clear skill tags: ${delErr.message}`)

    if (tagIds.length === 0) return []

    const rows = tagIds.map((tag_id) => ({
      ...ownerInsert(scope),
      tag_id,
      skill_key: skillKey,
    }))
    const { data, error } = await supabase.from('skill_tag_memberships').insert(rows).select('*')
    if (error) throw new Error(`Failed to set skill tags: ${error.message}`)
    return data ?? []
  }

  async getOrganizationBundle(supabase: SupabaseClient, scope: Scope) {
    const [folders, folderMemberships, tags, tagMemberships] = await Promise.all([
      this.listFolders(supabase, scope),
      this.listFolderMemberships(supabase, scope),
      this.listTags(supabase, scope),
      this.listTagMemberships(supabase, scope),
    ])
    return { folders, folderMemberships, tags, tagMemberships }
  }

  /** Unique account/org skills for slash menus — any agent_key in scope, prefer `*`. */
  async listCatalogSkills(supabase: SupabaseClient, scope: Scope) {
    let q
    if (scope.orgId) {
      q = supabase
        .from('agent_skills')
        .select(
          'id, user_id, org_id, agent_key, skill_key, name, description, is_enabled, source, created_at, updated_at',
        )
        .or(`org_id.eq.${scope.orgId},org_id.is.null`)
        .is('user_id', null)
        .order('created_at', { ascending: true })
    } else {
      q = supabase
        .from('agent_skills')
        .select(
          'id, user_id, org_id, agent_key, skill_key, name, description, is_enabled, source, created_at, updated_at',
        )
        .or(`user_id.eq.${scope.userId},user_id.is.null`)
        .is('org_id', null)
        .order('created_at', { ascending: true })
    }
    const { data, error } = await q
    if (error) throw new Error(`Failed to list catalog skills: ${error.message}`)
    const seen = new Map<string, Record<string, unknown>>()
    for (const row of data ?? []) {
      const key = String(row.skill_key ?? '')
      if (!key || key.includes('/')) continue
      if (['vibey-api', 'awareness-evaluator', 'onboarding-discovery'].includes(key)) continue
      const existing = seen.get(key)
      if (!existing || (existing.agent_key !== '*' && row.agent_key === '*')) {
        seen.set(key, row as Record<string, unknown>)
      }
    }
    return [...seen.values()]
  }
}
