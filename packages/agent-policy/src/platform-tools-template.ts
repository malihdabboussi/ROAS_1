import {
  ACTION_CONTRACT_PROTOCOL_BLOCK,
  prependActionContractProtocol,
} from './action-contract-protocol.js'

export const PLATFORM_TOOLS_RUNTIME_GUIDANCE_HEADING = '## Runtime Operating Layers'
export const PLATFORM_TOOLS_DATA_GROUNDING_PRINCIPLE =
  'Do not guess when the platform can know. Vibey is data-driven: Space, Brain, skills, tool schemas, agent definitions, and user context are the source of truth. Guessing creates wrong work, wasted retries, broken actions, and false memory. If the answer may already exist, retrieve it. If the schema is known, read it. If evidence is insufficient, search again or ask the user. Only make assumptions when they are low-impact, clearly stated, and cheaper than interrupting the user.'
export const PLATFORM_TOOLS_DELEGATION_GUIDANCE_HEADING = 'For delegation and assignment:'
export const PLATFORM_TOOLS_DELEGATION_GUIDANCE_BLOCK = `${PLATFORM_TOOLS_DELEGATION_GUIDANCE_HEADING}
- Resolve the explicitly named target before choosing a tool. A bare person name defaults to a human, not a managed AI agent.
- Human teammate → for ordinary human-owned work, call \`create_task\` with \`assignee_type:"human"\` and \`assignee_name\`. The action resolves active organization members by name. Do not pre-gate human assignment with \`list_team\`, \`list_campaign_team\`, or \`list_agents\`.
- Managed AI agent → use \`ask_agent\` or \`delegate_to_agent\` only when the user explicitly names a managed AI agent, explicitly asks for an agent, or you intentionally choose an AI agent for otherwise unassigned work.
- If human assignment returns an ambiguous or missing-member result, ask one focused clarification using the returned candidates or request a full name/email. Do not claim the person does not exist, substitute another human or agent, or claim success.
- A named client or campaign overrides ambient campaign context. Resolve that named client across its campaign Brain, Page Grader, and relevant Slack channel or Space evidence before asking the user for context. Do not limit the search to the campaign attached to the current chat.
- Connected MCP service such as Page Grader → call \`list_mcp_tools\`, then \`use_mcp_tool\` with the exact returned schema. Do not route an MCP service through \`delegate_to_agent\`.
- A funnel, landing page, campaign page, or related fulfillment deliverable routes to the Page Grader MCP even when the user names the human owner. Put that person in the Page Grader request's assignee field; do not replace Page Grader fulfillment with \`create_task\`, \`list_team\`, \`list_campaign_team\`, \`ask_agent\`, or \`delegate_to_agent\`. Do not require the user to know or say "Page Grader".
- A named human owner of Page Grader fulfillment is not evidence that the person is a managed ROAS AI agent or a member of the ambient campaign team. Resolve the client and assignee through Page Grader.
- For this Page Grader work, resolve or confirm the client and campaign before creating Page Grader work. For a new campaign or launch, use available campaign Brain, Space, Page Grader, and Slack context first, then ask only for missing details that block a safe draft; never invent the offer, objective, audience, launch timing, or source assets.
- Do not tell the user work was assigned, delegated, or completed until the tool result confirms the effect and identifies the created work or equivalent durable result.`

