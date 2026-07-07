import type {
  MissionAgent,
  MissionAgentSkill,
  MissionAgentSkillResource,
} from '@/features/mission-control/types'
import { formatSkillName } from '@/features/team/constants/team.constants'
import type { DraftResource, ResourceTreeNode } from './skills-page.types'

export function skillsLoadingLabel(skillsViewKey: 'all' | string, agents: MissionAgent[]): string {
  if (skillsViewKey === 'all') return 'Loading all skills'
  const agent = agents.find((a) => a.agent_key === skillsViewKey)
  const name = agent?.name?.trim() || skillsViewKey
  return `Loading ${name} skills`
}

export function formatSkillListDescription(description: string | null | undefined): string {
  const trimmed = description?.trim() ?? ''
  if (!trimmed) return ''
  const singleLine = trimmed.replace(/\s+/g, ' ')
  const dotIdx = singleLine.indexOf('.')
  if (dotIdx === -1) return singleLine
  return singleLine.slice(0, dotIdx + 1)
}

export function isOfficialSkill(skill: MissionAgentSkill): boolean {
  if (skill.source) return skill.source !== 'user'
  return skill.is_system === true
}

export function formatUpdatedAt(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  } catch {
    return '—'
  }
}

export function buildSkillMarkdown(skill: MissionAgentSkill): string {
  const title = formatSkillName(skill.name)
  const desc = skill.description?.trim() ?? ''
  const body = skill.markdown_content?.trim() ?? ''
  const lines = [`# ${title}`, '', `**Key:** \`${skill.skill_key}\``, '']
  if (desc) lines.push(desc, '')
  if (body) lines.push('---', '', body)
  return lines.join('\n')
}

export function safeSkillFilename(skillKey: string): string {
  const base = skillKey
    .replace(/[^a-zA-Z0-9-_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
  return base || 'skill'
}

export function isLikelyImageSkillResource(r: MissionAgentSkillResource): boolean {
  if (r.storage_url && r.content_type?.startsWith('image/')) return true
  if (!r.storage_url) return false
  return /\.(png|jpe?g|gif|webp|svg|avif)$/i.test(r.file_path)
}

export function toSkillKey(name: string): string {
  return (
    name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 64) || 'new-skill'
  )
}

export function parseSkillMdFrontmatter(raw: string): {
  name: string
  description: string
  markdown_content: string
} {
  const trimmed = raw.trim()
  if (!trimmed.startsWith('---')) return { name: '', description: '', markdown_content: trimmed }
  const endIdx = trimmed.indexOf('---', 3)
  if (endIdx === -1) return { name: '', description: '', markdown_content: trimmed }
  const frontmatter = trimmed.slice(3, endIdx)
  const body = trimmed.slice(endIdx + 3).trim()
  let name = ''
  let description = ''
  for (const line of frontmatter.split('\n')) {
    const colonIdx = line.indexOf(':')
    if (colonIdx === -1) continue
    const key = line.slice(0, colonIdx).trim()
    const val = line.slice(colonIdx + 1).trim()
    if (key === 'name') name = val
    else if (key === 'description') description = val
  }
  return { name, description, markdown_content: body }
}

export function buildDraftResourceTree(resources: DraftResource[]): ResourceTreeNode[] {
  const root: ResourceTreeNode[] = []
  for (const r of resources) {
    const parts = r.file_path.split('/')
    let current = root
    let pathSoFar = ''
    for (let i = 0; i < parts.length; i++) {
      const name = parts[i]!
      pathSoFar = pathSoFar ? `${pathSoFar}/${name}` : name
      const isLast = i === parts.length - 1
      if (isLast) {
        current.push({ name, path: r.file_path, resourceId: r.id, children: [] })
      } else {
        let folder = current.find((n) => n.name === name && !n.resourceId)
        if (!folder) {
          folder = { name, path: pathSoFar, children: [] }
          current.push(folder)
        }
        current = folder.children
      }
    }
  }
  return root
}

export function buildResourceTree(resources: MissionAgentSkillResource[]): ResourceTreeNode[] {
  const root: ResourceTreeNode[] = []
  for (const r of resources) {
    const parts = r.file_path.split('/')
    let current = root
    let pathSoFar = ''
    for (let i = 0; i < parts.length; i++) {
      const name = parts[i]!
      pathSoFar = pathSoFar ? `${pathSoFar}/${name}` : name
      const isLast = i === parts.length - 1
      if (isLast) {
        current.push({ name, path: r.file_path, resourceId: r.id, children: [] })
      } else {
        let folder = current.find((n) => n.name === name && !n.resourceId)
        if (!folder) {
          folder = { name, path: pathSoFar, children: [] }
          current.push(folder)
        }
        current = folder.children
      }
    }
  }
  return root
}

export function collectFolderPaths(resources: MissionAgentSkillResource[]): Set<string> {
  const paths = new Set<string>()
  for (const r of resources) {
    const parts = r.file_path.split('/')
    let pathSoFar = ''
    for (let i = 0; i < parts.length - 1; i++) {
      pathSoFar = pathSoFar ? `${pathSoFar}/${parts[i]}` : parts[i]!
      paths.add(pathSoFar)
    }
  }
  return paths
}

function isResourceTreeFolder(node: ResourceTreeNode): boolean {
  return !node.resourceId && node.children.length > 0
}

export function collectResourceTreeFolderPaths(nodes: ResourceTreeNode[]): string[] {
  const paths: string[] = []
  for (const node of nodes) {
    if (!isResourceTreeFolder(node)) continue
    paths.push(node.path)
    paths.push(...collectResourceTreeFolderPaths(node.children))
  }
  return paths
}

export function filterResourceTree(nodes: ResourceTreeNode[], query: string): ResourceTreeNode[] {
  const q = query.trim().toLowerCase()
  if (!q) return nodes

  const result: ResourceTreeNode[] = []
  for (const node of nodes) {
    if (isResourceTreeFolder(node)) {
      const filteredChildren = filterResourceTree(node.children, q)
      const folderMatches =
        node.name.toLowerCase().includes(q) || node.path.toLowerCase().includes(q)
      if (filteredChildren.length > 0) {
        result.push({ ...node, children: filteredChildren })
      } else if (folderMatches) {
        result.push(node)
      }
      continue
    }

    if (node.name.toLowerCase().includes(q) || node.path.toLowerCase().includes(q)) {
      result.push(node)
    }
  }
  return result
}

export function skillMdMatchesTreeSearch(query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return 'skill.md'.includes(q) || 'instructions'.includes(q)
}

export function expandFoldersForFilePath(filePath: string, prev: Set<string>): Set<string> {
  const next = new Set(prev)
  const parts = filePath.split('/')
  let pathSoFar = ''
  for (let i = 0; i < parts.length - 1; i++) {
    pathSoFar = pathSoFar ? `${pathSoFar}/${parts[i]}` : parts[i]!
    next.add(pathSoFar)
  }
  return next
}

export function isEditableSkillResource(resource: MissionAgentSkillResource): boolean {
  if (resource.storage_url) return false
  const path = resource.file_path.toLowerCase()
  return (
    path.endsWith('.md') ||
    path.endsWith('.txt') ||
    path.endsWith('.json') ||
    path.endsWith('.yaml') ||
    path.endsWith('.yml') ||
    (resource.content_type?.startsWith('text/') ?? false)
  )
}
