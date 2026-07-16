#!/usr/bin/env tsx
/**
 * Seeds Agency Strategist template + ROAS strategy skills into skill_library.
 * Targets ROAS production by default (lhfgtsjetcardinpgouq via env).
 *
 * Usage:
 *   set -a && source scripts/roas/roas-secrets.env && set +a
 *   pnpm tsx scripts/seed-strategist-skills.ts
 *   pnpm tsx scripts/seed-strategist-skills.ts --hire-test
 */
import { existsSync } from 'node:fs'
import { readdir, readFile } from 'node:fs/promises'
import * as path from 'node:path'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const REPO_ROOT = path.resolve(__dirname, '..')
const TEMPLATE_KEY = 'strategist'
const TEMPLATE_DIR = path.join(REPO_ROOT, 'docker/agents/templates/strategist')
const SKILLS_DIR = path.join(TEMPLATE_DIR, 'skills')
const SKILL_KEYS = [
  'auto-skill-1-roas-precall-strategy',
  'auto-skill-2-roas-strategy-adjust',
  'auto-skill-3-roas-launch-brief',
  'roas-market-research',
  'dylans-super-voice',
] as const

const TEST_EMAIL = 'test@gmail.com'
const DEFINITION_FILES = ['AGENTS.md', 'IDENTITY.md', 'ROLE.md', 'SOUL.md', 'TOOLS.md'] as const

function getEnv(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`${name} is required`)
  return value
}

