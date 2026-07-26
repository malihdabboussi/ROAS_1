# Missions harness

Last updated: 2026-07-26

## Full subtask workspace

Mission subtasks open inside the same full-size detail shell as their parent Mission. A subtask row in a Space Mission list opens that subtask directly; selecting a subtask inside the Mission swaps the shell in place instead of stacking a smaller modal.

The subtask workspace includes its status, assignee, latest execution stream, plan intent, issue detail, agent output, scoped Activity timeline, and only the deliverables mapped to that subtask. Human approval gates expand that workspace into a review surface with the completed dependency chain, compiled deliverables, contributors, resource links, the expected next state, and explicit `Approve & continue` and `Request changes` actions. Dependency-scoped images appear inline as numbered, clickable thumbnails with their saved prompt; funnels, presentations, ads, social posts, and websites use inline previews; documents remain clickable deliverables. Gate feedback uses the shared Activity composer as its only input. Subtask guidance sent from Activity is prefixed with the subtask title and id so Vibey routes it to the correct step. The parent Mission remains the source of all deliverables.

While an agent subtask is running, persisted partial output appears as live work in both the subtask workspace and its execution activity. This makes progress recoverable after a refresh or missed realtime broadcast. A tool-created deliverable whose normalized title and agent match the active subtask appears immediately, before the final completion payload adds its durable subtask link. Once that deliverable exists, the active status reads `Finalizing` until verification completes.

Successful artifact tool receipts persist their `deliverable_id` in the subtask execution checkpoint. Mission Control uses that durable receipt immediately, so draft work remains attached to its subtask even if contract verification later blocks the task. Deliverable titles are prefixed with the originating non-human task number (`Task N — …`); human approval gates do not consume task numbers, and multiple artifacts from the same task share its number. Deliverable list rows show the artifact's local creation date and time.

The header displays `Mission > Subtask`. Selecting the Mission breadcrumb returns to the parent without closing the detail shell. On mobile, the back button performs the same level navigation before closing the Mission.

## Playbook mission views

The Missions Space view now has **Mission List** and **Mission Views** surfaces. The list remains the operational table. Mission Views presents supported deterministic playbooks as action-oriented reports using one registry-backed phase contract rather than a custom page per mission.

The global **Start playbook** dialog exposes the same canonical Static Ad Production and IG Organic Video payload builders used by Ads Research. Static runs collect format, size, quantity, and exact-copy or write-for-me context. Video runs collect one or more scenes, footage strategy, exact sticker copy or write-for-me context, CTA, and an approved emoji. The dialog cannot submit either production playbook until its required copy and output selections are present.

- Ads Research reuses its visual evidence report, linked source documents, concept selection, and persisted production handoff.
- Webinar Fulfillment groups the existing subtasks and deliverables into Strategy, Copy, Creative, and Activation phases. Each phase links its native outputs and opens the exact subtask in Mission Details. The first unresolved human gate appears as the primary `Review now` action.
- Meta Ads Launch groups preparation, paused build, and activation.
- Meta Ads Audit groups analysis, recommendations, and applied verification.

The report does not duplicate mission state. Completion, current action, approvals, and outputs are derived from persisted `missions`, `mission_subtasks`, and `mission_deliverables`. Mission Details remains the execution and feedback authority.

## Mission execution leases and restart recovery

Active subtask execution uses `mission_subtasks.updated_at` as a renewable lease. OpenClaw stream activity renews the lease at a throttled interval, so a healthy long-running tool remains distinguishable from a worker process that disappeared.

Recovery behavior:

- The deterministic plan phase gives its internal Main API plan-persistence callback 30 seconds by default (`MISSION_API_REQUEST_TIMEOUT_MS`). A callback that stops responding is aborted and enters the existing Bull retry/failure lifecycle instead of leaving the Mission in `planning` indefinitely.
- The mission worker runs a stalled-work sweep immediately on startup and then every 30 seconds by default (`MISSIONS_RECOVERY_POLL_MS`). Operational loops and digests remain on the slower `MISSIONS_WATCHDOG_MS` schedule.
- Queued work and runtime startup have a six-minute lease by default (`MISSIONS_EXECUTION_START_LEASE_TIMEOUT_MS`) to cover queue delay, machine wake, and readiness before the first stream event. The state switches from `starting` to `streaming` on that first event.
- An active streaming execution lease expires after 90 seconds by default (`MISSIONS_EXECUTION_LEASE_TIMEOUT_MS`). Lease writes are throttled to 15 seconds by default (`MISSIONS_EXECUTION_LEASE_WRITE_MS`).
- Before reclaiming an expired subtask, the worker probes its OpenClaw session. An active session is left alone.
- Reclaim compares the row's exact `updated_at` value from the stale snapshot. If stream activity renewed it in the meantime, the update affects no rows and no recovery event is queued.
- A recovered row preserves completed actions, clears the dead `current_tool`, returns to `pending`, and requeues the stable execute intent. Failed outbox writes now fail the recovery sweep visibly instead of logging false success.
- Pending rows left between reclaim and enqueue retain `execution_status = queued` and use the startup lease. This prevents the orphan watchdog from creating a second execute intent while the first recovered Bull job is still waiting to claim the row.

With the defaults, a dead execution is normally eligible at 90 seconds and recovered on the next 30-second sweep, while real stream traffic keeps extending the lease.

## Personal mission human gates

Playbooks can include human approval subtasks on both organization and personal missions. Organization missions validate that the assignee is an active member who accepts agent-assigned work. A personal mission may assign a human gate only to the mission owner, and the same profile preference check still applies. Root-ready human gates enter `awaiting_human`; dependent gates remain pending until their dependencies complete. When dependency resolution publishes an execute event for a ready human row, the worker atomically activates it as `awaiting_human`, starts its SLA clock, emits the human notification event, and recomputes the mission rollup without calling OpenClaw.

An active human gate takes precedence over downstream pending rows in the parent Mission aggregate. If no agent subtask is actively executing, the Mission status is `awaiting_human`, even when later tasks remain pending behind the gate. Approval calls the dedicated human-completion endpoint, records a human deliverable, closes the gate, reopens an `awaiting_human` parent Mission to `todo` when an agent task becomes ready, and then publishes that task's execute event. Requesting changes sends scoped gate guidance and leaves the gate open until the revised package is approved.

## Public agent slug namespace

