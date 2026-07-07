import { createClient } from '@supabase/supabase-js'
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
})
// Find orphan agents in the demo org
const orgId = '5fe45a9b-5b95-4cef-a287-d676cb9ff92a'
const { data: agents, error } = await sb
  .from('agents_registry')
  .select('id, agent_key, name')
  .eq('org_id', orgId)
  .in('agent_key', ['maya', 'leo', 'sara', 'devon', 'casey', 'riley', 'owen', 'maya_2'])
if (error) { console.error(error); process.exit(1) }
console.log('Found agents in demo org:', JSON.stringify(agents, null, 2))
// Delete agent_definitions + skills for them too
const ids = agents.map(a => a.id)
const keys = agents.map(a => a.agent_key)
console.log(`Cleaning up ${ids.length} agents + their definitions/skills/grants/brains...`)
const r1 = await sb.from('agent_team_grants').delete().in('team_id', (await sb.from('agent_teams').select('id').eq('org_id', orgId)).data?.map(t => t.id) ?? [])
console.log('agent_team_grants:', r1.error || 'ok')
const r2 = await sb.from('agent_teams').delete().eq('org_id', orgId)
console.log('agent_teams:', r2.error || 'ok')
const r3 = await sb.from('agent_definitions').delete().eq('org_id', orgId)
console.log('agent_definitions:', r3.error || 'ok')
const r4 = await sb.from('agent_skill_resources').delete().eq('org_id', orgId)
console.log('agent_skill_resources:', r4.error || 'ok')
const r5 = await sb.from('agent_skills').delete().eq('org_id', orgId)
console.log('agent_skills:', r5.error || 'ok')
const r6 = await sb.from('ns_brains').delete().eq('org_id', orgId).eq('scope', 'agent')
console.log('ns_brains agent:', r6.error || 'ok')
const r7 = await sb.from('agents_registry').delete().eq('org_id', orgId)
console.log('agents_registry (all org agents):', r7.error || 'ok')
