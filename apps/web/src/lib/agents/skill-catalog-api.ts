import { backendDelete, backendGet, backendPatch, backendPost } from '@/lib/api/backend-client'

export type SkillFolder = {
  id: string
  name: string
  parent_id: string | null
  sort_order: number
  org_id: string | null
  user_id: string | null
  created_at: string
  updated_at: string
}

export type SkillTag = {
  id: string
  name: string
  org_id: string | null
  user_id: string | null
  created_at: string
  updated_at: string
}

export type SkillFolderMembership = {
  id: string
  folder_id: string
  skill_key: string
  org_id: string | null
  user_id: string | null
}

export type SkillTagMembership = {
  id: string
  tag_id: string
  skill_key: string
  org_id: string | null
  user_id: string | null
}

export type SkillCatalogBundle = {
  folders: SkillFolder[]
  folderMemberships: SkillFolderMembership[]
  tags: SkillTag[]
  tagMemberships: SkillTagMembership[]
}

export async function fetchSkillCatalogBundle(): Promise<SkillCatalogBundle> {
  return backendGet<SkillCatalogBundle>('/api/agents/skill-catalog')
}

export async function createSkillFolder(name: string, parentId?: string | null) {
  return backendPost<SkillFolder>('/api/agents/skill-catalog/folders', {
    name,
    parent_id: parentId ?? null,
  })
}

export async function ensureDefaultAgencySkillFolder() {
  return backendPost<SkillFolder>('/api/agents/skill-catalog/folders/ensure-default', {})
}

export async function renameSkillFolder(folderId: string, name: string) {
  return backendPatch<SkillFolder>(`/api/agents/skill-catalog/folders/${folderId}`, { name })
}

export async function deleteSkillFolder(folderId: string) {
  return backendDelete(`/api/agents/skill-catalog/folders/${folderId}`)
}

export async function setSkillFolder(skillKey: string, folderId: string | null) {
  return backendPost('/api/agents/skill-catalog/folder-memberships', {
    skill_key: skillKey,
    folder_id: folderId,
  })
}

export async function createSkillTag(name: string) {
  return backendPost<SkillTag>('/api/agents/skill-catalog/tags', { name })
}

export async function deleteSkillTag(tagId: string) {
  return backendDelete(`/api/agents/skill-catalog/tags/${tagId}`)
}

export async function setSkillTags(skillKey: string, tagIds: string[]) {
  return backendPost('/api/agents/skill-catalog/tag-memberships', {
    skill_key: skillKey,
    tag_ids: tagIds,
  })
}