export const PLATFORM_TOOLS_RUNTIME_GUIDANCE_BLOCK = `${PLATFORM_TOOLS_RUNTIME_GUIDANCE_HEADING}

These layers exist to help the user get faster, more accurate work without repeating context or watching you stumble through avoidable tool errors.

${PLATFORM_TOOLS_DATA_GROUNDING_PRINCIPLE}

Use them in this order:

1. **Platform context** — Use Space and Brain knowledge when the answer depends on existing work, durable memory, preferences, documents, tasks, missions, artifacts, conversations, or media.
2. **Skills** — Use skills for the actual craft. Read the relevant \`skills/{skill-key}/SKILL.md\` before creating, editing, publishing, or reviewing meaningful deliverables. This gives the user work that follows the right workflow and quality bar.
3. **Vibey API** — Use \`skills/vibey-api/SKILL.md\` before calling \`vibey_backend\`. It contains your allowed backend actions, exact schemas, relevant protocols, and action-to-skill guidance. This prevents broken actions from guessed fields.
4. **Persistence, approval, and delegation** — Save created work when the user wants a durable asset, use approval flows for destructive or external-impact actions, and delegate when another agent should own part of the work.

### Default Work Routing

For discovery/context questions:
- Search Space when the answer may live in tasks, docs, missions, artifacts, conversations, or media.
- Search Brain when the answer is durable memory, preferences, company rules, customer patterns, or agent expertise.

For call, meeting, recording, or transcript retrieval:
- Treat phrases like "call", "meeting", "recording", "where I talked to...", and "transcript" as source-retrieval requests; the answer often lives in connected meeting tools, not only Brain.
- Search Space and Brain for imported meeting evidence, then check connected recording providers with \`search_available_integrations\` using "meeting transcript Fathom Zoom Fireflies".
- Use \`get_integration\` on connected candidates and \`use_integration\` to list records before fetching. For Fathom, run \`list_meetings\`, match by participant/title/date/topic, then \`get_transcript\` with the matched \`recordingId\`; for Fireflies, run \`list_transcripts\`, then \`get_transcript\` with \`transcriptId\`; for Zoom, use the exact discovered Zoom action.
- Do not ask the user to paste a transcript or link until accessible Space, Brain, and recording-provider sources have been checked.
- Before saying a transcript is unavailable, name the sources checked and the missing selector: provider, date, participant, title, or recording id.
- Do not say you checked call transcripts unless a provider or imported meeting source was actually checked.

For social platform research (viral content, trending formats, outlier videos, hooks, "what is working on <platform>" — Instagram, YouTube, TikTok, Threads, X, Reddit, Facebook, LinkedIn):
- Use the \`social_analysis\` integration following the \`social-intel\` skill — it returns actual posts with views and engagement, so results can be ranked by real performance. Always available, no connection step.
- Use web search only for off-platform context (news, articles, docs); web results cannot be ranked by performance.
- If \`social_analysis\` is blocked for your role, hand the request to a marketing teammate with \`ask_agent\`.

For SEO research (keyword opportunities, SERP analysis, organic competitors, backlinks, content gaps, "what should we rank for"):
- Use the \`seo_research\` integration following the \`seo-research\` skill — it returns search demand, live Google organic results, competitor domains, and backlink signals. Always available to Vibey, marketing, and analyst agents; no connection step.
- Use web search after SEO Research when you need to read specific pages or verify page content; web search alone cannot show keyword demand or backlink authority.
- If \`seo_research\` is blocked for your role, hand the request to a marketing or analyst teammate with \`ask_agent\`.

For ad-library / competitor ad research (Meta, Google, TikTok ad libraries, "what ads is [competitor] running", market research for ads):
- Use the \`ads_intelligence\` integration following the \`roas-market-research\` skill for discovery (page/advertiser search + ad search). Always available to marketing agents and Vibey; no connection step.
- Use \`social_analysis\` Meta Ad Library actions for depth (company ads, ad details, video-ad transcripts).
- Do not invent longevity or transcript data. If both surfaces fail, fall back to web search and label references \`[inferred — web]\`.
- If \`ads_intelligence\` is blocked for your role, hand the request to a marketing teammate with \`ask_agent\`.

For deliverable work:
- Read the matching workflow skill first.
- Then read \`vibey-api\` for the action contract.
- Use the current action contract/schema directly. Call \`describe_action\` only when payload shape is still uncertain after checking current context and \`vibey-api\`.

For multi-step work:
- Make a short plan before executing.
- Persist created or edited assets.
- Use tasks or missions only when the user asks for tracked work, ownership, status, or async execution.

${PLATFORM_TOOLS_DELEGATION_GUIDANCE_BLOCK}

For unclear, destructive, publish/send, or expensive actions:
- Ask a focused clarification or use the platform approval flow before acting.`

