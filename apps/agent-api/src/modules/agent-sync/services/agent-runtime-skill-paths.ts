import * as path from 'path'

export interface RuntimeSkillFileRequirement {
  skillKey: string
  filePath: string
  kind: 'skill' | 'resource'
}

export interface RuntimeSkillPathRow {
  skill_key: string
}

export interface RuntimeSkillResourcePathRow {
  skill_key: string
  file_path: string
  content: string | null
  content_type?: string | null
  storage_url?: string | null
}

export function toSkillDirName(input: string): string {
  const normalized = input
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
  return normalized || 'skill'
}

export function toSafeSkillResourcePath(input: string): string {
  const trimmed = input.trim()
  if (!trimmed) throw new Error('Unsafe skill resource path: path is required')
  if (trimmed.includes('\0') || trimmed.includes('\\')) {
    throw new Error(`Unsafe skill resource path: ${input}`)
  }
  if (path.isAbsolute(trimmed)) {
    throw new Error(`Unsafe skill resource path: ${input}`)
  }

  const normalized = path.posix.normalize(trimmed)
  if (normalized === '.' || normalized === '..' || normalized.startsWith('../')) {
    throw new Error(`Unsafe skill resource path: ${input}`)
  }

  return normalized
}

export function toSkillImageReferencePath(input: string): string {
  return toSafeSkillResourcePath(input).replace(/\.[^/.]+$/, '') + '.md'
}

export function buildRuntimeSkillFileRequirements(
  skills: RuntimeSkillPathRow[],
  resources: RuntimeSkillResourcePathRow[],
): RuntimeSkillFileRequirement[] {
  const requirements: RuntimeSkillFileRequirement[] = []
  const seen = new Set<string>()

  for (const skill of skills) {
    const skillKey = skill.skill_key
    const filePath = path.join('skills', toSkillDirName(skillKey), 'SKILL.md')
    const key = `${skillKey}:skill:${filePath}`
    if (seen.has(key)) continue
    seen.add(key)
    requirements.push({ skillKey, filePath, kind: 'skill' })
  }

  const manifestSkillKeys = new Set<string>()
  for (const resource of resources) {
    if (!resource.content && !(resource.content_type && resource.storage_url)) continue
    const skillKey = resource.skill_key
    const isImage = resource.content_type && !resource.content_type.startsWith('text/')
    let resourceFileName: string
    try {
      resourceFileName =
        isImage && resource.storage_url
          ? toSkillImageReferencePath(resource.file_path)
          : toSafeSkillResourcePath(resource.file_path)
    } catch {
      continue
    }
    if (isImage && resource.storage_url && !manifestSkillKeys.has(skillKey)) {
      manifestSkillKeys.add(skillKey)
      const manifestFilePath = path.join(
        'skills',
        toSkillDirName(skillKey),
        'references',
        'images.json',
      )
      const manifestKey = `${skillKey}:resource:${manifestFilePath}`
      if (!seen.has(manifestKey)) {
        seen.add(manifestKey)
        requirements.push({ skillKey, filePath: manifestFilePath, kind: 'resource' })
      }
    }
    const filePath = path.join('skills', toSkillDirName(skillKey), resourceFileName)
    const key = `${skillKey}:resource:${filePath}`
    if (seen.has(key)) continue
    seen.add(key)
    requirements.push({ skillKey, filePath, kind: 'resource' })
  }

  return requirements
}