Personal public agent slugs share the `govibey.com` namespace with organization slugs. Organization slugs take priority:

- Worker routing checks `organizations.slug` before `profiles.public_agent_slug`.
- Profile settings reject a personal `public_agent_slug` that already exists as an organization slug.
- A broken or incomplete organization route does not fall back to a same-name personal agent slug.

This keeps `acme.govibey.com` owned by the `acme` organization namespace instead of being shadowed by a profile-level public agent slug.

## Mission access approval gate

Mission execution now treats missing agent capability as a user-resolvable access gate instead of a silent blocked state.

When a subtask has an `output_contract`, the execute worker still preflights the assigned agent before calling OpenClaw. Role defaults come from the shared agent-policy package; team grants and agent allows add to those defaults, while an explicit agent deny removes the domain and keeps the hard failure path. If the only problem is that the agent genuinely lacks the needed action domain for this mission, the worker creates a `mission_agent_access_requests` row and moves the mission to `awaiting_access_approval`.

The gate is mission-scoped:

- `mission_agent_access_requests` records the mission, subtask, agent, capability kind/id, reason, status, approver, timestamps, and metadata from the output contract.
- Approved rows are read by worker preflight as mission-local grants. They do not mutate team defaults, org permissions, or `agent_overrides`.
- The API exposes `GET /missions/:id/access-requests` and `POST /missions/:id/access-requests/approve`.
- Approval marks pending requests `approved`, reopens access-gated subtasks to `pending`, sets the mission back to `todo`, logs `mission.access_approval.approved`, and requeues `mission.subtask.execute.requested`.
- Mission Control subscribes to the access request table and shows an "Agent access needed" card inside the mission detail modal with the exact agent/domain pairs.

This fixes the class of failures where a campaign mission can plan correctly, assign the right worker, then produce no artifacts because the worker did not have permission to persist the required deliverable. The user now sees the missing access as the next decision rather than an empty blocked mission.

## Mission Harness assertion contract

Mission plans now support a first-class `content.harness` contract generated before subtask execution. The harness records context research, non-blocking clarification questions, assumptions, deterministic assertions, assertion coverage, and a validator plan.

The contract is carried through the system:

- **API persistence**: mission plan creation accepts `harness`; subtasks can include `assertionKeys`; persisted subtasks map planner assertion ownership onto DB UUIDs.
- **Worker execution**: subtask prompts include the assertion keys the worker is responsible for and require `assertion_evidence` in successful JSON output.
- **Review**: manager subtask review and independent quality eval receive the full harness context and must cite concrete evidence for must assertions before approval.
- **Mission Control UI**: plan detail surfaces context snapshot, assumptions, assertions, coverage, validator plan, and subtask assertion ownership; PDF export includes the same harness data.

This turns mission plans from task lists into validation-backed contracts: the manager can reject a deliverable for wrong evidence mapping even when artifacts exist, and the worker can append corrective validation subtasks without losing assertion context.

Operational notes from the first production-level local run:

- `mission_deliverables` verification now prefers deliverable IDs explicitly returned in `artifact_manifest` before falling back to latest mission artifact, preventing cross-subtask artifact races.
- Contract verification rejects mismatched `source_action` when the artifact records an action.
- Triage replacement preserves validation subtasks that depended on cancelled/replaced work.
- Local mission-worker tests should use local Redis or an isolated queue prefix for final review jobs; production workers can race production `mission_outbox` rows.

## Space-scoped mission visibility

Missions now support the same sharing model users already understand from Spaces and Docs:

- `missions.space_id` links a mission to the Space where it was created.
- `missions.source_space_item_id` optionally links the mission to the originating task/doc/item.
- `missions.mission_visibility` controls the access source: `private`, `space`, `shared`, or `campaign`.
- `mission_shares` stores explicit user/org shares with `view`, `comment`, `edit`, or `admin` levels.

Default behavior:

- Mission created from Space chat/action: `mission_visibility = 'space'`, `space_id` is set, and access inherits Space permissions.
- Mission creation from Space chat/action also ensures a `missions` Space view exists; the Spaces UI focuses that view after an agent-created mission and task-to-agent mission sends can open the Spaces new-mission modal.
- Mission created outside a Space: `mission_visibility = 'private'`.
- Campaign context (`campaign_id`) remains agent/reporting context and is not automatically the sharing boundary.
- Mission and subtask runtime session keys carry `campaign_id`, `space_id`, and `org_id` scope suffixes so tool-authored artifacts persist back to the same campaign and Space. Mission artifact creation refuses the legacy personal `General` campaign fallback when a mission session has no campaign scope.

Ads Research intake remains visibly owned by Blaze. The seeded Space chat opens a fresh `ads_manager` conversation, Blaze collects the research purpose, depth, and focus, then delegates the restricted `create_mission` action to Vibey with the exact Space, campaign, `input.playbook_id = ads-research`, and structured `playbook_kickoff`. Vibey is globally reachable for this system delegation and does not need a redundant campaign-team assignment. Blaze resumes the same conversation after delegation and links the created mission. Managed agents that attempt `create_mission` directly receive this delegation correction instead of instructions to leave the Space or create the mission manually.

API read paths use `MissionPermissionsService` to filter mission lists and redact sensitive fields for view-only access. Sensitive mission detail endpoints such as logs, plans, subtasks, and deliverables require edit-level access.

## Mission Runner V2 contracts

Mission subtasks can now carry an explicit output contract in `mission_subtasks.output_contract`. Contract state is tracked with `contract_status`, `contract_verification`, `preflight_attempts`, and `correction_attempts`.

The runner uses this as a deterministic gate:

