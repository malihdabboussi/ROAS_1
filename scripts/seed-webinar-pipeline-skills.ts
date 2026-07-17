#!/usr/bin/env tsx
/**
 * Seeds webinar Phase B/C pipeline skills into skill_library + template
 * assignments, and uploads binary assets (PNG/TTF) to skill-assets.
 *
 * Usage:
 *   set -a && source scripts/roas/roas-secrets.env && set +a
 *   pnpm tsx scripts/seed-webinar-pipeline-skills.ts
 */
import { existsSync } from 'node:fs'
import { readdir, readFile } from 'node:fs/promises'
import * as path from 'node:path'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const REPO_ROOT = path.resolve(__dirname, '..')

const BINARY_EXT = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.webp',
  '.gif',
  '.ttf',
  '.otf',
  '.woff',
  '.woff2',
])

type SkillSeed = {
  skillKey: string
  templateKeys: string[]
  diskAgent: string
  category: string
}

const SKILLS: SkillSeed[] = [
  {
    skillKey: 'roas-market-research',
    templateKeys: ['ads_manager', 'strategist'],
    diskAgent: 'ads_manager',
    category: 'agency_research',
  },
  {
    skillKey: 'roas-ad-kit',
    templateKeys: ['ads_manager'],
    diskAgent: 'ads_manager',
    category: 'agency_ads',
  },
  {
    skillKey: 'roas-ad-design',
    templateKeys: ['ads_manager'],
    diskAgent: 'ads_manager',
    category: 'agency_ads',
  },
  {
    skillKey: 'roas-webinar-audit',
    templateKeys: ['ads_manager'],
    diskAgent: 'ads_manager',
    category: 'agency_ads',
  },
  {
    skillKey: 'roas-webinar-copy-package',
    templateKeys: ['copywriter'],
    diskAgent: 'copywriter',
    category: 'agency_copy',
  },
  {
    skillKey: 'roas-webinar-emails',
    templateKeys: ['copywriter'],
    diskAgent: 'copywriter',
    category: 'agency_copy',
  },
  {
    skillKey: 'roas-webinar-topics',
    templateKeys: ['copywriter'],
    diskAgent: 'copywriter',
    category: 'agency_copy',
  },
  {
    skillKey: 'roas-landing-page-copy',
    templateKeys: ['copywriter'],
    diskAgent: 'copywriter',
    category: 'agency_copy',
  },
  {
    skillKey: 'roas-video-ad-scripts',
    templateKeys: ['copywriter'],
    diskAgent: 'copywriter',
    category: 'agency_copy',
  },
  {
    skillKey: 'roas-image-brief',
    templateKeys: ['designer'],
    diskAgent: 'designer',
    category: 'agency_design',
  },
  {
    skillKey: 'roas-funnel-design',
    templateKeys: ['designer'],
    diskAgent: 'designer',
    category: 'agency_design',
  },
  {
    skillKey: 'roas-webinar-deck',
    templateKeys: ['designer'],
    diskAgent: 'designer',
    category: 'agency_design',
  },
  {
    skillKey: 'instagram-carousel-design',
    templateKeys: ['designer'],
    diskAgent: 'designer',
    category: 'agency_design',
  },
]

const EXTRA_ASSIGNMENTS = [{ templateKey: 'copywriter', skillKey: 'dylans-super-voice' }] as const

function getEnv(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`${name} is required`)
  return value
}

