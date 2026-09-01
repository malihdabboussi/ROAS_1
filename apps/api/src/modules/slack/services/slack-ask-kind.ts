/**
 * N0 — Ask kind, computed per Slack turn from cheap signals (no model call).
 *
 * TOOLS.md already carries the client / team / general ladders as separate
 * blocks; what it cannot do is *force the order*, because it is a static guide
 * the model reads. This stamp is injected next to `[Slack channel identity]`
 * so the first thing Pixel sees is which house the ask lives in — and which
 * stores it must not open. See `.docs/plans/pixel-slack-north-star-2026-08-18.md`
 * §3 N0 and §11.0.
 */

export type SlackAskKind = 'continuation' | 'client' | 'team' | 'general' | 'unclear'

export type SlackAskKindInput = {
  /** Raw human text of the turn (no injected context blocks). */
  text: string
  /** The current channel is stamped/mapped to a Portal client. */
  hasChannelClientStamp: boolean
  /** A quoted/forwarded message resolved to a client channel (`#roas-*`). */
  hasQuotedClientChannel: boolean
  /** This turn is a thread reply and the thread parent was posted by Pixel. */
  threadParentIsPixel: boolean
  /** True in a 1:1 / group DM (no channel identity to lean on). */
  isDirectMessage: boolean
}

export type SlackAskKindResult = {
  kind: SlackAskKind
  signals: string[]
}

export const SLACK_ASK_KIND_HEADER = '[Ask kind]'

const GENERAL_PATTERNS: Array<[RegExp, string]> = [
  [/\bmy (task ?list|tasks?|to-?dos?)\b/i, 'my tasks'],
  [/\b(how many|what) calls? (do i|have i|i have|today|tomorrow)\b/i, 'my calls'],
  [/\bmy (calls?|calendar|meetings?|agenda|schedule|day|week)\b/i, 'my calendar'],
  [/\b(check|search|look (in|at)) my brain\b/i, 'my brain'],
  [/\b(remind me|set (a )?reminder|reminder for)\b/i, 'reminder'],
  [/\b(my|for me) (bio|content ideas?|profile)\b/i, 'first-person fill'],
  [/\bcontent ideas?\b.*\b(for me|my)\b/i, 'first-person fill'],
]

/** Voice/tone asks — the *facts* may still be a client's; only the voice is the operator's. */
const VOICE_PATTERNS: Array<[RegExp, string]> = [
  [
    /\b(rewrite|write|draft|clean up|polish) (my|this|the) (message|slack|dm|email|note|reply|update)\b/i,
    'write as me',
  ],
  [/\b(in my voice|as me|sound like me|my tone)\b/i, 'write as me'],
]

const TEAM_PATTERNS: Array<[RegExp, string]> = [
  [/\b(across|all|for) (my|our|the) clients\b/i, 'across clients'],
  [/\b(the|our|whole|entire) team\b/i, 'the team'],
  [/\ball (open )?(work|tasks|clients|campaigns)\b/i, 'all clients'],
  [/\bat risk\b/i, 'at risk'],
  [/\bhow many (active )?clients\b/i, 'client count'],
  [/\b(portfolio|every client|each client)\b/i, 'portfolio'],
  // Live audit 2026-08-18: "any campaigns off KPI?", "everything client wise on KPIs".
  [/\b(any|which|what) (client )?campaigns?\b/i, 'any campaigns'],
  [/\b(client[- ]wise|everything client|all campaigns|off kpi)\b/i, 'across clients'],
]