- **Preflight before execution**: if a subtask requires an action the assigned agent cannot perform, the worker records `mission.subtask.preflight_failed`, increments `preflight_attempts`, and routes to manager/Vibey triage before blocking the user.
- **Execution prompt contract**: when a contract exists, the execute prompt includes `OUTPUT_CONTRACT` with the required artifact kind, action, artifact type, and expected metadata. The agent is told not to use another artifact type as fallback.
- **Temporal reference**: every Mission OpenClaw instruction packet includes the exact current UTC timestamp. Agents compare full calendar dates against that value before labeling an event or deadline past, current, or upcoming; an explicit campaign timezone takes precedence when present.
- **Native Doc exclusivity**: a contract requiring `save_document` publishes only the editable native Doc. PDF, DOCX, and other file-export companions are forbidden unless the output contract explicitly requires that file action.
- **Webinar pre-call-first lifecycle**: every new Webinar Fulfillment mission runs the complete flow beginning with Atlas context preparation and Reed's pre-call strategy map. After the human confirms the call happened, Atlas automatically lists connected Fathom meetings and ranks candidates by calendar invitee email/domain, invitee names, title/topic, scheduled or recording time, and transcript mentions. The user does not need to choose from a recording picker; Atlas asks for one distinguishing detail or direct link only when the best candidates remain genuinely tied. Kickoff transcripts, call links, and research enrich the flow but cannot skip pre-call work; legacy `start_at` values are ignored.
- **Research before THE PLAN**: Webinar Fulfillment runs Blaze's Market Research immediately after post-call strategy and before Reed creates THE PLAN. Research records the platform service/action and source links; an integration may be called unavailable only after a real failed tool attempt with the returned error recorded. THE PLAN consumes the completed research document instead of rerunning or guessing at provider availability.
- **Webinar Copy Package readiness**: `WEB#5A - Copy Package` runs topics, email/SMS, Meta ads, and client-filmed scripts through `dylans-super-voice`, then performs a package-wide zero-em-dash and anti-AI rejection check before saving. Copywriter hires and existing Webinar copywriters default to Claude Opus 4.8, carry Dylan Super Voice as an always-loaded writing rule in `TOOLS.md`, and stop if the skill is unavailable. The final Launch Bible preflight also rejects any client-facing tab containing an em dash so invalid source copy cannot be silently compiled. Ads publish as continuous ad text rather than Hook/Body/CTA fragments. Video scripts publish as unquoted Script, Shooting instructions, and Overlays blocks with one shared Post-production section; scripts and overlays contain exact lines in spoken order instead of editing timestamps or time ranges. The final Launch Bible preflight independently rejects both clock ranges such as `0:00-0:05` and duration ranges such as `0-3s` while allowing factual event times such as `10:00 AM Pacific`. `WEB#5B - Landing Page Copy` runs `roas-landing-page-copy` as its own Mission step and native Doc, and the funnel consumes that handoff directly. Existing copywriters receive the refreshed skills during migration; `human-written-copy` remains removed.
- **Meta Ads Launch playbook**: Missions can start a dedicated launch flow that reconciles approved Space and external assets, enriches the kickoff with the mapped PageGrader Meta context when available, requires human approval of the exact account and launch settings, then lets Blaze build campaigns, ad sets, and ads in PAUSED state. A launch created from Ads Research also carries the source mission id, source deliverable ids, approved concepts, and recording/design route. Blaze must read that persisted approval and cannot silently substitute concepts. A second human gate reviews and activates the build manually. PageGrader remains read-only; Vibey owns Meta mutations and native Doc audit history.
- **Meta connection routing**: Ads Research, Meta Ads Audit, and Meta Ads Launch check the native Meta route first. When the account is connected through Composio and the native route has no direct token, Blaze resolves the live Meta integration and uses only the exact read or mutation actions returned by the integration catalog. The playbooks do not call the account disconnected until every applicable route returns a structured failure.
- **Mission Meta authentication**: Mission and subtask runtimes mint a short-lived user session before calling native Meta actions. Connected organization-level Meta accounts therefore remain available to Blaze even though background mission execution has no interactive chat token; the integration's stored OAuth credentials remain server-side.
- **Meta insights hierarchy**: `get_meta_ads_insights` keeps `campaign_id` bound to the active ROAS campaign UUID at every level, converts supported date presets into exact inclusive UTC ranges, and uses the parent response `row.id` as `ad_campaign_id` or `ad_set_id` when drilling down. Meta numeric IDs remain evidence fields and cannot replace workspace scope.
- **Meta Ads Audit & Optimization playbook**: Missions can start a dedicated Blaze-owned audit that verifies the client and actual success event, compares live objective-specific performance, produces prioritized recommendations with exact object IDs and guardrails, and stops at a human approval gate. The cycle can remain recommendation-only or apply a bounded approved set through native or Composio Meta, never activate paused objects, and then verify the resulting state and next measurement window.
- **IG organic video rendering**: The production skill calls the server-side `process_media` action with `operation: render_ig_story`. The server applies the bundled Pillow layout with Montserrat ExtraBold Italic and Apple Color Emoji, then uses FFmpeg to return and register a 1080x1920, exactly 10-second H.264/AAC MP4. Mission agents do not need shell access or a materialized workspace script.
- **Ads Research visual proof**: Competitive research must persist at least three mission-linked saved searches and 12 unique visual references. Duplicate ads across queries do not increase the count. The worker verifies those saved searches and visual identities before accepting the research document, so a documents-only run stays in correction instead of completing. Blaze assembles the complete market research Doc before one final save so failed draft-rewrite loops cannot leave a partial deliverable behind.
- **Ads Research copy proof**: The recommended-ad copy and video-script output contracts inspect the final native Doc content and require zero literal or encoded em dashes. Dylan Super Voice remains the only writing authority, while the deterministic verifier prevents a prompt-only voice rule from silently passing invalid client-facing copy.
- **Verification before done**: after execution, the worker verifies the required artifact exists. `document_artifact` checks tool-authored mission deliverables by type; `agent_skill` checks `agent_skills` by `agent_key` and `skill_key`. Missing/wrong artifacts keep the subtask out of `done`.
- **Concurrent verification stays subtask-safe**: when parallel subtasks publish different artifact types, verification first uses the manifest receipt and then searches recent deliverables matching the current contract type/action. A newer deck can no longer make a completed funnel fail verification, or vice versa.
- **Media-complete webinar funnels**: Market Research populates the active campaign Theme with verified brand/media references before production. The native webinar funnel waits for generated concepts, attaches resolved campaign media to its HTML bundle, and blocks on missing named assets rather than emitting placeholders. Funnel contracts reject bundles with no attached assets or visual placeholder text.
- **Mission funnel idempotency**: `create_funnel` stores the owning mission/subtask identity and reuses that funnel during retries and corrective runs. A database uniqueness constraint closes concurrent retry races, so one Mission step cannot create multiple funnel variations.
- **Mission image persistence**: `generate_image` stores Space/campaign ownership without copying the mission/subtask UUID from the runtime session into `media_assets.conversation_id`. Mission images therefore register in Space Media and persist as image deliverables without requiring a chat conversation row.
- **Qualification-safe image production**: Webinar image briefs must lock the target and excluded audiences, offer/funnel stage/delivery format, required approved assets, two independent audience cues, and a two-second who/offer/why-now check before generation. Missing identity or platform assets named by strategy block the brief instead of producing a generic substitute. Generation rejects category-ambiguous business metaphors, passes approved asset references and requested ratios, and never redraws logos or invents people.
- **Final Webinar Launch Bible**: Task 16 reads the approved Mission deliverables, makes a native copy of the ROAS Launch Bible master, preserves the complete tab tree, and replaces each copied tab body with clean campaign-ready content. Template prompts, example copy, empty placeholder sections, prior-project text, consecutive duplicate lines, and editing timecodes in Ad Scripts are rejected or removed at their owning source. Inserted text receives a clean Arial body style before headings, emphasis, and lists are reapplied, preventing inherited underline, highlight, footer, prompt-box, or table-cell formatting. P4 contains only on-page replay landing-page copy; replay delivery and post-webinar email/SMS sequences belong in 7 - SMS & Emails. The Overview includes client details and direct links to native production assets; genuinely missing work remains explicitly labeled instead of being invented.
- **Deterministic Validate Messaging statics**: Webinar Task 9 reads only the approved identity-callout set, renders each line through the bundled `roas-ad-design` renderer as light, dark, and bold PNGs, and batch-registers every cut as numbered native Space Media. The batch result emits every image immediately and reconciliation retains up to 25 recent media rows, covering the standard 15-cut package. The output verifier enforces the contract's minimum image count, so the task cannot substitute generic headlines, complete with a visual Doc/Presentation, or finish after only a partial image batch.
- **Managed Meta ad assembly access**: Agent roles containing Ads, marketing, creative, design, copy, brand, media, or social language resolve to the managed marketing domain. Blaze's Meta Ads Manager role therefore inherits `write_marketing_artifacts`; Task 14 can create approved native ad records without asking the mission owner for redundant access approval.
- **DOCX deliverables**: Word documents use `create_docx`, persist as `mission_deliverables.type = 'file'`, and carry `mime_type = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'`. DOCX-specific contracts use `required_artifact_type = 'file'` with `expected.mime_type` and `expected.source_action = 'create_docx'`.
- **Correction loop**: missing or wrong artifacts can trigger a clean corrective run with previous output and verifier evidence. Permission/capability failures route to Vibey/manager instead of retrying the same agent. Attempt counters cap repeated loops.
- **Retry dependency invalidation**: retrying a completed subtask also resets every active downstream dependent, including an open human gate, clears stale contract verification, and reopens an `awaiting_human` parent Mission. The root task reruns first, then the corrected dependency chain advances normally instead of leaving the retry event undispatchable behind the old gate.
- **Review guard**: review blocks if any completed subtask has an output contract that is not `verified`; manager quality review cannot approve an unchecked artifact.