function parseSkillFrontmatter(markdown: string): {
  name: string
  description: string
  body: string
} {
  const match = markdown.match(/^---\n([\s\S]*?)\n---\n?/)
  if (!match) {
    return { name: 'Untitled', description: '', body: markdown.trim() }
  }
  const yaml = match[1]
  const name = (yaml.match(/^name:\s*(.+)$/m)?.[1] ?? '').trim().replace(/^["']|["']$/g, '')
  const description = (yaml.match(/^description:\s*(.+)$/m)?.[1] ?? '')
    .trim()
    .replace(/^["']|["']$/g, '')
  return { name: name || 'Untitled', description, body: markdown.slice(match[0].length).trim() }
}

function contentTypeForPath(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase()
  if (ext === '.py') return 'text/x-python'
  if (ext === '.md') return 'text/markdown'
  if (ext === '.json') return 'application/json'
  if (ext === '.ttf') return 'font/ttf'
  if (ext === '.otf') return 'font/otf'
  if (ext === '.png') return 'image/png'
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg'
  if (ext === '.webp') return 'image/webp'
  if (ext === '.gif') return 'image/gif'
  return 'application/octet-stream'
}

async function walkResourceFiles(
  skillDir: string,
): Promise<Array<{ relPath: string; absPath: string }>> {
  const out: Array<{ relPath: string; absPath: string }> = []
  async function walk(dir: string, prefix: string): Promise<void> {
    if (!existsSync(dir)) return
    for (const entry of await readdir(dir, { withFileTypes: true })) {
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
  const bytes = await readFile(absPath)
  const objectPath = `system/${skillKey}/${relPath}`
  const contentType = contentTypeForPath(relPath)
  const { error } = await supabase.storage.from('skill-assets').upload(objectPath, bytes, {
    contentType,
    upsert: true,
  })
  if (error) throw new Error(`upload ${objectPath}: ${error.message}`)
  return `${supabaseUrl.replace(/\/$/, '')}/storage/v1/object/public/skill-assets/${objectPath}`
}

async function upsertSkill(supabase: SupabaseClient, supabaseUrl: string, skill: SkillSeed) {
  const skillDir = path.join(
    REPO_ROOT,
    'docker/agents/templates',
    skill.diskAgent,
    'skills',
    skill.skillKey,
  )
  const markdown = await readFile(path.join(skillDir, 'SKILL.md'), 'utf-8')
  const { name, description, body } = parseSkillFrontmatter(markdown)
  const display = name
    .split('-')
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(' ')

  const { error } = await supabase.from('skill_library').upsert(
    {
      skill_key: skill.skillKey,
      name: display,
      description,
      markdown_content: body,
      category: skill.category,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'skill_key' },
  )
  if (error) throw new Error(`skill_library ${skill.skillKey}: ${error.message}`)

  for (const { relPath, absPath } of await walkResourceFiles(skillDir)) {
    const ext = path.extname(relPath).toLowerCase()
    const isBinary = BINARY_EXT.has(ext)
    const contentType = contentTypeForPath(relPath)

    if (isBinary) {
      const storageUrl = await uploadSkillAsset(
        supabase,
        supabaseUrl,
        skill.skillKey,
        relPath,
        absPath,
      )
      for (const agentKey of skill.templateKeys) {
        const { data: existing } = await supabase
          .from('agent_skill_resources')
          .select('id')
          .eq('agent_key', agentKey)
          .eq('skill_key', skill.skillKey)
          .eq('file_path', relPath)
          .is('user_id', null)
          .is('org_id', null)
          .maybeSingle()
        const row = {
          agent_key: agentKey,
          skill_key: skill.skillKey,
          file_path: relPath,
          content: null as string | null,
          content_type: contentType,
          storage_url: storageUrl,
          user_id: null,
          org_id: null,
          updated_at: new Date().toISOString(),
        }
        if (existing?.id) {
          const { error: uErr } = await supabase
            .from('agent_skill_resources')
            .update(row)
            .eq('id', existing.id)
          if (uErr) throw new Error(`update binary ${agentKey}/${relPath}: ${uErr.message}`)
        } else {
          const { error: iErr } = await supabase.from('agent_skill_resources').insert(row)
          if (iErr) throw new Error(`insert binary ${agentKey}/${relPath}: ${iErr.message}`)
        }
      }
      continue
    }

    const content = await readFile(absPath, 'utf-8')
    const { error: resError } = await supabase.from('skill_library_resources').upsert(
      {
        skill_key: skill.skillKey,
        file_path: relPath,
        content,
        content_type: contentType,
      },
      { onConflict: 'skill_key,file_path' },
    )
    if (resError)
      throw new Error(`library resource ${skill.skillKey}/${relPath}: ${resError.message}`)
  }

  for (const templateKey of skill.templateKeys) {
    const { error: aErr } = await supabase
      .from('template_skill_assignments')
      .upsert(
        { template_key: templateKey, skill_key: skill.skillKey, is_enabled: true },
        { onConflict: 'template_key,skill_key' },
      )
    if (aErr) throw new Error(`assignment ${templateKey}/${skill.skillKey}: ${aErr.message}`)

    const { error: sErr } = await supabase.from('agent_skills').upsert(
      {
        user_id: null,
        org_id: null,
        agent_key: templateKey,
        skill_key: skill.skillKey,
        name: display,
        description,
        markdown_content: body,
        is_enabled: true,
        source: 'system',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'agent_key,skill_key' },
    )
    if (sErr) {
      // Partial unique index may require select-then-update path
      const { data: existing } = await supabase
        .from('agent_skills')
        .select('id')
        .eq('agent_key', templateKey)
        .eq('skill_key', skill.skillKey)
        .is('user_id', null)
        .is('org_id', null)
        .maybeSingle()
      if (existing?.id) {
        const { error: uErr } = await supabase
          .from('agent_skills')
          .update({
            name: display,
            description,
            markdown_content: body,
            is_enabled: true,
            source: 'system',
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id)
        if (uErr)
          throw new Error(`update agent_skills ${templateKey}/${skill.skillKey}: ${uErr.message}`)
      } else {
        throw new Error(`agent_skills ${templateKey}/${skill.skillKey}: ${sErr.message}`)
      }
    }

    // Mirror text resources
    const { data: libRes } = await supabase
      .from('skill_library_resources')
      .select('file_path, content, content_type')
      .eq('skill_key', skill.skillKey)
    for (const r of libRes ?? []) {
      const { data: existing } = await supabase
        .from('agent_skill_resources')
        .select('id')
        .eq('agent_key', templateKey)
        .eq('skill_key', skill.skillKey)
        .eq('file_path', r.file_path)
        .is('user_id', null)
        .is('org_id', null)
        .maybeSingle()
      const row = {
        agent_key: templateKey,
        skill_key: skill.skillKey,
        file_path: r.file_path,
        content: r.content,
        content_type: r.content_type,
        storage_url: null as string | null,
        user_id: null,
        org_id: null,
        updated_at: new Date().toISOString(),
      }
      if (existing?.id) {
        const { error: uErr } = await supabase
          .from('agent_skill_resources')
          .update(row)
          .eq('id', existing.id)
        if (uErr) throw new Error(`mirror resource update: ${uErr.message}`)
      } else {
        const { error: iErr } = await supabase.from('agent_skill_resources').insert(row)
        if (iErr) throw new Error(`mirror resource insert: ${iErr.message}`)
      }
    }
  }

  console.log(`  ok ${skill.skillKey} → ${skill.templateKeys.join(',')}`)
}

async function main() {
  const supabaseUrl = getEnv('SUPABASE_URL')
  const serviceKey = getEnv('SUPABASE_SERVICE_ROLE_KEY')
  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  console.log('Seeding webinar pipeline skills…')
  for (const skill of SKILLS) {
    await upsertSkill(supabase, supabaseUrl, skill)
  }
  for (const extra of EXTRA_ASSIGNMENTS) {
    const { error } = await supabase
      .from('template_skill_assignments')
      .upsert(
        { template_key: extra.templateKey, skill_key: extra.skillKey, is_enabled: true },
        { onConflict: 'template_key,skill_key' },
      )
    if (error) throw new Error(`extra assignment: ${error.message}`)
    console.log(`  assigned ${extra.skillKey} → ${extra.templateKey}`)
  }
  console.log('Done. Webinar pipeline skill set is complete.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