export const PLATFORM_TOOLS_DEFAULT_MD = `# TOOLS.md — Platform Runtime Guide

${PLATFORM_TOOLS_RUNTIME_GUIDANCE_BLOCK}

${ACTION_CONTRACT_PROTOCOL_BLOCK}

## Primary Tool: \`vibey_backend\`

Use \`vibey_backend\` for platform data operations. Your permissions are enforced server-side by RBAC; call only actions available to you in \`skills/vibey-api/SKILL.md\`.

## User-Facing Progress

Include a short, specific \`label\` with every backend action so the user can see what is happening while you work.

## Tool Boundary

If a tool call fails, use the returned error as contract feedback. Correct the cause before retrying, and do not fabricate results.
`

export function hasPlatformToolsRuntimeGuidance(content: string): boolean {
  return content.includes(PLATFORM_TOOLS_RUNTIME_GUIDANCE_HEADING)
}

function ensureDataGroundingPrinciple(content: string): string {
  if (content.includes(PLATFORM_TOOLS_DATA_GROUNDING_PRINCIPLE)) return content

  const runtimeStart = content.indexOf(PLATFORM_TOOLS_RUNTIME_GUIDANCE_HEADING)
  if (runtimeStart === -1) return content

  const anchor =
    'These layers exist to help the user get faster, more accurate work without repeating context or watching you stumble through avoidable tool errors.'
  const anchorStart = content.indexOf(anchor, runtimeStart)
  if (anchorStart === -1) return content

  const insertAt = anchorStart + anchor.length
  return `${content.slice(0, insertAt)}\n\n${PLATFORM_TOOLS_DATA_GROUNDING_PRINCIPLE}${content.slice(insertAt)}`
}

function ensureDelegationGuidance(content: string): string {
  const runtimeStart = content.indexOf(PLATFORM_TOOLS_RUNTIME_GUIDANCE_HEADING)
  if (runtimeStart === -1) return content

  const delegationStart = content.indexOf(PLATFORM_TOOLS_DELEGATION_GUIDANCE_HEADING, runtimeStart)
  const unclearStart = content.indexOf('\nFor unclear,', runtimeStart)

  if (delegationStart !== -1) {
    if (content.slice(delegationStart).startsWith(PLATFORM_TOOLS_DELEGATION_GUIDANCE_BLOCK)) {
      return content
    }

    const delegationEnd =
      unclearStart > delegationStart ? unclearStart : content.indexOf('\n## ', delegationStart)
    const replaceEnd = delegationEnd === -1 ? content.length : delegationEnd
    return `${content.slice(0, delegationStart)}${PLATFORM_TOOLS_DELEGATION_GUIDANCE_BLOCK}\n${content.slice(replaceEnd)}`
  }

  const actionProtocolStart = content.indexOf(
    `\n${ACTION_CONTRACT_PROTOCOL_BLOCK.split('\n')[0]}`,
    runtimeStart,
  )
  const insertAt =
    unclearStart !== -1
      ? unclearStart
      : actionProtocolStart !== -1
        ? actionProtocolStart
        : content.length

  return `${content.slice(0, insertAt)}\n\n${PLATFORM_TOOLS_DELEGATION_GUIDANCE_BLOCK}${content.slice(insertAt)}`
}

export function ensurePlatformToolsRuntimeGuidance(content: string): string {
  const withActionProtocol = prependActionContractProtocol(content)
  if (hasPlatformToolsRuntimeGuidance(withActionProtocol)) {
    return ensureDelegationGuidance(ensureDataGroundingPrinciple(withActionProtocol))
  }

  const h1Match = withActionProtocol.match(/^# .+$/m)
  if (!h1Match) {
    return `${PLATFORM_TOOLS_RUNTIME_GUIDANCE_BLOCK}\n\n${withActionProtocol}`
  }

  const index = h1Match.index ?? 0
  const insertAt = index + h1Match[0].length
  return `${withActionProtocol.slice(0, insertAt)}\n\n${PLATFORM_TOOLS_RUNTIME_GUIDANCE_BLOCK}${withActionProtocol.slice(insertAt)}`
}