## Task deliverable preview exports

Task detail deliverables use the shared deliverable preview workspace used by Mission Control. Previews opened from inside a Mission or one of its subtasks appear as centered modals over the still-visible Mission workspace; they are not resizable side docks. General previews outside Mission/task context continue to slide in from the right below the app top bar, open at 45% of the viewport, resize from the left edge, and expand to full screen. Space-backed docs mount the canonical editable Space editor inside either presentation, including Doc/Visual modes, the fixed rich-text toolbar, collapsed Fields, and autosave routed to the document's owning Space. `Open in Space` opens the same source item in its full Space destination. Agent `artifact_preview` activity blocks are normalized into `MissionDeliverable` entity pointers before preview, so entity-backed artifacts load their source row before export.

The preview groups destination, Copy, downloads, expand/collapse, and close in the document header. Native Space docs also expose `Export to Google Docs`; the first export creates and opens the Google Doc and persists its file identity on the Space item, while later clicks reopen the same Google Doc. Text documents expose `Download as Markdown` and `Print as PDF` from the Copy split menu. Presentation entities expose HTML, PDF, and PowerPoint downloads; non-presentation entities keep PDF, Markdown, and JSON downloads. Direct file actions remain available for file-backed deliverables. Toolbar icon help uses the portaled tooltip component so nested task modals do not clip tooltip text.

## Mission attachment asset references

Mission attachment uploads now return a normalized `asset_ref` next to the existing `url`, `path`, and `asset_id`. The reference includes the asset id, bucket, storage path, resolved URL, MIME type, asset type, campaign/org scope, and source surface.

Data flow:

- Presigned media uploads finalize a `media_assets` row through `POST /api/media/confirm` and return `asset_ref`.
- Mission creation attachment uploads preserve that `asset_ref` on the client so the mission payload can carry both the display URL and stable asset identity.
- Direct mission attachment uploads to `POST /api/missions/:id/attachments` build the same `asset_ref` from the registered `media_assets` row.
- Campaign uploads through `POST /api/media/campaigns/upload` now register a `media_assets` row and return `asset_id`, `asset`, and `asset_ref` while keeping `url` and `path` for existing callers.

This gives users and agents one stable file reference after upload instead of a URL-only object that may be hard to reconnect to indexing, permissions, or later tool actions.

## Vibey-only mission manager actions

Mission management controls now have a dedicated `mission.manager` action family and `manage_mission_control` domain. These actions are owned by Vibey only and are not user-policy-addable:

- `answer_mission_question`
- `summarize_mission_state`
- `attach_mission_context`
- `show_mission_deliverable`
- `create_mission_subtask`
- `edit_mission_subtask`
- `cancel_mission_subtask`
- `retry_mission_subtask`
- `reassign_mission_subtask`
- `prepare_mission_replan`
- `approve_mission`

Worker agents still use normal artifact/task actions. Vibey uses mission-manager actions to answer the user and control mission state, then delegates actual work through the capability-aware mission plan.

## Org Agent Runtime Readiness

Org onboarding stays fast: the API creates the org team in the database and triggers runtime sync in the background. The first message to an org agent is protected by a lazy runtime readiness guard in Agent API.

