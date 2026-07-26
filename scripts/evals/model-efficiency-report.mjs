import fs from 'node:fs'
import path from 'node:path'

function readEnvFile() {
  const file = path.resolve(process.cwd(), '.env')
  if (!fs.existsSync(file)) return {}
  return Object.fromEntries(
    fs
      .readFileSync(file, 'utf8')
      .split(/\r?\n/)
      .filter((line) => line && !line.startsWith('#') && line.includes('='))
      .map((line) => {
        const separator = line.indexOf('=')
        return [
          line.slice(0, separator),
          line
            .slice(separator + 1)
            .trim()
            .replace(/^['"]|['"]$/g, ''),
        ]
      }),
  )
}

const fileEnv = readEnvFile()
const supabaseUrl = process.env.SUPABASE_URL || fileEnv.SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || fileEnv.SUPABASE_SERVICE_ROLE_KEY
const daysArg = process.argv.find((arg) => arg.startsWith('--days='))
const days = Math.max(1, Math.min(90, Number(daysArg?.split('=')[1] || 7)))
const includeOutput = process.argv.includes('--include-output')

if (!supabaseUrl || !serviceKey) {
  throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required')
}

const since = new Date(Date.now() - days * 86_400_000).toISOString()

async function readRows(table, select) {
  const url = new URL(`/rest/v1/${table}`, supabaseUrl)
  url.searchParams.set('select', select)
  url.searchParams.set('created_at', `gte.${since}`)
  url.searchParams.set('order', 'created_at.desc')
  url.searchParams.set('limit', '5000')
  const response = await fetch(url, {
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
    },
  })
  if (!response.ok) {
    throw new Error(`${table} query failed (${response.status}): ${await response.text()}`)
  }
  return response.json()
}

const [traces, feedback] = await Promise.all([
  readRows(
    'vb_agent_traces',
    'id,created_at,model,channel,agent_key,status,total_tokens,input_tokens,output_tokens,cost_usd,duration_ms,message_id,response,error',
  ),
  readRows('agent_turn_feedback', 'created_at,target_kind,target_id,agent_key,thumbs_up,tags'),
])

const feedbackByMessageId = new Map()
for (const row of feedback) {
  if (row.target_kind === 'conversation_message') feedbackByMessageId.set(row.target_id, row)
}

const byModel = new Map()
for (const trace of traces) {
  const model = trace.model || 'unknown'
  const group = byModel.get(model) || {
    model,
    runs: 0,
    failed: 0,
    tokens: 0,
    inputTokens: 0,
    outputTokens: 0,
    cost: 0,
    durationMs: 0,
    positive: 0,
    negative: 0,
  }
  group.runs += 1
  group.failed += trace.status === 'failed' ? 1 : 0
  group.tokens += Number(trace.total_tokens || 0)
  group.inputTokens += Number(trace.input_tokens || 0)
  group.outputTokens += Number(trace.output_tokens || 0)
  group.cost += Number(trace.cost_usd || 0)
  group.durationMs += Number(trace.duration_ms || 0)
  const vote = trace.message_id ? feedbackByMessageId.get(trace.message_id) : null
  group.positive += vote?.thumbs_up === true ? 1 : 0
  group.negative += vote?.thumbs_up === false ? 1 : 0
  byModel.set(model, group)
}

const modelRows = [...byModel.values()]
  .map((row) => ({
    ...row,
    avgTokens: row.runs ? Math.round(row.tokens / row.runs) : 0,
    avgDurationMs: row.runs ? Math.round(row.durationMs / row.runs) : 0,
    failureRate: row.runs ? row.failed / row.runs : 0,
    cost: Number(row.cost.toFixed(4)),
  }))
  .sort((left, right) => right.tokens - left.tokens)

const lines = [
  `# Model efficiency review`,
  '',
  `Window: ${days} days since ${since}`,
  `Traces: ${traces.length} | Human feedback rows: ${feedback.length}`,
  '',
  '| Model | Runs | Avg tokens | Total tokens | Cost | Failures | 👍 | 👎 | Avg latency |',
  '|---|---:|---:|---:|---:|---:|---:|---:|---:|',
  ...modelRows.map(
    (row) =>
      `| ${row.model} | ${row.runs} | ${row.avgTokens.toLocaleString()} | ${row.tokens.toLocaleString()} | $${row.cost.toFixed(4)} | ${(row.failureRate * 100).toFixed(1)}% | ${row.positive} | ${row.negative} | ${(row.avgDurationMs / 1000).toFixed(1)}s |`,
  ),
]

if (includeOutput) {
  const samples = [...traces]
    .filter((trace) => trace.response)
    .sort((left, right) => Number(right.total_tokens || 0) - Number(left.total_tokens || 0))
    .slice(0, 10)
  lines.push('', '## Highest-token real output samples')
  for (const sample of samples) {
    const vote = sample.message_id ? feedbackByMessageId.get(sample.message_id) : null
    const rating =
      vote?.thumbs_up === true ? 'positive' : vote?.thumbs_up === false ? 'negative' : 'unrated'
    const excerpt = String(sample.response).replace(/\s+/g, ' ').slice(0, 800)
    lines.push(
      '',
      `### ${sample.model || 'unknown'} · ${Number(sample.total_tokens || 0).toLocaleString()} tokens · ${rating}`,
      '',
      excerpt,
    )
  }
}

console.log(lines.join('\n'))
