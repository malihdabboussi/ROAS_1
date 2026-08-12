# Video as a Create Type — Workstream Plan

Scoped out of the "+ Create" menu work (Video was confirmed as its own workstream). Covers what exists, the three create flows, how Video surfaces in the menu, how the existing IG Organic Video mission expands into a general video-production system, and phasing. All paths relative to repo root.

---

## 1. Inventory — what exists today

### Generation: native `generate_video` already exists (bigger than expected)

A full async video-generation path is live on the agent side — no UI exposes it, but agents can call it today:

- **Action**: `generate_video` / `get_video_status` in `packages/agent-policy/src/actions.ts:165-166`, permission group `generate_media` (same as `generate_image`).
- **Implementation**: `apps/agent-api/src/modules/artifacts/services/artifact-legacy-media-generate.service.ts:359` (`generateVideo`). Providers: **Replicate primary, Google GenAI fallback** — model catalog in `artifact-legacy-media-provider.service.ts:17-24`: `veo-3.1-fast` (default), `kling-v3`, `seedance-2`, `gen-4.5`, `fabric-1.0` (veed — talking-head), `grok-imagine-video`.
- **Params** (agent docs `apps/agent-api/src/modules/agent-sync/data/vibey-api-action-docs.ts:1871-1883`): prompt, model, duration, aspect_ratio, resolution, `image_url` (first frame), `last_frame_url`, reference image/video/audio URLs, generate_audio, seed. First/last-frame control means **anchor-still → shot workflows work today**.
- **Async contract**: returns `{job_id, pending}` → row in `media_generation_jobs` (`supabase/migrations/019_media_generation_jobs.sql`) → agent polls `get_video_status` (~5 polls max) → on success uploads to Supabase Storage, inserts a `media_assets` row (`asset_type:'video'`), bills per `video_seconds`, and syncs a mission deliverable (`artifact-legacy-media-status.service.ts`).

### Processing: `process_media` is a real ffmpeg engine

31 operations in `apps/agent-api/src/modules/artifacts/services/artifact-media-processing-operation-catalog.ts`, including `concat`, `transition`, `add_audio`, `subtitle_burn`, `text_overlay`, `trim`, `speed`, `overlay`, `chroma_key`, `thumbnail` — i.e. **all the assembly primitives exist; nothing composes them**. The only real "assembly" today is `render_ig_story` (`artifact-ig-story-renderer.service.ts`): Pillow-rendered sticker overlay composited onto a source video, verbatim copy, approved-emoji whitelist.

### Higgsfield: connected MCP, not native tools

OAuth-connected remote MCP (`apps/api/src/modules/integrations/higgsfield/`, resource `https://mcp.higgsfield.ai/mcp`). Agents reach it only through generic `list_mcp_tools` / `use_mcp_tool`; no tool names are hardcoded. **Outputs are raw URLs** — they only become `media_assets` when piped through `process_media`. The steering prompt (`packages/agent-policy/src/platform-tools-template.ts:50`) says: native `generate_video` by default; Higgsfield when a skill explicitly routes there.

### The existing video mission — how it actually works (and what to generalize)

`IG Organic Video` in `apps/web/src/lib/spaces/quick-missions-catalog.ts:40-46` is **not chat seeding — it's a deterministic mission playbook**, and its architecture is the template for the whole video workstream:

1. **Kickoff form** → typed payload (`apps/web/src/features/spaces/components/playbooks/ig-organic-video.ts`): copy mode, scene selection, sticker copy, offer context.
2. **Scene library** (`apps/web/src/features/spaces/config/ig-organic-video-scenes.config.ts`): 6 industry packs, ~38 scenes, each with `promptSeed`, `musicVibe`, and **27 preset still/video URLs** (reuse-first; only sceneless gaps hit Higgsfield).
3. **Deterministic plan expansion**: `createMission({input:{playbook_id}})` → `apps/mission-worker/.../mission-plan-phase.service.ts:171-213` expands the registered playbook (`mission-playbook.registry.ts:40-53`) with no freeform LLM planning.
4. **Playbook** (`apps/mission-worker/.../playbooks/ig-organic-video-ad.playbook.ts`): one designer subtask whose prompt loads the DB-seeded skill; **output contract** enforces exact count, 9:16, 1080×1920, 10s, `operation: render_ig_story`, validated by an assertion (`ig-video-artifact-contract`).
5. **Agent skill** (DB `skill_library`, `supabase/migrations/20260723204214_ig_organic_video_ad_skill.sql`): 4 stages — Copy (with hard-stop approval) → Resolve footage (preset else Higgsfield) → Render stickers → QA + register in Media.