Before channel-agent execution streams through OpenClaw, Agent API checks the resolved runtime agent id, local OpenClaw config, canonical org/user workspace path, identity files (`SOUL.md`, `ROLE.md`, `IDENTITY.md`), and the scoped `vibey-api` runtime surface. The runtime surface requires both generated files: `skills/vibey-api/SKILL.md` for agent instructions and `skills/vibey-api/ALLOWED_ACTIONS.json` for the actual OpenClaw `vibey_backend` action enum. If any check fails, Agent API runs one targeted sync for that agent (`syncOrgAgent` for org agents, `syncAgent` for personal agents), then rechecks once. Successful readiness is cached briefly per agent so normal chat stays fast.

Mission-worker OpenClaw calls use the same readiness guard through the internal `POST /api/agents/:agentKey/ensure-ready` endpoint after resolving the gateway agent id and before starting the trace/model request. The endpoint normalizes an unscoped personal gateway id like `atlas` into `user-{userId}-atlas` when `AGENT_RUNTIME_MODE=shared` and a user id is present, while preserving explicit scoped ids from callers. Brain ops, mission execution, planning, review, and quality-eval calls therefore repair missing runtime identity/tool files before OpenClaw can build a generic fallback prompt or expose an unscoped action list.

Brain import execution uses the same rule. Before Atlas processes an import chunk, both the Agent API runtime executor and the Main API brain-job gateway resolve the scoped gateway id (`org-{orgId}-atlas` or shared personal `user-{userId}-atlas`), call `ensure-ready`, then send OpenClaw `model: openclaw:{gatewayAgentId}` with the matching `x-openclaw-agent-id`.

This prevents a new org agent from running with the generic fallback prompt when the DB row exists but local runtime files have not landed yet. Runtime traces persist both the base `agent_key` and the resolved gateway agent id so admin tooling can tell personal and org agents apart.

Mission worker wake calls use the same machine readiness path and now allow a longer configurable wait (`MISSIONS_ENSURE_MACHINE_TIMEOUT_MS`, default 285 seconds) so cold-started or image-updated runtimes can become ready before mission execution fails.

## Designer UI Component Skill

The system designer agent now has a dedicated `ui-component-design` skill for product UI component work. It covers component blueprints, design reviews, interaction states, responsive behavior, and implementation-ready handoff notes for modals, panels, forms, navigation, dashboards, and other product surfaces.

The skill is registered in the designer OpenClaw runtime skill list and seeded as a system `agent_skills` row with a `references/component-design-system.md` resource. Mission contracts that require an `agent_skill` artifact can verify the designer skill by `agent_key = designer` and `skill_key = ui-component-design`.

## Shared Railway Runtime Routing

Mission and Brain worker calls can now use the shared Railway Agent API/OpenClaw runtime when a user's profile is configured with `agent_runtime_type = shared_railway` and `agent_runtime_url`.

Routing behavior:

- Mission worker OpenClaw execution prefers `agent_runtime_url` and sends requests with `machineId = null`, so it does not force-wake Fly.
- Main API `UserAgentApiService` uses the same profile fields for background/channel/mission gateway calls and skips `MachinesService.ensureRunning` for shared Railway targets.
- Brain import jobs and cross-pollination matching do not pre-wake Fly; their Atlas calls route through `MissionAgentGatewayService` and `UserAgentApiService`, with runtime readiness checked before the OpenClaw request.
- Fly remains the fallback when the profile is `fly_machine`, when `agent_runtime_type` is missing, or when `shared_railway` is set without `agent_runtime_url`.
- Mission state patching resolves the runtime target before wake; it wakes Fly only when the resolved target has a `machineId`.
- Mission worker runtime identities now match Agent API shared runtime IDs: org agents use `org-{orgId}-{agentKey}`, and personal agents use `user-{userId}-{agentKey}` when `AGENT_RUNTIME_MODE=shared`.
- Mission worker jobs now register under runtime queue names: `agent-runtime-queue-mission` for mission outbox work and `agent-runtime-queue-brain` for Brain ops. Concurrency is configurable with `AGENT_RUNTIME_MISSION_CONCURRENCY` and `AGENT_RUNTIME_BRAIN_CONCURRENCY`.

## Runtime token guardrails

Mission OpenClaw requests default to a 32,768-token output ceiling. This is a ceiling, not a target, and does not change the selected model, agent instructions, available skills, or tool permissions for ordinary Mission execution. A caller can apply a smaller ceiling for a bounded internal workflow.

Customer Brain pattern analysis is one such bounded workflow. Its first pass uses Opus 5 at medium reasoning with the relevant recent memories, belief and perspective summaries, discriminator axes, organization, and offers. It sends that compact packet with `tool_choice: none` and an 8,192-token output ceiling, so neither client tools nor native Vibey tools are exposed for the routine JSON decision.

If Opus requests an existing belief or perspective's older evidence, or proposes a challenge, resolution, archive, or perspective synthesis, the worker resolves only the referenced supporting memories, capped at 80. A second tool-free Fable 5 pass reviews the compact packet, initial decision, and targeted older evidence at medium reasoning. Fable must return a complete final decision with no unresolved evidence request; otherwise the worker refuses to write. The returned JSON still passes ID, evidence, distinct-customer, duplicate-belief, and write-threshold validation before Brain state changes.

Full-library user and agent worldview synthesis is itself a high-stakes Brain operation, so it uses Fable 5 at medium reasoning while retaining Brain retrieval tools. Its workflow starts from INDEX, recently changed pages, and compact belief/perspective lists, then searches only the exact older belief or tension needed for an uncertain lifecycle decision. Routine library sync, lint, Mission work, and interactive chat do not inherit the Fable escalation.

- Mission OpenClaw calls include explicit workload lanes: `mission:{missionId}`, `mission:{missionId}:subtask:{subtaskId}`, `mission:{missionId}:eval`, and `brain:{orgOrUserId}:{outboxId}` for Brain ops. This keeps long mission and Brain runs out of OpenClaw's default `main` lane.
- Brain import jobs now dispatch through `agent-runtime-queue-brain-import`. Mission-worker owns the queue processor: sweep jobs call the API internal due-job endpoint, and concrete import jobs call the API internal process endpoint. The API remains the durable `brain_import_jobs` state owner and Atlas import service. Execution uses `AGENT_RUNTIME_BRAIN_IMPORT_CONCURRENCY`, `AGENT_RUNTIME_BRAIN_IMPORT_PER_USER_CONCURRENCY`, and `AGENT_RUNTIME_BRAIN_IMPORT_BATCH_SIZE` caps. Each Atlas import call uses `brain-import:{jobId}` as its OpenClaw lane. Sweep calls retry transient Main API enqueue failures with `AGENT_RUNTIME_BRAIN_IMPORT_MAIN_API_MAX_ATTEMPTS` and log path, origin, status, attempt, and retryability context when the upstream request fails.
- Mission-worker Bull Board at `/admin/queues` monitors the five active runtime queues: chat, mission, Brain ops, Brain import, and automation. Mission/Brain use the mission-worker Bull connection; chat, Brain import, and automation use the agent-runtime Redis resolver and shared queue prefix.

