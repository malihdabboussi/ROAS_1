# Changelog - July 14, 2026

## [2026-07-14 20:00] - [FIX]

What: Closed the Nate/Impact campaign-brain failure class end-to-end: wire Team2 `assignedCampaigns`/`generalCampaignId` into `AgentChatPanel` (preference was dead on `/team`); auto-remount General chats onto a single assigned campaign on send; reject General as `search_campaign_brain` target; allow cross-scope campaign brain reads with `campaign_name`; remove vibey-api "NEVER pass campaign_id" contradiction.
Why: Screenshots showed circuit-broken + empty Impact brain id because Team2 never passed assignment props, sessions stayed on General, and tools/skills fought passing a client campaign_id.
Impact: Nate + single assignment (Impact) remounts off General on send; `search_campaign_brain` works even from wrong scope when campaign_id/name provided; Fly redeploy required; web UI requires ROAS web deploy.
Files: `Team2ManageContent.tsx`, `Team2DetailView.tsx`, `ChatTab.tsx`, `Team2AgentChatWithConversations.tsx`, `agent-chat-panel.send.ts`, `agent-chat-panel.logic.ts`, `artifact-brain-search-actions.service.ts`, `artifact-action.registry.ts`, `artifact-action-schemas.ts`, `vibey-api-skill-generator.ts`, atlas `vibey-api` skill refs


## [2026-07-14 19:45] - [FIX]

What: Fixed Nate skill-1 failing with fake "brain read pathway is circuit-broken" when the Team chat was on **General** and the agent never called `search_campaign_brain`. New Team chats for assigned agents now prefer the assigned campaign (Impact) over sticky General; `list_available_brain_scopes` returns `scope`/`campaign_id`/`campaign_brains`; skill/ROLE/docs/circuit recovery push `search_campaign_brain`.
Why: Screenshots showed Impact brain id as empty and circuit language while tool history only had failed agent/company brain reads on a General-scoped conversation — auto-inject could never hit the Impact campaign brain.
Impact: Create a **new** Nate chat (should attach to Impact), re-run skill 1; expect `search_campaign_brain` with Impact campaign_id. Web UI change ships with web deploy; agent-api/OpenClaw already redeployed on roas-runtimes; skill_library + Nate ROLE.md updated in DB.
Files: `agent-chat-panel.logic.ts`, `use-agent-chat-campaign-controller.ts`, `AgentChatPanel.tsx`, `artifact-brain-read-actions.service.ts`, `artifact-brain-scholar.repository.ts`, `vibey-api-action-docs.ts`, `workflow-circuit-classifier.ts`, strategist `SKILL.md`/`ROLE.md`


## [2026-07-14 15:16] - [FIX]

What: Split brain/memory workflow circuit classes so wrong-family brain *reads* (e.g. `search_agent_brain` / `search_company_brain`) no longer open a shared `memory_save` circuit that blocks `search_campaign_brain`.
Why: Nate's old Impact thread burned the `memory_save` failure budget with Agent/Company Brain reads, then "try again" hit `WORKFLOW_CIRCUIT_OPEN` and he falsely told the user the "brain read circuit" was down — while `search_campaign_brain` itself still returned Impact memories.
Impact: Campaign brain search has its own circuit class (`brain_campaign_read`). Start a new Impact chat with Nate for a clean circuit; redeploying `roas-runtimes` with this classifier fix.
Files: `apps/openclaw/src/agents/workflow-circuit-classifier.ts`, `workflow-circuit-classifier.test.ts`, `workflow-circuit-breaker.test.ts`

## [2026-07-14 15:12] - [FIX]

What: Stopped the global chat rail from auto-opening on navigation — team agent URLs only sync agent/work context; HQ rail Team/Spaces/Brain/Flows clicks, hub Flows, Flows page, and channel pages no longer call expandAndFocus.
Why: Opening an agent (and other routes) forced the chat sidebar open even when the user only wanted to browse the page.
Impact: Chat stays collapsed while navigating; it still opens when the user clicks Chat or other explicit chat actions (composer seed, voice, presentation import).
Files: `GlobalChatLayout.tsx`, `SidebarHqRail.tsx`, `SidebarHqHubMenuContent.tsx`, `FlowsPage.tsx`, `home/channels/[id]/page.tsx`, `.docs/logs/changelog2026-07-14.md`