So the platform already has the pattern: **kickoff schema → preset library → deterministic playbook → output contract + assertion → skill as production authority**. Expanding video = adding more playbooks in this shape, not inventing a new mechanism.

### Scripts

- `roas-video-ad-scripts` (copywriter skill, `docker/agents/templates/copywriter/skills/roas-video-ad-scripts/SKILL.md`) writes scripts as Doc deliverables; used by `ads-research` and `webinar-fulfillment` playbooks.
- `roas-video-ads` (the Claude-side production skill: intake → script blocking → anchor stills → per-shot clips → VO → captions → CTA end card → assembly to exact runtime) **exists only as a user-level skill outside the repo** — nothing in the platform can invoke it. It's the spec for what the platform-side production playbook should become.

### UI

Space Media view (`apps/web/src/features/spaces/views/media/`) is already video-aware: image/video filter, video cards with `<video preload="metadata">` thumbs, real player in the slide-out (`MediaImageWorkspace.tsx:265`), video upload, realtime gallery updates scoped by `space_id` (`use-space-media.ts`). Chat and the shell artifact viewer both play video (`GeneratedMedia.tsx:131`, `ShellMediaArtifactViewer.tsx:221`).

### Gap list

| # | Gap | Where |
|---|-----|-------|
| G1 | **No TTS/voiceover** — no ElevenLabs client, no `text_to_speech` action (speech is Deepgram STT only) | agent-api |
| G2 | **No caption generation** — `subtitle_burn` burns an existing SRT; nothing produces timed captions from a script/VO | agent-api |
| G3 | **No assembly orchestration** — no shot-list model, no CTA end-card renderer, nothing composes `concat`/`transition`/`add_audio` | agent-api / mission-worker |
| G4 | **`generate_video` has no `space_id` param** (unlike `generate_image`) — space inferred at poll time from request context; can land `space_id: null` → invisible in Space Media | `vibey-api-action-docs.ts:1876`, `artifact-legacy-media-status.service.ts:52-59` |
| G5 | **Agent-driven polling only** — no worker/cron/webhook for `media_generation_jobs`; if the agent stops polling, the job is stuck `processing` and no asset is ever created | agent-api |
| G6 | **Latent DB bug**: `media_generation_jobs.provider` CHECK allows only `'replicate'` but code inserts `'google'` | `019_media_generation_jobs.sql` vs `artifact-legacy-media-jobs.service.ts:42` |
| G7 | Uploaded videos stored under `documents/` folder despite correct `asset_type` | `apps/api/.../media-service-02.base.ts:101-102` |
| G8 | UI polish: no video generation entry point anywhere; video-only Media filter **hides the composer entirely** (`media-view-presentation.ts:22`); Outputs rail has no video icon branch (`ShellRightPanelFiles.tsx:125` → FileText); slide-out history rail hardcodes `asset_type:'image'`; no poster/duration metadata on assets | web |

---

## 2. The three create flows

### A. Video Ad (assembled: script → shots → VO → captions → assembly)

Target = the `roas-video-ads` flow, productized as a mission playbook. Step-by-step mapping:

| Step | Today | Gap |
|------|-------|-----|
| Intake + script | chat / `roas-video-ad-scripts` | none |
| Anchor stills | `generate_image` (sync, space-scoped) | none |
| Per-shot clips | `generate_video` with `image_url`/`last_frame_url` | G4, G5 |
| Voiceover | ❌ | **G1 — DECIDED: Higgsfield MCP audio tools** (voice/audio generation via `use_mcp_tool`), piped through `process_media` to become assets. Zero backend build; the production skill owns tool discovery at runtime (same pattern the IG skill already uses) |
| Captions | partial | G2 — cheapest path: Deepgram-transcribe the VO (client exists) → build SRT → `subtitle_burn`; or `text_overlay` timed from the script |
| CTA end card | partial | extend the `render_ig_story` Pillow-renderer pattern into an end-card template, or `generate_image` + `concat` |
| Assembly to runtime | `concat` + `transition` + `add_audio` primitives | G3 — needs an orchestrating playbook + skill with an output contract (exact runtime, aspect, shot count) |

### B. UGC-style video

Generalize the IG Organic Video architecture rather than build parallel machinery:
- **B-roll/organic style** (what exists): sticker-composited lifestyle footage — already shipped as the IG playbook.
- **Talking-head UGC** (new variant): script → actor persona → lipsync clips (`fabric-1.0`/veed is already in the model catalog; Higgsfield also has avatar/UGC tools) → captions → assembly. Ship as a sibling playbook reusing the kickoff-schema + preset-library + output-contract pattern, with an "actor library" analogous to the scene library.

