#!/usr/bin/env tsx
/**
 * scripts/seed-system-agents.ts
 *
 * Engineering-only seeder for system agents (atlas, vibey, hr, viktor).
 *
 * Reads source-of-truth markdown from `docker/agents/templates/...` and
 * `docker/agents/vibey/` and upserts them into the canonical (NULL,NULL)
 * system rows in `agent_definitions`, `agent_skills`, and
 * `agent_skill_resources`.
 *
 * Idempotent — running it N times leaves N=1 rows. Uses partial unique
 * indexes (`agent_*_system_unique`) so each (agent_key, ...) gets a single
 * canonical row.
 *
 * Run as Supabase service role; bypasses the user-write RLS deny policies
 * so it is the *only* path that can write system rows.
 *
 * Usage:
 *   SUPABASE_URL=...  SUPABASE_SERVICE_ROLE_KEY=...  pnpm seed:system-agents
 */
import { existsSync } from 'node:fs'
import { readdir, readFile } from 'node:fs/promises'
import * as path from 'node:path'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

interface SystemAgentSource {
  agentKey: string
  templateDir: string
}

const REPO_ROOT = path.resolve(__dirname, '..')

/**
 * Maps each system agent to the directory containing its definition files
 * and `skills/` subfolder. The `brain_scholar` template directory is the
 * source for `atlas`; the `widget_builder` template directory is the source
 * for `viktor`. Vibey ships from `docker/agents/vibey/`. HR currently ships
 * inline content from the catalog seeder; once a template dir exists this
 * loader will pick it up automatically.
 */
const SYSTEM_AGENT_SOURCES: SystemAgentSource[] = [
  { agentKey: 'atlas', templateDir: 'docker/agents/templates/brain_scholar' },
  { agentKey: 'vibey', templateDir: 'docker/agents/vibey' },
  { agentKey: 'hr', templateDir: 'docker/agents/templates/hr' },
  { agentKey: 'viktor', templateDir: 'docker/agents/templates/widget_builder' },
]

const DEFINITION_FILES = ['AGENTS.md', 'IDENTITY.md', 'ROLE.md', 'SOUL.md', 'TOOLS.md']

function getEnv(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`${name} is required`)
  return value
}

async function readIfExists(filePath: string): Promise<string | null> {
  if (!existsSync(filePath)) return null
  return readFile(filePath, 'utf-8')
}

async function upsertDefinitions(
  supabase: SupabaseClient,
  agentKey: string,
  dir: string,
): Promise<number> {
  let synced = 0
  for (const fileName of DEFINITION_FILES) {
    const content = await readIfExists(path.join(dir, fileName))
    if (content === null) continue
    const { data: existing } = await supabase
      .from('agent_definitions')
      .select('id')
      .eq('agent_key', agentKey)
      .eq('file_name', fileName)
      .is('user_id', null)
      .is('org_id', null)
      .maybeSingle()

    if (existing?.id) {
      const { error } = await supabase
        .from('agent_definitions')
        .update({ content, updated_at: new Date().toISOString() })
        .eq('id', existing.id)
      if (error) throw new Error(`update ${agentKey}/${fileName}: ${error.message}`)
    } else {
      const { error } = await supabase.from('agent_definitions').insert({
        agent_key: agentKey,
        file_name: fileName,
        content,
        source: 'system',
        user_id: null,
        org_id: null,
      })
      if (error) throw new Error(`insert ${agentKey}/${fileName}: ${error.message}`)
    }
    synced++
  }
  return synced
}

