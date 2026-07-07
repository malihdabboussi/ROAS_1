#!/usr/bin/env tsx
/**
 * Seeds ROAS ad skills for ads_manager (Blaze) from docker template files.
 * Uploads PNG assets to the skill-assets bucket and upserts agent_skills +
 * agent_skill_resources. Idempotent.
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... pnpm tsx scripts/seed-roas-ad-skills.ts
 */
import { existsSync } from 'node:fs'
import { readdir, readFile } from 'node:fs/promises'
import * as path from 'node:path'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const REPO_ROOT = path.resolve(__dirname, '..')
const AGENT_KEY = 'ads_manager'
const SKILLS_DIR = path.join(REPO_ROOT, 'docker/agents/templates/ads_manager/skills')
const SKILL_KEYS = [
  'human-written-copy',
  'roas-ad-concepts',
  'roas-ad-copy',
  'roas-ad-kit',
  'roas-ad-design',
] as const

const IMAGE_EXT = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif'])

function getEnv(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`${name} is required`)
  return value
}

function parseSkillFrontmatter(markdown: string): { name: string; description: string } {
  const match = markdown.match(/^---\n([\s\S]*?)\n---/)
  if (!match) {
    const headingMatch = markdown.match(/^#\s+(.+)$/m)
    return { name: headingMatch ? headingMatch[1].trim() : 'Untitled', description: '' }
  }
  const yaml = match[1]
  const name = (yaml.match(/^name:\s*(.+)$/m)?.[1] ?? '').trim().replace(/^["']|["']$/g, '')
  const description = (yaml.match(/^description:\s*(.+)$/m)?.[1] ?? '')
    .trim()
    .replace(/^["']|["']$/g, '')
  return { name: name || 'Untitled', description }
}

function contentTypeForPath(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase()
  if (ext === '.py') return 'text/x-python'
  if (ext === '.md') return 'text/markdown'
  if (IMAGE_EXT.has(ext)) return ext === '.png' ? 'image/png' : `image/${ext.slice(1)}`
  return 'application/octet-stream'
}

async function walkResourceFiles(skillDir: string): Promise<Array<{ relPath: string; absPath: string }>> {
  const out: Array<{ relPath: string; absPath: string }> = []
  async function walk(dir: string, prefix: string): Promise<void> {
    if (!existsSync(dir)) return
    const entries = await readdir(dir, { withFileTypes: true })
    for (const entry of entries) {
      const absPath = path.join(dir, entry.name)
      const relPath = prefix ? `${prefix}/${entry.name}` : entry.name
      if (entry.isDirectory()) await walk(absPath, relPath)
      else out.push({ relPath, absPath })
    }
  }
  for (const sub of ['references', 'assets'] as const) {
    await walk(path.join(skillDir, sub), sub)
  }
  return out
}

async function uploadSkillAsset(
  supabase: SupabaseClient,
  supabaseUrl: string,
  skillKey: string,
  relPath: string,
  absPath: string,
): Promise<string> {
  const storagePath = `${AGENT_KEY}/${skillKey}/${relPath}`
  const contentType = contentTypeForPath(relPath)
  const fileBuffer = await readFile(absPath)
  const { error } = await supabase.storage.from('skill-assets').upload(storagePath, fileBuffer, {
    contentType,
    upsert: true,
  })
  if (error) throw new Error(`upload ${storagePath}: ${error.message}`)
  return `${supabaseUrl.replace(/\/+$/, '')}/storage/v1/object/public/skill-assets/${storagePath}`
}

async function upsertSkillResource(
  supabase: SupabaseClient,
  supabaseUrl: string,
  skillKey: string,
  relPath: string,
  absPath: string,
): Promise<void> {
  const ext = path.extname(relPath).toLowerCase()
  const isImage = IMAGE_EXT.has(ext)
  const contentType = contentTypeForPath(relPath)

  let content: string | null = null
  let storageUrl: string | null = null

  if (isImage) {
    storageUrl = await uploadSkillAsset(supabase, supabaseUrl, skillKey, relPath, absPath)
  } else {
    content = await readFile(absPath, 'utf-8')
  }

  const { data: existing } = await supabase
    .from('agent_skill_resources')
    .select('id')
    .eq('agent_key', AGENT_KEY)
    .eq('skill_key', skillKey)
    .eq('file_path', relPath)
    .is('user_id', null)
    .is('org_id', null)
    .maybeSingle()

  const row = {
    agent_key: AGENT_KEY,
    skill_key: skillKey,
    file_path: relPath,
    content,
    content_type: contentType,
    storage_url: storageUrl,
    user_id: null,
    org_id: null,
    updated_at: new Date().toISOString(),
  }

  if (existing?.id) {
    const { error } = await supabase.from('agent_skill_resources').update(row).eq('id', existing.id)
    if (error) throw new Error(`update resource ${skillKey}/${relPath}: ${error.message}`)
  } else {
    const { error } = await supabase.from('agent_skill_resources').insert(row)
    if (error) throw new Error(`insert resource ${skillKey}/${relPath}: ${error.message}`)
  }
}

async function upsertSkill(supabase: SupabaseClient, supabaseUrl: string, skillKey: string): Promise<void> {
  const skillDir = path.join(SKILLS_DIR, skillKey)
  const skillPath = path.join(skillDir, 'SKILL.md')
  if (!existsSync(skillPath)) throw new Error(`Missing ${skillPath}`)

  const markdown = await readFile(skillPath, 'utf-8')
  const { name, description } = parseSkillFrontmatter(markdown)

  const { data: existing } = await supabase
    .from('agent_skills')
    .select('id')
    .eq('agent_key', AGENT_KEY)
    .eq('skill_key', skillKey)
    .is('user_id', null)
    .is('org_id', null)
    .maybeSingle()

  const skillRow = {
    agent_key: AGENT_KEY,
    skill_key: skillKey,
    name,
    description,
    markdown_content: markdown,
    is_enabled: true,
    source: 'system',
    user_id: null,
    org_id: null,
    updated_at: new Date().toISOString(),
  }

  if (existing?.id) {
    const { error } = await supabase.from('agent_skills').update(skillRow).eq('id', existing.id)
    if (error) throw new Error(`update skill ${skillKey}: ${error.message}`)
  } else {
    const { error } = await supabase.from('agent_skills').insert(skillRow)
    if (error) throw new Error(`insert skill ${skillKey}: ${error.message}`)
  }

  const resources = await walkResourceFiles(skillDir)
  for (const { relPath, absPath } of resources) {
    await upsertSkillResource(supabase, supabaseUrl, skillKey, relPath, absPath)
  }
  console.log(`  ${skillKey}: ${resources.length} resources`)
}

async function updateAgentsRegistry(supabase: SupabaseClient): Promise<void> {
  const { data: row } = await supabase
    .from('agents_registry')
    .select('skills')
    .eq('agent_key', AGENT_KEY)
    .is('user_id', null)
    .is('org_id', null)
    .maybeSingle()

  const existing = Array.isArray(row?.skills)
    ? (row.skills as string[])
    : []

  const merged = [...new Set([...existing, ...SKILL_KEYS])]
  if (merged.length === existing.length && SKILL_KEYS.every((k) => existing.includes(k))) {
    return
  }

  const { error } = await supabase
    .from('agents_registry')
    .update({ skills: merged, updated_at: new Date().toISOString() })
    .eq('agent_key', AGENT_KEY)
    .is('user_id', null)
    .is('org_id', null)

  if (error) throw new Error(`update agents_registry skills: ${error.message}`)
}

async function main(): Promise<void> {
  if (!existsSync(SKILLS_DIR)) {
    throw new Error(`Skills directory not found: ${SKILLS_DIR}`)
  }

  const supabaseUrl = getEnv('SUPABASE_URL')
  const supabase = createClient(supabaseUrl, getEnv('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false },
  })

  console.log(`Seeding ROAS ad skills for ${AGENT_KEY}...`)
  for (const skillKey of SKILL_KEYS) {
    await upsertSkill(supabase, supabaseUrl, skillKey)
  }
  await updateAgentsRegistry(supabase)
  console.log('Done.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
