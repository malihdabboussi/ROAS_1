# Page Grader Operator

Use this skill when a Slack or ROAS user asks about a Page Grader client,
campaign, fulfillment task, client meeting, portal memory, cached Meta
reporting, or asks for a client Service Request / fulfillment deliverable of
any type (design, copy, funnel/landing page, GHL, ad creative, video
edit/production, or general client work), including when the user says "make a
task", "ASAP", or names the human who should own that work.

## Source routing

- ROAS Brain is the primary reasoning and long-term knowledge system.
- Page Grader is the source of truth for Page Grader client records, portal
  campaigns, fulfillment tasks, client meeting copies, and its connected Meta
  reporting snapshots.
- Use the `Page Grader` MCP server when the answer depends on Page Grader-only
  data. Do not guess from a similarly named ROAS Space.
- An explicitly named Page Grader client overrides the current ROAS campaign
  context. Resolve that client first and pass its exact identifier to later
  tools.
- Resolve a named client across its own ROAS campaign Brain, Page Grader
  client/campaign records, and matching Slack channel context Pixel can access.
  Do not treat absence from the ambient chat campaign as absence from ROAS.
- When the current or forwarded Slack channel is a client channel (for example
  `#roas-yasir-khan-coaching-ltd-955`), treat that as the client. Prefer any
  `[Slack channel identity]` stamp. Otherwise call `page_grader_list_clients`
  with the channel-name tokens. If exactly one client matches, use it — do not
  ask which client.
- For an ambiguous or misspelled client, call
  `page_grader_list_clients` before another client-scoped tool.
- Cross-reference Page Grader facts with ROAS Brain when interpretation,
  strategy, brand voice, or historical reasoning is needed. State when the two
  sources disagree.

## Reading

- Use `page_grader_get_client_overview` for broad status questions.
- Use the narrow campaign, task, meeting, Meta, or intel tool for a specific
  question.
- Keep the source date in the answer. Meta results are cached snapshots, not
  live Meta API reads.
- If no snapshot exists or it is stale, say that plainly and offer the latest
  known reporting range.

## Taking action

- Infer Page Grader from the requested deliverable. When the user asks for
  design, copy, funnel/landing page, GHL, ad creative, video edit/production,
  or other client fulfillment — including "make a task" / ASAP phrasing — use
  Page Grader MCP even when the user names the human owner. Do not require the
  user to know or say "Page Grader" or "Service Request".
- In a Service Request / fulfillment request, "the portal" means The ROAS Portal
  fulfillment workflow. Do not generate a native ROAS platform funnel unless
  the user explicitly asks Pixel to build it in the ROAS platform funnel
  builder.
- When the user says "delegate to PageGrader", treat Page Grader as the
  connected MCP service, not as a ROAS AI agent. Call `list_mcp_tools` for the
  `Page Grader` server, copy the exact write-tool schema, then call
  `use_mcp_tool`.
- Do not call `delegate_to_agent` for Page Grader work. A human named in a
  fulfillment request is the Page Grader fulfillment assignee, not a reason
  to switch to a generic ROAS task. Resolve the person with Page Grader and
  pass the canonical name in `assignee_name`.
- Do not use `list_team`, `list_campaign_team`, `list_agents`,
  `brainstorm_agents`, `ask_agent`, or `delegate_to_agent` to resolve the human
  owner of Page Grader fulfillment. An empty ambient campaign team does not
  mean the person is unavailable in Page Grader.
- "Launch a campaign" means create a Page Grader campaign draft or a
  fulfillment launch request. It never means silently publish ads or begin
  spend. Call `list_mcp_tools` and use the exact live campaign-draft write
  (names such as `page_grader_create_campaign_draft`). Do not invent a tool
  name. After a successful campaign draft, the reply must include the
  `review_url` as a real openable https link. Follow-up questions belong in
  that review chat.
- Missing VSL, landing page, or creative assets are not create-blockers.
  Create the campaign, then add those as campaign tasks. If the live catalog
  has no campaign-draft write, use native `create_campaign`, post the returned
  `url`, and `create_task` for the missing launch work. Do not stop after a
  vague create rejection.
- Before a write, resolve or confirm the client and campaign. For a new
  campaign or launch, retrieve the named client's campaign Brain, Space, Page
  Grader, and relevant Slack channel context first, then ask only for missing
  details that block a safe draft. Do not invent the offer, objective,
  audience, launch timing, source assets, budget, owner, or due date.
- Build an idempotency key from the Slack event or ROAS action identifier so a
  retry cannot create a second campaign or task.
- When the user asks to get **several** fulfillment jobs done in one message
  (QC a funnel + check GHL + reset ads, "I need this done", a paste of 2+
  discrete tasks) for a named or channel-stamped client:
  1. Resolve the Portal client (`page_grader_list_clients` or the Slack
     channel identity).
  2. Resolve the Portal campaign with `page_grader_list_campaigns`. Prefer the
     campaign named in the message (for example the current webinar). If zero
     or many matches remain, ask **one** question: which campaign.
  3. Call `list_mcp_tools`, then `page_grader_create_delegation_preview` **once**
     with `client_ref`, the Portal `campaign_id`, `raw_text` (the full ask plus
     any quoted thread), and a stable `idempotency_key`.
  4. Reply with the returned `confirm_url` as a real openable https link. Tell
     the user to review and Confirm in The ROAS Portal. Do **not** say tasks
     were created. Do **not** loop `page_grader_create_fulfillment_request`.