function parseSkillFrontmatter(markdown: string): { name: string; description: string; body: string } {
  const match = markdown.match(/^---\n([\s\S]*?)\n---\n?/)
  if (!match) {
    const headingMatch = markdown.match(/^#\s+(.+)$/m)
    return {
      name: headingMatch ? headingMatch[1].trim() : 'Untitled',
      description: '',
      body: markdown.trim(),
    }
  }
  const yaml = match[1]
  const name = (yaml.match(/^name:\s*(.+)$/m)?.[1] ?? '').trim().replace(/^["']|["']$/g, '')
  const description = (yaml.match(/^description:\s*(.+)$/m)?.[1] ?? '')
    .trim()
    .replace(/^["']|["']$/g, '')
  const body = markdown.slice(match[0].length).trim()
  return { name: name || 'Untitled', description, body }
}

function contentTypeForPath(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase()
  if (ext === '.md') return 'text/markdown'
  if (ext === '.py') return 'text/x-python'
  return 'text/plain'
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

async function upsertLibrarySkill(supabase: SupabaseClient, skillKey: string): Promise<void> {
  const skillDir = path.join(SKILLS_DIR, skillKey)
  const skillPath = path.join(skillDir, 'SKILL.md')
  if (!existsSync(skillPath)) throw new Error(`Missing ${skillPath}`)

  const markdown = await readFile(skillPath, 'utf-8')
  const { name, description, body } = parseSkillFrontmatter(markdown)
  const displayName = name
    .split('-')
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(' ')

  const { error } = await supabase.from('skill_library').upsert(
    {
      skill_key: skillKey,
      name: displayName,
      description,
      markdown_content: body,
      category: 'agency_strategy',
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'skill_key' },
  )
  if (error) throw new Error(`skill_library ${skillKey}: ${error.message}`)

  const resources = await walkResourceFiles(skillDir)
  for (const { relPath, absPath } of resources) {
    const content = await readFile(absPath, 'utf-8')
    const { error: resError } = await supabase.from('skill_library_resources').upsert(
      {
        skill_key: skillKey,
        file_path: relPath,
        content,
        content_type: contentTypeForPath(relPath),
      },
      { onConflict: 'skill_key,file_path' },
    )
    if (resError) throw new Error(`skill_library_resources ${skillKey}/${relPath}: ${resError.message}`)
  }
  console.log(`  library ${skillKey}: ${resources.length} resources`)
}

async function upsertTemplateAssignments(supabase: SupabaseClient): Promise<void> {
  for (const skillKey of SKILL_KEYS) {
    const { error } = await supabase.from('template_skill_assignments').upsert(
      {
        template_key: TEMPLATE_KEY,
        skill_key: skillKey,
        is_enabled: true,
      },
      { onConflict: 'template_key,skill_key' },
    )
    if (error) throw new Error(`template_skill_assignments ${skillKey}: ${error.message}`)
  }
  console.log(`  assigned ${SKILL_KEYS.length} skills → ${TEMPLATE_KEY}`)
}

async function upsertEmployeeTemplate(supabase: SupabaseClient): Promise<void> {
  const row = {
    role_key: TEMPLATE_KEY,
    template_key: TEMPLATE_KEY,
    skill_seed_key: TEMPLATE_KEY,
    default_name: 'Nate',
    name_pool: ['Nate', 'Aaron', 'Dylan', 'Mira'],
    role: 'Agency Strategist',
    level: 'employee',
    disc_profile: 'C/D (Conscientious / Dominant)',
    tagline: 'The Map-Maker',
    description:
      'Owns agency client strategy from intake through launch brief — pre-call maps, post-call strategy, and the strategist approval package.',
    responsibilities: [
      'Build pre-call strategy maps before kickoff',
      'Finalize post-call strategy and client messages same day',
      'Consolidate THE PLAN launch brief for strategist approval',
      'Run ad-library market research with receipts',
    ],
    skills: [...SKILL_KEYS],
    core_beliefs: [
      'Walk in knowing — confirm-or-correct beats discovery',
      'The call outranks the map',
      'Receipts or questions — no naked claims',
      'One strategist checkpoint at the launch brief',
      'EOD is a feature',
    ],
    specialty:
      'Client strategy, offer/avatar mapping, competitive research, launch briefs, agency onboarding',
    image_url: 'https://api.dicebear.com/9.x/shapes/svg?seed=Strategist',
    is_enabled: true,
    sort_order: 16,
    updated_at: new Date().toISOString(),
  }

  const { error } = await supabase.from('agent_employee_templates').upsert(row, {
    onConflict: 'role_key',
  })
  if (error) throw new Error(`agent_employee_templates: ${error.message}`)
  console.log('  employee template strategist upserted')
}

async function upsertTemplateDefinitions(supabase: SupabaseClient): Promise<void> {
  for (const fileName of DEFINITION_FILES) {
    const target = path.join(TEMPLATE_DIR, fileName)
    if (!existsSync(target)) throw new Error(`Missing ${target}`)
    const content = await readFile(target, 'utf-8')
    const { error } = await supabase.from('agent_templates').upsert(
      {
        template_key: TEMPLATE_KEY,
        name: 'Strategist',
        role: 'Agency Strategist',
        level: 'employee',
        file_name: fileName,
        content,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'template_key,file_name' },
    )
    if (error) throw new Error(`agent_templates ${fileName}: ${error.message}`)
  }
  console.log(`  agent_templates definitions: ${DEFINITION_FILES.length} files`)
}

async function hireForTestAccount(supabase: SupabaseClient): Promise<void> {
  const { data: user, error: userError } = await supabase
    .from('profiles')
    .select('id, email')
    .eq('email', TEST_EMAIL)
    .maybeSingle()

  let userId = user?.id as string | undefined
  if (userError || !userId) {
    const { data: authData, error: authError } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 200,
    })
    if (authError) throw new Error(`listUsers: ${authError.message}`)
    const match = authData.users.find((u) => u.email === TEST_EMAIL)
    if (!match) throw new Error(`No auth user for ${TEST_EMAIL}`)
    userId = match.id
  }

  const agentKey = 'nate'
  const { data: existing } = await supabase
    .from('agents_registry')
    .select('agent_key')
    .eq('user_id', userId)
    .eq('agent_key', agentKey)
    .maybeSingle()

  if (existing?.agent_key) {
    console.log(`  hire skip: ${agentKey} already exists for ${TEST_EMAIL}`)
  } else {
    const { error: regError } = await supabase.from('agents_registry').insert({
      user_id: userId,
      org_id: null,
      agent_key: agentKey,
      name: 'Nate',
      role: 'Agency Strategist',
      level: 'employee',
      skills: [...SKILL_KEYS],
      specialty:
        'Client strategy, offer/avatar mapping, competitive research, launch briefs, agency onboarding',
      config: {
        capability_profile: 'managed_domain',
        capability_domain: 'marketing',
        model_id: 'auto',
      },
      status: 'idle',
    })
    if (regError) throw new Error(`agents_registry insert: ${regError.message}`)
    console.log(`  hired ${agentKey} for ${TEST_EMAIL}`)
  }

  for (const fileName of DEFINITION_FILES) {
    const content = await readFile(path.join(TEMPLATE_DIR, fileName), 'utf-8')
    const { error } = await supabase.from('agent_definitions').upsert(
      {
        user_id: userId,
        org_id: null,
        agent_key: agentKey,
        file_name: fileName,
        content,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,agent_key,file_name' },
    )
    if (error) {
      // Some envs use a partial unique index — fall back to delete+insert
      await supabase
        .from('agent_definitions')
        .delete()
        .eq('user_id', userId)
        .eq('agent_key', agentKey)
        .eq('file_name', fileName)
      const { error: insertError } = await supabase.from('agent_definitions').insert({
        user_id: userId,
        org_id: null,
        agent_key: agentKey,
        file_name: fileName,
        content,
      })
      if (insertError) throw new Error(`agent_definitions ${fileName}: ${insertError.message}`)
    }
  }

  for (const skillKey of SKILL_KEYS) {
    const { data: lib, error: libError } = await supabase
      .from('skill_library')
      .select('skill_key, name, description, markdown_content')
      .eq('skill_key', skillKey)
      .single()
    if (libError || !lib) throw new Error(`library lookup ${skillKey}: ${libError?.message}`)

    const { data: existingSkill } = await supabase
      .from('agent_skills')
      .select('id')
      .eq('user_id', userId)
      .eq('agent_key', agentKey)
      .eq('skill_key', skillKey)
      .is('org_id', null)
      .maybeSingle()

    const skillRow = {
      user_id: userId,
      org_id: null,
      agent_key: agentKey,
      skill_key: skillKey,
      name: lib.name,
      description: lib.description,
      markdown_content: lib.markdown_content,
      is_enabled: true,
      source: 'template',
      updated_at: new Date().toISOString(),
    }

    if (existingSkill?.id) {
      const { error } = await supabase.from('agent_skills').update(skillRow).eq('id', existingSkill.id)
      if (error) throw new Error(`agent_skills update ${skillKey}: ${error.message}`)
    } else {
      const { error } = await supabase.from('agent_skills').insert(skillRow)
      if (error) throw new Error(`agent_skills insert ${skillKey}: ${error.message}`)
    }

    const { data: resources } = await supabase
      .from('skill_library_resources')
      .select('file_path, content, content_type')
      .eq('skill_key', skillKey)

    for (const resource of resources ?? []) {
      const { data: existingRes } = await supabase
        .from('agent_skill_resources')
        .select('id')
        .eq('user_id', userId)
        .eq('agent_key', agentKey)
        .eq('skill_key', skillKey)
        .eq('file_path', resource.file_path)
        .is('org_id', null)
        .maybeSingle()

      const resRow = {
        user_id: userId,
        org_id: null,
        agent_key: agentKey,
        skill_key: skillKey,
        file_path: resource.file_path,
        content: resource.content,
        content_type: resource.content_type ?? 'text/markdown',
        updated_at: new Date().toISOString(),
      }

      if (existingRes?.id) {
        const { error } = await supabase
          .from('agent_skill_resources')
          .update(resRow)
          .eq('id', existingRes.id)
        if (error) throw new Error(`agent_skill_resources update: ${error.message}`)
      } else {
        const { error } = await supabase.from('agent_skill_resources').insert(resRow)
        if (error) throw new Error(`agent_skill_resources insert: ${error.message}`)
      }
    }
  }
  console.log(`  seeded ${SKILL_KEYS.length} agent_skills for ${agentKey}`)
}

async function main(): Promise<void> {
  const hireTest = process.argv.includes('--hire-test')
  const supabaseUrl = getEnv('SUPABASE_URL')
  const serviceKey = getEnv('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl.includes('lhfgtsjetcardinpgouq') && !process.env.ALLOW_NON_ROAS_SEED) {
    throw new Error(
      `Refusing to seed non-ROAS DB (${supabaseUrl}). Set ALLOW_NON_ROAS_SEED=1 to override.`,
    )
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  console.log('Seeding strategist skills → library')
  for (const skillKey of SKILL_KEYS) {
    await upsertLibrarySkill(supabase, skillKey)
  }
  await upsertTemplateAssignments(supabase)
  await upsertEmployeeTemplate(supabase)
  await upsertTemplateDefinitions(supabase)

  if (hireTest) {
    console.log(`Hiring strategist for ${TEST_EMAIL}`)
    await hireForTestAccount(supabase)
  }

  console.log('Done')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
