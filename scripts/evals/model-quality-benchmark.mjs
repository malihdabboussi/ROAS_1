import fs from 'node:fs'
import path from 'node:path'

const DEFAULT_MODELS = [
  'anthropic/claude-opus-4.6',
  'anthropic/claude-sonnet-4.6',
  'anthropic/claude-sonnet-5',
  'anthropic/claude-opus-4.8',
  'anthropic/claude-opus-5',
  'anthropic/claude-fable-5',
  'openai/gpt-5.6-sol',
  'openai/gpt-5.6-terra',
  'openai/gpt-5.6-luna',
]

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
const apiKey = process.env.OPENROUTER_API_KEY || fileEnv.OPENROUTER_API_KEY
const modelArg = process.argv.find((arg) => arg.startsWith('--models='))
const outputArg = process.argv.find((arg) => arg.startsWith('--output='))
const models = modelArg
  ? modelArg
      .slice('--models='.length)
      .split(',')
      .map((model) => model.trim())
      .filter(Boolean)
  : DEFAULT_MODELS
const outputPath = outputArg
  ? path.resolve(outputArg.slice('--output='.length))
  : path.resolve('/private/tmp', `vibey-model-benchmark-${Date.now()}.json`)

if (!apiKey) throw new Error('OPENROUTER_API_KEY is required')

const tasks = [
  {
    id: 'brain',
    maxTokens: 4_500,
    prompt: `You are the synthesis layer for a customer Brain. Analyze only the supplied evidence.
Rules:
- A new belief requires at least 3 distinct customer_unit_ids.
- Challenge an existing belief when at least 3 customer units directly contradict it.
- A new perspective requires at least 3 aligned belief IDs.
- Never invent IDs. Return only valid JSON.
brain_id: brain-eval-001
Existing beliefs:
- b-access | active | Buyers always want more 1:1 access
- b-control | active | Operators protect control over core decisions
- b-proof | active | Proof must precede operational change
- b-systems | active | Repeatable systems feel safer than heroic execution
Memories:
- m01 | cu-a | We will not roll this out until I see two companies like us using it.
- m02 | cu-b | I need to speak with an operator who implemented it.
- m03 | cu-c | I delayed the purchase and asked for a 30-day pilot.
- m04 | cu-d | Show me the workflow surviving month-end close, then I can approve it.
- m05 | cu-a | I do not want weekly one-on-ones. Give me an async dashboard.
- m06 | cu-e | We cancelled coaching calls but kept the shared workspace because async was faster.
- m07 | cu-f | Cohort office hours are enough. Private calls add calendar debt.
- m08 | cu-b | Generic AI voice will make my team stop using it.
- m09 | cu-g | We rejected the campaign because it sounded like every AI ad.
- m10 | cu-h | The system must learn our judgment, not produce more words.
Required JSON shape:
{
  "brain_id": "brain-eval-001",
  "new_beliefs": [{
    "pattern_name": "3-8 words",
    "description": "one paragraph",
    "supporting_memory_ids": ["m01"],
    "supporting_customer_unit_ids": ["cu-a"],
    "evidence_type": "stated|revealed|behavioral",
    "discriminator_axis": "stakes|horizon|money|reference_frame|identity|pain|risk|null"
  }],
  "belief_updates": [{
    "id": "existing id",
    "op": "reinforce|challenge|resolve",
    "supporting_memory_ids": ["m01"],
    "rationale": "one sentence"
  }],
  "new_perspectives": [{
    "name": "3-6 words",
    "description": "one paragraph",
    "narrative_md": "specific explanatory prose",
    "belief_ids": ["existing id"],
    "blind_spots": "specific blind spot"
  }],
  "perspective_updates": [],
  "log_event": {"summary": "one sentence"}
}`,
  },
  {
    id: 'copy',
    maxTokens: 3_000,
    prompt: `Write premium webinar registration copy for agency founders at $2M-$10M who are still the approval bottleneck.
Locked headline: "THE FOUNDER BOTTLENECK: Build an Agency That Can Make Good Decisions Without You"
Promise: a decision-rights map attendees can implement the next morning.
Real proof only: Maya Chen built operations at two agencies that grew from $3M to $12M.
Event: August 18, 2026, 11:00 AM Pacific, live on Zoom.
Length: 75 minutes.
No attendance bonus, replay window, seat cap, or downloadable template has been cleared. Do not invent one.
Voice: concise, intelligent, candid, specific, calm confidence.
Forbidden: em dashes, "not X, but Y", generic transformation language, invented proof, rhetorical triplets.
Return labeled blocks: PREHEAD, HEADLINE, SUBHEAD, THREE DISCOVER BULLETS, CTA, CTA SUBTEXT, URGENCY, HOST BIO, CONFIRMATION HEADLINE, CONFIRMATION BODY, CALENDAR STEP, ATTENDANCE BONUS.
Keep it under 700 words and preserve the locked headline exactly.`,
  },
  {
    id: 'advice',
    maxTokens: 2_200,
    prompt: `You are Elena's private executive Brain. Recommend a decision using only this context:
- She values product quality above short-term growth and regrets rushed launches.
- Nine engineers; two are committed to reliability through September.
- Enterprise expansion could add $1.2M ARR but requires SSO, audit logs, and admin permission redesign.
- Self-serve activation fell from 4.1% to 2.6% in six weeks.
- Interviews show setup confusion, not missing features, is the main self-serve failure.
- The board wants a visible enterprise story before October.
- Elena prefers reversible tests before organization-wide commitments.
- Last quarter she split across three priorities and called it strategic confetti.
Should she move six engineers to enterprise immediately, keep everyone on self-serve, or stage the work?
Include the decision, evidence-based reasoning, main tradeoff, reversible 30-day plan, and trigger for changing course. Do not invent facts. Under 500 words.`,
  },
]