- For a **single** Service Request type, discover the current MCP schema and use
  `page_grader_create_fulfillment_request` with the resolved `client_ref`,
  matching `task_type` (`design` | `copy` | `funnel` | `ghl` | `ad` | `video` |
  `other` | `general`), a stable `idempotency_key`, the resolved
  `page_grader_campaign_id` when the work belongs to a known campaign, and
  `assignee_name` when the user named an owner. Do not omit a known campaign
  (that leaves the Portal task unlinked). When the user did not name an owner,
  omit `assignee_name` so Portal From Pagegrader assignment rules apply.
  Format `description` as:
  - Line 1: a short title only (≤ ~100 characters; no scope dump).
  - Blank line.
  - Remaining lines: full brief, links, scope, and constraints.
  The portal uses the first line as the task title and the rest as the body.
  Never put the entire brief on one line.
  Never use native `create_task` for this class of work.
- A successful Service Request intake result is a draft review link, not an
  active task. The user-facing reply must include the resolved client name, the
  request title/type, that this is a reviewable draft awaiting confirmation,
  and the `review_url` as a real openable https link. Tell the user the request
  is ready for review in this chat or via that link. Never claim a ROAS task or
  ClickUp task exists until finalization returns the native task identity and
  the Page Grader receipt confirms the ClickUp mirror. Never reply with a bare
  "Created: …" native-task style message for intake.
- Report the persisted ROAS draft or finalized task and its current workflow state.
- Do not say a request was delegated or created until the MCP result confirms
  the effect and returns the created record or an equivalent durable result.
  If Page Grader is unavailable, report the blocker instead of describing the
  requested work as completed.
- If The ROAS Portal fulfillment fails, stop. Do not silently replace it with a
  generic ROAS task, a native funnel, another assignee, or another client.
- Use `page_grader_save_client_memory` only for sourced facts, decisions, or
  durable client preferences. Include a meaningful source title and source id.
- Never save an agent inference as a client fact without labeling and review.

## User-facing response

- Treat Page Grader, MCP, tool names, schemas, idempotency keys, routing,
  retries, and provider mechanics as internal implementation details.
- In user-facing replies, call Page Grader "The ROAS Portal" and call the AI
  platform the "ROAS platform".
- Never expose the internal name "Page Grader" in a user-facing response or
  Slack message.
- Do not narrate tool selection or execution between tool calls. Put progress
  only in structured tool labels.
- After the work finishes, return one concise result: what happened, who owns
  it, the relevant client or campaign, and the next step.
- If blocked, state one plain-language blocker or ask one focused question.

## Example routing

- "How are Christian's ads doing?" → find the canonical client if necessary,
  then use `page_grader_get_meta_performance`; include reporting range and sync
  time.
- "What happened with the Adam Lamb webinar?" → search client intel, recent
  meetings, campaigns, and open tasks as needed; answer with source dates.
- "Launch the new webinar campaign for Asura Group" → resolve Asura Group even
  if another campaign is active, list live Portal campaign-draft tools, create
  the draft or native campaign, and reply with the openable `review_url` or
  `url`. Missing VSL/landing-page assets become tasks in that campaign. Do not
  interview in Slack. State that nothing was published to Meta.
- "Delegate this Asura Group funnel to PageGrader" → list Page Grader MCP
  tools, select the exact fulfillment/campaign write tool, call it with Asura
  Group's resolved identifier, and report only the confirmed result.
- "I need this funnel built for Asura Group" → infer Page Grader, resolve Asura
  Group and its campaign, retrieve known campaign details, ask only for
  genuinely blocking missing information, then create the confirmed Page
  Grader work item.
- "Have Rafay build a funnel similar to this Impact funnel for Asura Group" →
  resolve Asura Group through its own campaign Brain, Page Grader, and matching
  Slack channel, keep the reference URL and known client context in the
  description, create a Page Grader funnel fulfillment request with
  `assignee_name:"Rafay"`, and report the confirmed record. Do not search the
  ambient ROAS campaign team for Rafay.
- "Need to make a task to edit these videos ASAP" in a client Slack channel →
  resolve the client from channel identity, create a Service Request draft with
  `task_type:"video"`, and reply with client name + draft confirmation +
  openable `review_url`. Do not call native `create_task`.
- "I need this done for Yasir's webinar: QC the funnel, check GHL automations,
  reset ads" → resolve Yasir + the webinar campaign, call
  `page_grader_create_delegation_preview` once, and reply with the openable
  `confirm_url`. Do not loop `page_grader_create_fulfillment_request`. Do not
  say the tasks exist until Confirm.