### C. Standalone video script

It **is a Document**: `create_docx` + the `roas-video-ad-scripts` skill. No pipeline work. It doubles as the off-ramp from the Video seeded chat ("just want the script? → Document") and feeds flow A later (`sourceMissionId`/`sourceDeliverableIds` already exist in the IG kickoff for exactly this kind of chaining).

### The two execution models (expanding "the way the mission works")

- **Chat seeding** (`seedComposer` + `systemContext`) — interactive, good for triage, single clips, scripts, and quick edits via `process_media`.
- **Mission playbook** — deterministic, batch, contract-enforced. Guarantees "a finished ad, never a raw clip."

**DECIDED: one unified flow — the playbook is absorbed into the chat.** The Video create item seeds a chat; the chat triages flavor, then conversationally gathers the same inputs the kickoff form collects (scene selection, copy mode, sticker/script copy, offer context) and **files the playbook mission directly from chat** — no modal detour (the `QuickMissionsHubModal` form stays for the Missions hub, but is not part of the create path). Missions already record `source_conversation_id` for provenance. The playbook registry grows from one video playbook to three: `ig-organic-video-ad` (exists), `video-ad-production` (flow A), `ugc-talking-head` (flow B).

New requirement this creates — **chat-native mission kickoff**: today only the web UI POSTs playbook missions (`QuickMissionsHubModal.tsx` → `createMission({input:{playbook_id, playbook_kickoff}})`); there is no verified agent-side action that files a mission with a typed `playbook_kickoff` payload. P1 must confirm whether an existing agent action covers this or add one, plus a lightweight way to surface scene choices in chat (list scene names/preset thumbs from `ig-organic-video-scenes.config.ts`; a richer in-chat scene picker can come with the template strip in P3).

---

## 3. Create-menu surfacing + where outputs land

**DECIDED: one "Video" item**, matching the confirmed "Ad" umbrella precedent: the seeded chat asks which flavor — Video Ad / UGC-organic / single clip / just the script — then carries the chosen flavor straight through to production in the same conversation (see the unified-flow decision in §2).

**Template strip (later)**: the scene library's 27 preset stills/videos are real designed covers — exactly what the design directive requires (real mini covers, never abstract placeholders). Scene packs become the Video template strip for free.

**Where outputs land**:
- Generated/produced videos → `media_assets` with `space_id` → **Space Media view** (realtime insert already refreshes the gallery); playable in chat and the shell artifact viewer today. Media view is the home; no new artifact type needed.
- Scripts → documents (Docs view / Outputs rail).
- Mission-produced videos additionally flow through mission deliverables (already synced by `syncMissionVideoDeliverableForJob` and the IG deliverable service).
- Campaign/space scoping rides on `media_assets.space_id` + `campaign_id` — schema is ready; G4 is the only attribution hole.

---

## 4. Phasing

**P1 — chat seeding + chat-native kickoff (cheap, days).** Ship the Video create item with a quick-action-style `systemContext` (pattern: `shell-empty-chat-prompts.config.ts`) that triages flavor and drives `generate_video` → `wait` → `get_video_status`, `process_media` for edits, and `create_docx` for scripts; for produced ads it gathers the IG kickoff inputs in-chat and files the mission directly (verify/add the agent-side mission-create action — see §2). Small fixes bundled: add `space_id` to the `generate_video` schema (G4, mirrors `generate_image`), Outputs-rail video icon (G8), video-only Media filter keeps a composer (G8).

**P2 — pipeline hardening (about a week).** Background sweeper for stale `media_generation_jobs` (G5); provider CHECK migration (G6); upload-folder fix (G7); persist duration + poster thumbnail (ffmpeg `thumbnail` op exists) and use it in Global Artifacts/rail; "Generate video" composer in the Media view.

**P3 — production workstream (the real build).** VO via Higgsfield MCP audio (G1, decided) → captions (G2) → CTA end-card renderer → `video-ad-production` playbook + DB skill with output contract (G3), porting the `roas-video-ads` flow into the platform; UGC talking-head playbook; Video template strip / in-chat scene picker from scene packs.

**Decisions locked (2026-08-11):**
1. VO provider: **Higgsfield MCP audio tools**, piped through `process_media`.
2. **One Video item** with in-chat triage.
3. **Unified flow**: playbook functionality is incorporated into the chat flow — the seeded chat gathers kickoff inputs and files the mission itself; no modal handoff in the create path.