const CLIENT_PATTERNS: Array<[RegExp, string]> = [
  [
    /\b(run|start|open|review) (the )?(post[- ]call|post[- ]meeting) (flow|review|follow[- ]up)\b/i,
    'post-call flow',
  ],
  [/#roas-[a-z0-9-]+/i, '#roas- channel named'],
  // Slack renders channel references as <#C0B5MKP7Y30> or <#C0B5MKP7Y30|roas-yasir…>.
  [/<#C[A-Z0-9]+(?:\|[^>]*)?>/, 'Slack channel referenced'],
  [
    /\b(stats?|results|numbers|kpis?|breakdown|performance) (for|on|of) \b/i,
    'client performance ask',
  ],
  [
    /\b(catch me up on|prepping for (a |the |my )?call with|peep the (client )?channel|check the .{0,40}channel)\b/i,
    'client channel catch-up',
  ],
  [/\b(monday|weekly|client) (morning )?update\b/i, 'client update'],
  [/\bfor (the )?client\b/i, 'for the client'],
  [/\b(video|design|copy|editing|funnel) task\b/i, 'service request intent'],
  [
    /\b(campaign|webinar|funnel|ads?|creative|spend|cpl|cpa|roas|launch|vsl|landing page)\b/i,
    'client work vocabulary',
  ],
  [
    /\b(service request|fulfillment|deliverable|design request|copy request)\b/i,
    'fulfillment vocabulary',
  ],
  // Live audit 2026-08-18: the most common DM shape is "make a task … ASAP" over a
  // forwarded client message — a Service Request intent, so it is a client ask.
  [
    /\b(make|create|open|set up|spin up) (a |the |me a |this |it |that |this a |it a |that a )?(task|ticket|request|sr)\b/i,
    'service request intent',
  ],
  [/\b(task|ticket|request) for (crm|ghl|design|copy|video|ads?)\b/i, 'service request intent'],
  [
    /\b(turn|convert) (this|it|that) into a (task|ticket|request)\b/i,
    'service request intent',
  ],
  [
    /\b(put|send|add) (this|it|that) (in|into|to) (clickup|the portal|roas)\b/i,
    'service request intent',
  ],
  [/\btask (this|it|that)\b/i, 'service request intent'],
  [
    /\b(need|needs) (this|these|that|it) (edited|built|designed|written|rebuilt|redone|fixed|updated|done)\b/i,
    'deliverable intent',
  ],
  [
    /\b(by|before) (eow|eod|end of (the )?(week|day)|monday|tuesday|wednesday|thursday|friday|tomorrow)\b/i,
    'delivery deadline',
  ],
  [
    /\b(what did (i|we) promise|what (did|have) we agree|last call with|onboarding call)\b/i,
    'client call memory',
  ],
]

const CONTINUATION_PATTERNS: Array<[RegExp, string]> = [
  [
    /^\s*(approve|approved|yes|yep|yeah|go ahead|do it|ship it|looks good|lgtm|done|resolved|fixed)\b/i,
    'affirmative reply',
  ],
  [
    /\b(is (that|this|it) still open|did we fix|was that (done|finalized|resolved)|status on (that|this))\b/i,
    'follow-up on Pixel item',
  ],
]

function matchAll(text: string, patterns: Array<[RegExp, string]>): string[] {
  const hits: string[] = []
  for (const [re, label] of patterns) if (re.test(text)) hits.push(label)
  return hits
}

export function classifySlackAskKind(input: SlackAskKindInput): SlackAskKindResult {
  const text = input.text.trim()
  const signals: string[] = []

  if (input.threadParentIsPixel) {
    const cont = matchAll(text, CONTINUATION_PATTERNS)
    // Any reply on Pixel's own thread continues that process unless the human
    // clearly opens a new client ask (names a channel / client work + no follow-up cue).
    if (cont.length > 0 || text.length < 120) {
      return { kind: 'continuation', signals: ['reply on Pixel thread', ...cont] }
    }
    signals.push('reply on Pixel thread')
  }

  const general = matchAll(text, GENERAL_PATTERNS)
  const voice = matchAll(text, VOICE_PATTERNS)
  const team = matchAll(text, TEAM_PATTERNS)
  const client = matchAll(text, CLIENT_PATTERNS)
  const namesChannel =
    client.includes('#roas- channel named') || client.includes('Slack channel referenced')

  // 1. Explicit client identity: a quoted #roas-* thread, or a #roas-* channel named in the text.
  if (input.hasQuotedClientChannel) {
    return { kind: 'client', signals: [...signals, 'quoted client channel', ...client] }
  }
  if (namesChannel) return { kind: 'client', signals: [...signals, ...client] }

  // 2. First-person actions (my tasks / calls / brain / reminder / bio) beat incidental
  //    client vocabulary — "remind me to send the 1DS VSL" is a reminder, not a VSL job.
  if (general.length > 0) return { kind: 'general', signals: [...signals, ...general] }

  // 3. Cross-client / internal ops beat single-client vocabulary ("launch", "campaign").
  if (team.length > 0) return { kind: 'team', signals: [...signals, ...team] }

  // 4. Client: mapped channel, or client vocabulary; voice asks ride along as tone-only.
  if (input.hasChannelClientStamp) {
    return {
      kind: 'client',
      signals: [
        ...signals,
        'client-mapped channel',
        ...client,
        ...voice.map((v) => `${v} (voice only)`),
      ],
    }
  }
  if (client.length > 0) {
    return {
      kind: 'client',
      signals: [...signals, ...client, ...voice.map((v) => `${v} (voice only)`)],
    }
  }

  // 5. Pure voice ask with no client facts → general (User Brain for tone).
  if (voice.length > 0) return { kind: 'general', signals: [...signals, ...voice] }

  return { kind: 'unclear', signals }
}

const KIND_GUIDANCE: Record<SlackAskKind, string> = {
  continuation:
    'This is a reply on a thread Pixel started (digest, Service Request nudge, QC follow-up). Continue that process in this thread. Do not open a new Service Request or start a new client lookup unless the human clearly asks for new work.',
  client:
    'This is about one client. Resolve the client first (channel identity, quoted channel, named client, unique list_clients hint), bind CONNECTIONS to that client, then retrieve in order: Campaign Brain → Portal → the client Slack channel → tasks → meetings → Meta. Do not search User Brain first. Do not ask which client when the identity block already resolves one. If they asked to make/create a task, that is a Service Request. If they described client work but did not ask for a task, ask exactly: "Did you want me to create a task for this?" Do not invent a task until they confirm.',
  team: 'This spans clients or internal ops. Use agent_cases / open work, Space tasks across campaigns, Company Brain, and Slack search of the cited channels. Do not bind a single Portal client as if it were the whole ask.',
  general:
    "This is about the operator's own world (their tasks, calendar, User Brain, reminders, first-person voice). Use User Brain, the caller's calendar, and their tasks. Do not call list_clients, Campaign Brain, or bind CONNECTIONS. If the channel is mapped to a client, that mapping is context only — it is not the work to do.",
  unclear:
    'The ask kind is not clear from cheap signals. Ask one short question: "Did you want me to create a task for this?" Do not invent a task until they confirm. Do not default to a client lookup.',
}

export function formatSlackAskKindContext(result: SlackAskKindResult): string {
  const lines = [SLACK_ASK_KIND_HEADER, `Kind: ${result.kind}`]
  if (result.signals.length > 0) lines.push(`Signals: ${result.signals.join('; ')}`)
  if (result.signals.includes('post-call flow')) {
    lines.push(
      'This is an explicit meeting post-call workflow request. Resolve the named completed meeting and run request_slack_follow_up_confirm in active DM mode. Do not route this to task creation, canonical task lookup, or the Service Request flow. Do not ask whether to create a task.',
    )
    return lines.join('\n')
  }
  lines.push(KIND_GUIDANCE[result.kind])
  return lines.join('\n')
}