The Fly machine reconciler also recognizes `AGENT_RUNTIME_MODE=shared` as an ownership marker. A started shared runtime is not treated as orphan drift merely because it has no per-user `profiles` row or `machine_pool` row; profile, pool, and genuinely unowned non-shared machines keep their existing reconciliation behavior.

## Directive flexibility (manager + worker)

- **`SubtaskAbortRegistry`** (mission-worker singleton): subtask execute registers the execution `AbortController`; `cancel_subtask` / `reassign_subtask` (when the subtask was `in_progress`) calls `abort()` so the OpenClaw stream stops immediately.
- **Internal manager API**: `edit-subtask` rejects only `cancelled`; `retry-subtask` allows `blocked`, `done`, `revision`, `pending`, and `in_progress`, and flips mission `blocked`/`failed`/`error`/`review` → `in_progress`; `append-subtasks` flips `review`/`done`/`blocked`/`error`/`failed` → `todo` (clears `error` when leaving `error`/`failed`).
- **Retry convergence**: comment directives compare the subtask status they planned against with the current status before acting. If triage or another recovery path already moved blocked work to `pending`/`in_progress`, the later directive converges without aborting it. A directive that began while the subtask was already `in_progress` still performs abort-and-retry for intentional mid-run steering. Triage `retry`/`reassign` decisions do not run a second ready-subtask sweep because the manager retry endpoint already enqueues execution.
- **Replacement safety**: triage validates replacement work before cancelling anything. If cancelling the blocked subtask would also cancel ordinary downstream work, the worker converts the replacement into a full replan instead of truncating the mission. Validation-only dependents can still be cloned onto a local replacement.
- **Execute phase**: mission is runnable unless status is `done` or `backlog` (so `review`/`blocked`/etc. can still run queued subtask work as needed).
- **`enqueueReadySubtaskEvents`**: dependency resolution uses status for **all** subtasks (including `cancelled`) so dependents of cancelled deps unblock.
- **Outbox dispatch**: `mission.subtask.*` events use an expanded mission-status allowlist (`blocked`, `error`, `failed` included) so execute/triage rows are not stuck retrying.
- **Review recovery**: `mission:{id}:review:all-subtasks-done` uses `requeueExistingDedupeKey`; scheduler **`detectStuckReviewMissions`** re-enqueues `mission.review.requested` with dedupe `mission:{id}:review:stuck-recover` when mission is stale `review` and every subtask is `done` or `cancelled`.

## Mission ↔ task sync (Kanban)

Database triggers (see `supabase/migrations/20260321194500_mission_harness_task_triggers.sql` and follow-ups):

- **`sync_mission_to_task`**: Creates/updates the linked `tasks` row when `missions.status` changes (e.g. `planning` creates task; `todo`/`in_progress`/`review`/`done`/`blocked` update task status; transitions to `inbox` propagate for retry flows).
- **`sync_task_to_mission`**: Task status changes can update `missions.status` **except** while the mission is in `in_progress`, `planning`, `review`, or `todo` — avoids the board fighting the worker during active execution/manager phases.

**Data flow (summary):** `missions` (worker/API) ↔ `tasks` (UI) via triggers; worker drives `missions` + `mission_subtasks` + `mission_outbox`.

### Mission step ↔ Space Task sync

Concrete build work can set `publishToTaskList: true` on a Mission step. The persisted `mission_subtasks.publish_to_task_list` flag creates exactly one `space_items` row linked by `linked_mission_subtask_id`; title, status, owner, due date, description, and priority then follow the Mission step automatically. Human-owned linked tasks complete the exact Mission step through the standard human-completion endpoint, while agent-owned task status remains controlled by Mission execution.

The Webinar Fulfillment playbook runs a Build Checklist reconciliation step after strategy approval. Vibey compares THE PLAN Build List with the fixed production steps, adds only missing client-specific work, publishes those steps as Space Tasks, and adds their IDs to the Media Plan dependency list. Published human work appears once in Your Turn through its Space Task rather than as a duplicate Mission-subtask row.

## Outbox dedupe policy

- **Stable `dedupe_key`** for a single logical event (e.g. `mission:{id}:review:all-subtasks-done`) so retries/races do not spawn duplicate Bull jobs.
- **`requeueExistingDedupeKey` / `requeue_existing_dedupe_key`**: On conflict, reset the row to `pending` so watchdogs and recovery paths can re-fire the same intent.

## User comment directive

When a user posts a **mission comment** (`user.comment` log), the API always enqueues **`mission.comment.directive`** with dedupe key `mission:{id}:directive:comment:{commentLogId}` and payload `comment_id`, `comment_message`, `from_status`, `correlation_id`. It also writes `mission.comment.triage.requested` for audit (`reason: user_comment_directive`) **without** changing mission status for that step alone.

The mission worker handles outbox event `mission.comment.directive` as Bull phase **`directive`**: **Vibey** (`vibey`) runs an OpenClaw `mission_review` task, returns JSON `actions` + `rationale`, and the worker executes them via internal manager routes (`/manager/cancel-subtask`, `append-subtasks`, `edit-subtask`, `retry-subtask`, `mission-fields`, `prepare-replan`) or logs `note_only`. After mutating actions (except full `replan`, which enqueues plan via the API), the worker calls `enqueueReadySubtaskEvents` and `recomputeMissionStatus`. Status is not forced by the comment API path; rollup and directive outcomes drive `missions.status`.

## Advisory lock (API + worker)

`PostgresDirectService.withMissionAdvisoryLock` / worker `DatabaseService.withMissionAdvisoryLock` use the same `pg_advisory_lock(hashtext(mission_id))` key when **direct Postgres** is configured. Without `SUPABASE_DIRECT_DB_URL`, the API/worker skip the lock (no-op) but still mutate via Supabase.

## Pause semantics