async function upsertSkill(
  supabase: SupabaseClient,
  agentKey: string,
  skillDir: string,
): Promise<{ skillKey: string; resources: number } | null> {
  const skillKey = path.basename(skillDir)
  const skillPath = path.join(skillDir, 'SKILL.md')
  const content = await readIfExists(skillPath)
  if (!content) return null

  const { name, description } = parseSkillFrontmatter(content)

  const { data: existing } = await supabase
    .from('agent_skills')
    .select('id')
    .eq('agent_key', agentKey)
    .eq('skill_key', skillKey)
    .is('user_id', null)
    .is('org_id', null)
    .maybeSingle()

  if (existing?.id) {
    const { error } = await supabase
      .from('agent_skills')
      .update({
        name,
        description,
        markdown_content: content,
        is_enabled: true,
        source: 'system',
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
    if (error) throw new Error(`update skill ${agentKey}/${skillKey}: ${error.message}`)
  } else {
    const { error } = await supabase.from('agent_skills').insert({
      agent_key: agentKey,
      skill_key: skillKey,
      name,
      description,
      markdown_content: content,
      is_enabled: true,
      source: 'system',
      user_id: null,
      org_id: null,
    })
    if (error) throw new Error(`insert skill ${agentKey}/${skillKey}: ${error.message}`)
  }

  let resources = 0
  const referencesDir = path.join(skillDir, 'references')
  if (existsSync(referencesDir)) {
    const refs = await readdir(referencesDir, { withFileTypes: true })
    for (const entry of refs) {
      if (!entry.isFile()) continue
      const refContent = await readFile(path.join(referencesDir, entry.name), 'utf-8')
      const filePath = `references/${entry.name}`
      const { data: existingRef } = await supabase
        .from('agent_skill_resources')
        .select('id')
        .eq('agent_key', agentKey)
        .eq('skill_key', skillKey)
        .eq('file_path', filePath)
        .is('user_id', null)
        .is('org_id', null)
        .maybeSingle()
      if (existingRef?.id) {
        const { error } = await supabase
          .from('agent_skill_resources')
          .update({
            content: refContent,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingRef.id)
        if (error)
          throw new Error(`update resource ${agentKey}/${skillKey}/${filePath}: ${error.message}`)
      } else {
        const { error } = await supabase.from('agent_skill_resources').insert({
          agent_key: agentKey,
          skill_key: skillKey,
          file_path: filePath,
          content: refContent,
          content_type: 'text/markdown',
          user_id: null,
          org_id: null,
        })
        if (error)
          throw new Error(`insert resource ${agentKey}/${skillKey}/${filePath}: ${error.message}`)
      }
      resources++
    }
  }

  return { skillKey, resources }
}

function parseSkillFrontmatter(markdown: string): { name: string; description: string } {
  const match = markdown.match(/^---\n([\s\S]*?)\n---/)
  if (!match) {
    const headingMatch = markdown.match(/^#\s+(.+)$/m)
    return {
      name: headingMatch ? headingMatch[1].trim() : 'Untitled',
      description: '',
    }
  }
  const yaml = match[1]
  const name = (yaml.match(/^name:\s*(.+)$/m)?.[1] ?? '').trim().replace(/^["']|["']$/g, '')
  const description = (yaml.match(/^description:\s*(.+)$/m)?.[1] ?? '')
    .trim()
    .replace(/^["']|["']$/g, '')
  return {
    name: name || 'Untitled',
    description,
  }
}

async function seedAgent(supabase: SupabaseClient, source: SystemAgentSource): Promise<void> {
  const dir = path.join(REPO_ROOT, source.templateDir)
  if (!existsSync(dir)) {
    console.log(`[seed:${source.agentKey}] skipping — directory not found: ${dir}`)
    return
  }

  console.log(`[seed:${source.agentKey}] syncing from ${source.templateDir}`)

  const definitions = await upsertDefinitions(supabase, source.agentKey, dir)
  console.log(`  definitions: ${definitions}`)

  const skillsDir = path.join(dir, 'skills')
  if (!existsSync(skillsDir)) {
    console.log(`  skills: 0 (no skills/ dir)`)
    return
  }

  const skillEntries = await readdir(skillsDir, { withFileTypes: true })
  let skillCount = 0
  let resourceCount = 0
  for (const entry of skillEntries) {
    if (!entry.isDirectory()) continue
    const result = await upsertSkill(supabase, source.agentKey, path.join(skillsDir, entry.name))
    if (result) {
      skillCount++
      resourceCount += result.resources
    }
  }
  console.log(`  skills: ${skillCount}, resources: ${resourceCount}`)
}

async function main(): Promise<void> {
  const supabase = createClient(getEnv('SUPABASE_URL'), getEnv('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false },
  })

  console.log('Seeding system agents from docker/agents/...')
  for (const source of SYSTEM_AGENT_SOURCES) {
    await seedAgent(supabase, source)
  }
  console.log('Done.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
