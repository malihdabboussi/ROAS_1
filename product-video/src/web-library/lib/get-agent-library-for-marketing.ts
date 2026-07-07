import { createClient } from '@supabase/supabase-js'
import {
  MARKETING_AGENT_LIBRARY_FALLBACK,
  VIBEY_MARKETING_PORTRAIT_FALLBACK,
} from '@/lib/agent-library-fallback'
import type { AgentSkillDetail, PublicAgentLibraryRow } from '@/lib/public-agent-library'

const EXCLUDED_ROLE_KEYS = new Set(['vibey', 'brain_scholar', 'atlas', 'hr', 'viktor'])

/**
 * Loads hireable agent templates for the marketing site. Uses Supabase when URL + service role are set;
 * otherwise returns the same shapes as the DB seed so hero cards always render.
 */
export async function getAgentLibraryForMarketing(): Promise<PublicAgentLibraryRow[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return MARKETING_AGENT_LIBRARY_FALLBACK

  const supabase = createClient(url, key)
  const { data, error } = await supabase
    .from('agent_employee_templates')
    .select('role_key, default_name, role, level, image_url, skills, tagline')
    .eq('is_enabled', true)
    .not('image_url', 'eq', '')
    .order('sort_order', { ascending: true })
    .limit(48)

  if (error) return MARKETING_AGENT_LIBRARY_FALLBACK

  const rows = (data ?? []).filter((r) => r.role_key && !EXCLUDED_ROLE_KEYS.has(String(r.role_key)))
  const agents = rows.slice(0, 8) as PublicAgentLibraryRow[]
  if (agents.length === 0) return MARKETING_AGENT_LIBRARY_FALLBACK

  const templateKeys = agents.map((a) => a.role_key)
  const { data: assignmentRows } = await supabase
    .from('template_skill_assignments')
    .select('template_key, skill_key')
    .in('template_key', templateKeys)
    .eq('is_enabled', true)
    .order('skill_key', { ascending: true })

  const assignedSkillKeys = [...new Set((assignmentRows ?? []).map((r) => r.skill_key))]
  const { data: libRows } =
    assignedSkillKeys.length > 0
      ? await supabase
          .from('skill_library')
          .select('skill_key, name, description')
          .in('skill_key', assignedSkillKeys)
      : { data: [] }

  const libMap = new Map((libRows ?? []).map((r) => [r.skill_key, r]))
  const skillRows = (assignmentRows ?? [])
    .map((a) => {
      const lib = libMap.get(a.skill_key)
      return lib
        ? {
            template_key: a.template_key,
            skill_key: a.skill_key,
            name: lib.name,
            description: lib.description,
          }
        : null
    })
    .filter(
      (x): x is { template_key: string; skill_key: string; name: string; description: string } =>
        x !== null,
    )

  if (skillRows.length > 0) {
    const skillMap = new Map<string, AgentSkillDetail[]>()
    for (const s of skillRows) {
      const key = s.template_key
      if (!skillMap.has(key)) skillMap.set(key, [])
      skillMap.get(key)!.push({
        skill_key: s.skill_key,
        name: s.name,
        description: s.description,
      })
    }
    for (const agent of agents) {
      agent.skill_details = skillMap.get(agent.role_key) ?? undefined
    }
  }

  return agents
}

/** CEO portrait for marketing org mockup: DB `agent_employee_templates` row `vibey`, else template fallback. */
export async function getMarketingVibeyPortraitUrl(): Promise<string> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return VIBEY_MARKETING_PORTRAIT_FALLBACK

  const supabase = createClient(url, key)
  const { data, error } = await supabase
    .from('agent_employee_templates')
    .select('image_url')
    .eq('role_key', 'vibey')
    .maybeSingle()

  if (error || data?.image_url == null || String(data.image_url).trim() === '')
    return VIBEY_MARKETING_PORTRAIT_FALLBACK

  return String(data.image_url).trim()
}