**Awareness pause** sets `missions.status` to `backlog` and clears `current_agent_key`. `updateMissionStatus` runs `syncCampaignActiveWork` for the campaign. Outbox dispatch should skip non-runnable mission statuses (verify `missions.outbox-dispatcher` gate list in code). Pause is **mission-shelf** semantics: downstream surfaces depend on triggers + `has_active_work`; operators should confirm campaign/board state in logs if something still looks “active.”

## Direct Postgres / worker

When the mission worker starts **without** a direct DB pool, it logs a **single banner** listing degraded behavior (advisory locks no-op, scheduler PG fallbacks, etc.). Production runbooks should require `SUPABASE_DIRECT_DB_URL` for full parity.

If the direct pool hits a transport failure, the worker removes it from service before awaiting shutdown. Concurrent jobs therefore use existing Supabase HTTP fallbacks instead of acquiring a pool that is already ending.

## Decision Log

- 2026-07-26: Exposed Static Ad Production and IG Organic Video in the global Missions playbook selector so direct Space acceptance uses the canonical deterministic playbooks instead of generic missions.
- 2026-07-26: Moved IG Story sticker rendering behind the existing server-side media action so production missions receive a registered MP4 without depending on agent shell execution or workspace-relative files.
- 2026-07-26: Made direct Postgres pool disablement atomic so concurrent mission jobs cannot acquire an ending pool, and pinned IG organic video rendering to the materialized agent-workspace skill path.
- 2026-07-26: Routed compact Customer Brain synthesis through Opus 5, added bounded targeted older-evidence requests and conditional Fable 5 review for high-impact changes, and routed full-worldview/Avatar synthesis through medium-effort Fable while preserving targeted Brain retrieval.
- 2026-07-26: Made Customer Brain pattern analysis a bounded, tool-free inference because the worker already supplies its full evidence packet. Kept normal Mission tools and explicit Power model routing unchanged while reducing the default Mission output ceiling from 64K to 32K.
- 2026-07-26: Bounded and aborted the plan phase's internal Main API callback so a stalled callback cannot strand deterministic static-ad or IG organic video missions in Planning before execution.
- 2026-07-22: Applied the deterministic no-em-dash verifier to every Meta Audit and Meta Launch Doc rather than relying on the agent's claimed Dylan Super Voice compliance.
- 2026-07-22: Made corrective execution remove only the failed contract action and stale partial output from its checkpoint so agents can replace rejected artifacts without repeating valid reads or research.
- 2026-07-22: Added a dedicated Meta Ads Audit & Optimization playbook, native-to-Composio Meta routing, explicit human-gated mutations, post-change verification, and strict unique visual evidence plus single-save assembly for Ads Research.
- 2026-07-22: Made background mission and subtask execution mint a short-lived user session for native Meta calls so connected accounts work outside interactive chat.
- 2026-07-22: Clarified and preflighted Meta insight hierarchy IDs and made reporting-period presets resolve to exact dates.
- 2026-07-21: Removed the Webinar call-source picker from Gate 1. Atlas now resolves the client call automatically from Fathom invitees, email domains, names, title/topic, timing, and transcript evidence, with a narrow ambiguity fallback instead of requiring manual selection.
- 2026-07-20: Kept Ads Research intake under Blaze while routing the restricted mission-creation action through an internal Vibey delegation, preserving exact Space/campaign/playbook input and preventing Mission Control dead ends.
- 2026-07-20: Replaced ambiguous video overlay "moments" with exact untimed overlay lines, added no-timecode checks to the video-script skill and copy-package gate, synced platform-managed hired-agent copies, and made Task 16 reject editing timestamps and time ranges in Ad Scripts.
- 2026-07-20: Pinned copywriter agents to Claude Opus 4.8, moved Dylan Super Voice into the copywriter's always-loaded TOOLS contract, repaired existing Webinar copywriters during team reconciliation, and made Launch Bible compilation reject client-facing em dashes.
- 2026-07-19: Changed Task 16 from blank multi-tab reconstruction to native Launch Bible template copy-and-fill so final handoffs retain the master document's styling and topology.
- 2026-07-19: Made creative approval visual-first with dependency-scoped inline previews, numbered image prompts, one shared feedback composer, deterministic Validate Messaging PNGs in Space Media, complete batch reconciliation, and managed Meta Ads Manager write access.
- 2026-07-19: Made Webinar Fulfillment funnels media-complete and retry-safe by restoring Theme/media capture in research, waiting for generated images, routing through high-fidelity funnel design/build skills, requiring attached assets, rejecting visual placeholders, and reusing one funnel per mission subtask.
- 2026-07-19: Changed Launch Bible template fill from append-only insertion to full per-tab body replacement, removing template prompts and sample copy while preserving the native tab topology and normalizing inserted paragraph styles.
- 2026-07-20: Reset copied-template character formatting before applying Launch Bible headings and emphasis, collapse consecutive duplicate lines, and enforce the P4 replay-page versus tab 7 post-webinar message boundary.
- 2026-07-19: Made image-brief and generation steps qualification-safe across campaigns with audience/offer locks, approved-asset readiness, category-specific visual cues, factual live-platform treatment, and a two-second cold-viewer check.
- 2026-07-19: Separated mission image persistence from chat conversation identity so generated media can register through Space/campaign/mission ownership without violating the `media_assets.conversation_id` foreign key.
- 2026-07-19: Added the Meta Ads Launch playbook with PageGrader read-only discovery, Blaze-owned paused builds, native Doc manifests, and human gates before build and live activation.
- 2026-07-19: Added an authoritative execution timestamp to Mission prompts so relative-date claims do not depend on model knowledge or unrelated document timestamps.
- 2026-07-17: Split webinar Phase B into WEB#5A Copy Package and WEB#5B Landing Page Copy, made Dylan's Super Voice a verified requirement at every writing owner plus final assembly, and simplified client-facing ad and video-script formatting.
- 2026-07-17: Added one-to-one Mission-step ↔ Space-Task correlation for concrete build work and made Webinar Fulfillment reconcile THE PLAN Build List into missing, assigned, production-blocking steps before copy and production begin.
- 2026-07-17: Moved Webinar Fulfillment Market Research ahead of THE PLAN. THE PLAN now consumes the completed research document, and agent instructions forbid unsupported integration-availability claims.
- 2026-07-17: Human-gate approval now reopens an `awaiting_human` parent Mission before publishing newly eligible agent work, preserving the worker's guard against executing agents through a still-open human gate while preventing approved handoffs from dead-lettering.
- 2026-07-17: Removed Webinar Fulfillment restart modes. New and legacy kickoff payloads always expand into the full pre-call-first lifecycle, so supplied transcripts and research add context without bypassing the pre-call map or its human call gate.
- 2026-07-17: Reworked Webinar Fulfillment around explicit ownership and non-adjacent human gates: Atlas prepares context and call intake, Reed owns pre/post-call strategy and THE PLAN, Ivy delivers one complete Dylan's Super Voice Copy Package, Lux owns native ads/funnel/image briefs/10–20-slide Deck Bones, and Blaze owns market research plus the downstream media plan. Meta activation remains a separate explicit run.
- 2026-07-17: Made Mission and subtask deliverable previews centered modals over their originating workspace while retaining right-side slide-outs everywhere else.
- 2026-07-17: Replaced unsupported `/spaces/{spaceId}/{itemId}` deliverable links with the canonical Spaces query route and normalized previously persisted legacy links at open time.
- 2026-07-17: Unified Mission Space-doc previews with the canonical editable Space editor, changed Mission previews to right-side slide-outs, and preserved Mission actions plus full-screen expansion around the shared editor.
- 2026-07-17: Replaced the full-screen-only deliverable modal chrome with a docked artifact workspace, canonical `Open in Space` routing, grouped Copy/download actions, and explicit expand/collapse controls.
- 2026-07-17: Persisted structured artifact receipts during execution and used them to keep blocked drafts visible, number deliverables by originating task, and show creation timestamps.
- 2026-07-17: Replaced mission preflight's partial action-domain map with the canonical agent-policy registry and added playbook coverage so supported actions such as `create_ad` and `create_funnel` cannot be rejected as unknown.
- 2026-07-19: Replaced the execute worker's stale role-domain resolver with shared role defaults and additive policy merging, preventing managed creative agents from requesting human approval for their existing `generate_media` permission.
- 2026-07-16: Surfaced persisted partial execution output and matching tool-created deliverables during active subtask execution, with an explicit finalization state before verification completes.
- 2026-07-16: Completed the Webinar Copy Package capability set by seeding `roas-webinar-emails`, backfilling existing copywriters, and removing the section-2 capability blocker.
- 2026-07-16: Made human gates first-class review workspaces with upstream deliverables/resources, explicit approval and revision actions, and `awaiting_human` parent rollup precedence over dependency-blocked pending work.
- 2026-07-16: Made native Doc output contracts exclusive so mission execution cannot add PDF, DOCX, or other file-export companions unless explicitly contracted.
- 2026-07-16: Replaced the nested subtask popup with a full Mission-shell workspace, direct Space-list routing, scoped Activity and deliverables, and breadcrumb navigation back to the parent Mission.
- 2026-07-16: Made ready human-gate execute events perform the pending-to-`awaiting_human` transition, notification enqueue, and mission rollup instead of returning while leaving the gate pending.
- 2026-07-16: Allowed personal mission owners to receive human approval subtasks while continuing to reject other human assignees when the mission has no organization.
- 2026-07-16: Converted triage replacement into a full replan whenever cascade cancellation would erase ordinary downstream work, and moved replacement validation ahead of cancellation.
- 2026-07-16: Applied the startup lease to queued recovered subtasks so the stalled and orphan watchdogs cannot enqueue overlapping executions during ordinary queue delay.
- 2026-07-16: Preserved always-on Fly runtimes marked `AGENT_RUNTIME_MODE=shared` during machine reconciliation so the five-minute orphan cleanup cannot terminate active Mission streams.
- 2026-07-16: Coordinated concurrent triage and comment retries so a delayed "try again" directive cannot abort work another recovery path just started, and removed the duplicate triage execute enqueue.
- 2026-07-16: Replaced priority-based, 15-minute-only stalled-subtask recovery with renewable execution leases, immediate startup recovery, a dedicated 30-second sweep, exact-timestamp reclaim guards, and surfaced outbox failures.
- 2026-07-08: Added the designer `ui-component-design` system skill so product UI component work routes through a dedicated component design workflow instead of generic asset or page design.
- 2026-06-25: Runtime readiness now treats `skills/vibey-api/ALLOWED_ACTIONS.json` as required alongside `SKILL.md`, and internal ensure-ready normalizes plain personal ids to shared-runtime `user-{userId}-{agentKey}` ids when possible.
- 2026-06-21: Mission, mission-creation, and campaign upload paths now return normalized media `asset_ref` descriptors so UI and agents can keep file identity after upload.
- 2026-06-19: Space-scoped mission creation now ensures the Missions tab exists. Spaces chat focuses Missions after completed `create_mission` tool calls, and task send-to-agent mission mode routes users into the Missions tab/new-mission modal.
- 2026-06-18: Mission/subtask OpenClaw sessions now propagate campaign and Space scope into artifact creation. Mission artifact persistence resolves missing campaign suffixes from mission context and no longer falls back to a personal General campaign for mission sessions.
- 2026-06-18: Task deliverable previews now expose a visible export control for generated artifacts. Presentation previews in tasks share the presentation view's HTML, PDF, and PPT export paths, and toolbar tooltips render through the portaled tooltip component to avoid modal clipping.
- 2026-06-14: Moved Brain import queue execution into mission-worker while keeping API as the durable import state and processing endpoint owner. Bull Board still shows chat, mission, Brain ops, Brain import, and automation queues from `/admin/queues`.
- 2026-06-16: Added mission-worker runtime readiness preflight through Agent API so background Brain ops and mission calls repair missing agent identity before OpenClaw execution.
- 2026-06-16: Added the same scoped runtime readiness preflight to Brain import job execution paths before Atlas import chunks call OpenClaw.
- 2026-06-25: Added bounded Main API retry/context logging for mission-worker Brain import sweep calls so transient enqueue failures do not lose their upstream path, origin, status, or attempt evidence.
- 2026-07-22: Contract-correction executions must create and return a new compliant artifact; a previously rejected deliverable cannot satisfy the retried subtask.
- 2026-07-22: Document output verification now enforces the contracted title, resolves Space document manifest IDs to mission wrappers, and checks the current linked Space document body instead of a stale mirrored copy.
