import type { MissionAgentSkillResource } from '@/features/mission-control/types'

export type SkillResourceTreeDndZone = 'before' | 'after' | 'into'

export function skillResourceDndId(resourceId: string): string {
  return `res__${resourceId}`
}

export function skillFolderDndId(folderPath: string): string {
  return `folder__${folderPath}`
}

export function parseSkillResourceDragId(
  id: string,
): { kind: 'resource'; resourceId: string } | null {
  if (!id.startsWith('res__')) return null
  return { kind: 'resource', resourceId: id.slice(5) }
}

function basename(filePath: string): string {
  const parts = filePath.split('/')
  return parts[parts.length - 1] ?? filePath
}

function dirname(filePath: string): string {
  const idx = filePath.lastIndexOf('/')
  if (idx < 0) return ''
  return filePath.slice(0, idx)
}

function joinPath(dir: string, file: string): string {
  if (!dir) return file
  return `${dir}/${file}`
}

export function buildSkillResourceMovePath(
  resources: MissionAgentSkillResource[],
  activeResourceId: string,
  overNodeId: string,
  zone: SkillResourceTreeDndZone,
): { ok: true; newPath: string; expandFolderPath?: string } | { ok: false; reason: string } {
  const active = resources.find((r) => r.id === activeResourceId)
  if (!active) return { ok: false, reason: 'not-found' }

  const fileName = basename(active.file_path)
  let targetDir = ''
  let expandFolderPath: string | undefined

  if (overNodeId.startsWith('folder__')) {
    const folderPath = overNodeId.slice(8)
    if (zone === 'into') {
      targetDir = folderPath
      expandFolderPath = folderPath
    } else {
      targetDir = dirname(folderPath)
    }
  } else if (overNodeId.startsWith('res__')) {
    if (zone === 'into') return { ok: false, reason: 'into-file' }
    const overResourceId = overNodeId.slice(5)
    const over = resources.find((r) => r.id === overResourceId)
    if (!over) return { ok: false, reason: 'not-found' }
    targetDir = dirname(over.file_path)
  } else {
    return { ok: false, reason: 'invalid-target' }
  }

  const newPath = joinPath(targetDir, fileName)
  if (newPath === active.file_path) return { ok: false, reason: 'same-path' }
  if (resources.some((r) => r.id !== active.id && r.file_path === newPath)) {
    return { ok: false, reason: 'path-conflict' }
  }

  return { ok: true, newPath, expandFolderPath }
}

export function getSkillResourceDndErrorMessage(reason: string): string {
  switch (reason) {
    case 'path-conflict':
      return 'A file already exists at that location'
    case 'into-file':
      return 'Drop onto a folder to move into it'
    case 'same-path':
      return 'File is already there'
    default:
      return 'Cannot move file here'
  }
}