function validate(taskId, content) {
  const issues = []
  if (taskId === 'brain') {
    let parsed
    try {
      parsed = JSON.parse(
        content
          .trim()
          .replace(/^```json\s*/i, '')
          .replace(/\s*```$/, ''),
      )
    } catch {
      return { score: 0, issues: ['invalid_json'] }
    }
    const updates = parsed.belief_updates || []
    if (!updates.some((item) => item.id === 'b-access' && item.op === 'challenge')) {
      issues.push('missed_access_challenge')
    }
    const allowedIds = new Set(['b-access', 'b-control', 'b-proof', 'b-systems'])
    if (updates.some((item) => !allowedIds.has(item.id))) issues.push('invented_belief_id')
    if (
      (parsed.new_beliefs || []).some(
        (item) => new Set(item.supporting_customer_unit_ids || []).size < 3,
      )
    ) {
      issues.push('belief_below_threshold')
    }
  }
  if (taskId === 'copy') {
    if (
      !content.includes(
        'THE FOUNDER BOTTLENECK: Build an Agency That Can Make Good Decisions Without You',
      )
    ) {
      issues.push('changed_headline')
    }
    if (content.includes('—')) issues.push('em_dash')
    if (content.trim().split(/\s+/).length > 700) issues.push('too_long')
    if (
      /\b(500 attendees|replay|decision-rights template|spreadsheet|60 minutes)\b/i.test(content)
    ) {
      issues.push('invented_or_wrong_logistics')
    }
    for (const label of ['PREHEAD', 'HEADLINE', 'CTA', 'HOST BIO', 'ATTENDANCE BONUS']) {
      if (!content.includes(label)) issues.push(`missing_${label}`)
    }
  }
  if (taskId === 'advice') {
    if (!/30[- ]day/i.test(content)) issues.push('missing_30_day_plan')
    if (!/(trigger|change course|if .* then)/i.test(content)) issues.push('missing_trigger')
    if (!/(staged|pilot|reversible)/i.test(content)) issues.push('missed_reversibility')
    if (!/(2\.6|4\.1|setup confusion)/i.test(content)) issues.push('weak_grounding')
    if (content.trim().split(/\s+/).length > 500) issues.push('too_long')
  }
  return { score: Math.max(0, 100 - issues.length * 15), issues }
}

async function callModel(model, task) {
  const startedAt = Date.now()
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://govibey.com',
      'X-Title': 'Vibey Model Quality Benchmark',
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: task.prompt }],
      max_tokens: task.maxTokens,
      reasoning: { effort: 'medium', exclude: true },
      temperature: 0,
    }),
  })
  const body = await response.json()
  if (!response.ok) throw new Error(`${response.status}: ${JSON.stringify(body)}`)
  const content = body.choices?.[0]?.message?.content || ''
  return {
    task: task.id,
    model,
    content,
    deterministic: validate(task.id, content),
    usage: body.usage || {},
    latencyMs: Date.now() - startedAt,
  }
}

const results = []
for (const task of tasks) {
  const settled = await Promise.allSettled(models.map((model) => callModel(model, task)))
  settled.forEach((result, index) => {
    results.push(
      result.status === 'fulfilled'
        ? result.value
        : { task: task.id, model: models[index], error: String(result.reason) },
    )
  })
}

const report = { createdAt: new Date().toISOString(), models, results }
fs.writeFileSync(outputPath, JSON.stringify(report, null, 2))
console.log(
  JSON.stringify(
    {
      outputPath,
      summary: results.map((result) => ({
        task: result.task,
        model: result.model,
        score: result.deterministic?.score,
        issues: result.deterministic?.issues,
        cost: result.usage?.cost,
        promptTokens: result.usage?.prompt_tokens,
        completionTokens: result.usage?.completion_tokens,
        latencyMs: result.latencyMs,
        error: result.error,
      })),
    },
    null,
    2,
  ),
)
