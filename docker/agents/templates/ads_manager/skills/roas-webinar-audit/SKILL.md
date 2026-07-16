---
name: roas-webinar-audit
description: Post-webinar diagnostic and pattern analysis for ROAS client webinars, including live-event ticket webinars and summits with multi-seat packages. Load whenever Nate or a pod leader (Bryce, Jordan, Nefi) is auditing a webinar that has aired, single-run or multi-run. Covers the 5-lens framework (ROAS, Brunson, Kennedy, salesmanship, chat forensics), 13-category 180-point rubric, deep chat-transcript analysis (ICP match, closable-lead scoring, geographic self-ID, named follow-up list), audience and channel-mix data tables, multi-run pattern detection, marketing angle rework, and the companion XLSX hot-lead list. Outputs native platform artifacts (Vibey) or DOCX+XLSX fallback. Triggers on 'audit this webinar,' 'post-webinar/event/summit recap,' 'grade my webinar,' 'what went wrong,' 'chat forensics,' 'pattern across runs,' 'build the call list,' or any client name paired with webinar results (e.g., 'Andy's East Coast Summit'). Do NOT load when building a webinar from scratch, use roas-master-webinar instead.
---

# ROAS Webinar Audit — Post-Webinar Diagnostic & Pattern Analysis

The full post-run teardown for any ROAS client webinar. Built for two modes: a single-run audit (one webinar, one deliverable) and a multi-run pattern audit (same offer run 2+ times, find the pattern, fix the root cause).

This skill is the *diagnostic* side of the webinar engine. The build side lives in `roas-master-webinar`. Do not duplicate. This one picks up AFTER a webinar has run and we need to find what broke and where the money is still sitting.

Always load `nate-tilley-voice` and `human-written-copy` alongside this skill when writing any client-facing or internal copy in the deliverable.

---

## WHEN TO USE THIS SKILL

Use this when a webinar (or set of webinars) has already aired and the task is any of:

- Diagnose why it underperformed
- Find the single biggest fix before the next run
- Pull the named hot-lead list from the chat so the client's sales team can recover revenue
- Compare multiple runs of the same offer and find the repeating pattern
- Pull new marketing angles and hooks from what attendees actually said in chat
- Build a client-facing audit deck or memo for a review meeting

Do NOT use this skill for building a webinar from scratch, auditing a draft script that hasn't run yet, or slide design. Those are different jobs.

---

## INPUTS REQUIRED (gather all of these before starting)

Full audit needs all eleven. If any are missing, flag them up front in the deliverable and run a partial audit on what's available. Items 8-11 were added because missing them caused rewrites on the East Coast Summit audit.

1. **Client + presenter** — who runs the webinar, who the company is
2. **Offer details** — product, price, guarantee, delivery format
3. **Webinar transcript** — full Zoom / Demio / StreamYard transcript with timestamps
4. **Chat transcript** — full chat log with names and timestamps (this is the highest-signal input, do not skip)
5. **Slide deck** — PDF or link to the actual deck that ran
6. **Ad / attendance results** — ad spend, registrants, show-up rate, peak concurrent, avg watch time, drop-off points, pitch drop-off
7. **Sales results** — sales count, close rate, revenue, AOV, ROAS
8. **Moderation context** — who was moderating chat, whether prebuilt scripts were running, whether any disruptive chatters were warned or removed during the call. This shapes whether the audit recommends "add a moderator" or "the moderator did their job, the slides need to back them up." If ROAS was moderating, the fix is almost always a slide, not a person.
9. **Offer model** — single ticket, multi-seat package (3-pack, 5-pack), or subscription. If the offer is a live-event ticket that sells multiple seats per transaction, the headline metric is SEATS FILLED, not transactions. See the Live Event Metrics callout below.
10. **Geographic targeting** — where the ad campaign ran (national, geo-restricted, retargeting only) and where the email/SMS list draws from (national, regional). Required to do the cold-vs-list filter correctly in the audience breakdown tables. Without this, the "the list is doing real work" insight cannot be surfaced.
11. **Client relationship to ROAS** — is the marketing function (ads, lander, email, chat moderation) RUN by ROAS or by the client's team? This drives the marketing-function reframe rule in the voice section. We do not flag our own work as "needs improvement" in client deliverables.

For multi-run audits, gather all eleven for *each* run plus the date each one ran.

If the client followed the post-webinar recap process in Slack, items 6 and 7 are usually sitting there already. Start there.

### Live Event Metrics (when offer is a multi-seat live-event ticket)

When the offer is a live-event ticket with multi-seat packages, recalculate the headline numbers:

- **Seats filled** = sum of seats across all ticket types (1 per single, 3 per 3-pack, 5 per 5-pack, etc.)
- **Cost per seat acquired** = total ad spend / total seats
- **Seat-fill rate** = seats / attendees (not transactions / attendees)
- **Person-hours of attention** = attendees × avg watch time. Always celebrate this number, it humanizes the engagement story for the client.

Lead with seat count on the cover stat row, not transaction count. Frame webinar-only ROAS as "pre-event ROAS" and note that the real ROI runs through the live event. Do not let the client read the webinar-only number as the verdict on the campaign.

---

## STEP 1 — MODE DETECTION

First thing in every run: decide which mode you're in.

**Single-run mode** — One webinar to audit. Run the full single-webinar pipeline and skip the pattern-analysis section.

**Multi-run mode** — Same offer, 2+ runs to audit. Run the single-webinar audit on each run independently FIRST. Then run the pattern analysis across them. The pattern section is where the real money is in multi-run audits, because one-off diagnostics miss what's systemic.

If you're not sure which mode, ask. If the client has run 2+ times and you only get asked about one, still ask whether the prior runs are available. Patterns are always more valuable than single-run diagnostics.

---

## STEP 2 — SINGLE-WEBINAR AUDIT

For each webinar in scope, run this pipeline:

### 2A. Five-lens grading
Grade the webinar through five expert frameworks. Each one catches things the others miss.

1. **ROAS Framework** — our own playbook (3 Pillars, reluctant hero, attribution rules, pre-launch gate, coffee-conversation tone)
2. **Brunson / Perfect Webinar** — Hook-Story-Offer, Epiphany Bridge, Big Domino, 3 Secrets, Stack
3. **Kennedy / Direct Response** — message-market match, USP, irresistible offer, risk reversal, urgency
4. **Classic Salesmanship** — rapport, pain, trial closes, micro-commitments, objection handling
5. **Chat Forensics** — the highest-signal lens (see Step 2C)

Full criteria for each lens → `references/audit-framework.md`

### 2B. 13-category 180-point rubric
Grade across all 13 categories, 14 points each. Each category pulls criteria from multiple lenses. Give a score, a 1-2 line rationale, and flag which lens(es) it failed.

Categories: Pre-webinar setup · Audience qualification · Cold open & hook · Promise & positioning · Credibility & epiphany bridge · Big domino / belief shift · Teaching blocks / 3 Secrets · Story & proof integration · Offer bridge / transition · Offer stack & pricing · Chat moderation & conversion · Close, urgency & objection handling · Post-webinar flow

Full rubric → `references/audit-framework.md`

### 2C. Chat forensics (do not skip)
The chat is the truest signal in the room. It tells you who actually showed up, who was buying, what wasn't answered, and where heat leaked. Chat forensics usually uncovers the biggest revenue leak in any webinar.

Six parts, run all six:
- **A. Audience qualification** — % on-ICP vs off-ICP from chat intros
- **B. Closable leads** — score every engaged named attendee 1-5 on buying temperature, pull top 10 hottest + top 5 missed signals
- **C. Questions, comments, concerns** — categorize every substantive message (logistics, objections, clarifications, buying questions, confusion, pushback), flag unanswered
- **D. Chat energy arc** — map volume and sentiment across timeline, silence during offer is worse than objections
- **E. Moderation quality** — was a moderator named and active, were chat drops timed right
- **F. The follow-up list** — the named hot-lead recovery list, the single fastest money in the whole audit

Full framework and analysis prompts → `references/chat-forensics.md`

If no chat transcript is provided, flag it loud at the top of the deliverable. Do not skip. Chat forensics is where most leaks hide.

---

## STEP 3 — MULTI-RUN PATTERN ANALYSIS (only in multi-run mode)

Only after every run has its own single-webinar audit complete.

Look for patterns across runs:
- Same category scoring low every time (that's the systemic leak)
- Same objection showing up in every chat (that's a positioning or offer gap)
- Same drop-off point across runs (that's a broken slide or transition)
- Same ICP mismatch across runs (that's a traffic-source problem, not a webinar problem)
- Same silent moment in chat every time (that's a belief that never lands)

Rank patterns by revenue impact when fixed. The top pattern is almost always the single most valuable finding in a multi-run audit.

Full framework → `references/multi-run-patterns.md`

---

## STEP 4 — MARKETING ANGLE & POSITIONING EXTRACTION

The chat tells you what the market actually cares about in the market's own words. Every audit pulls this out.

What to extract:
- **New hook angles** — the pain statements attendees wrote unprompted in chat (these become ad hooks)
- **Positioning gaps** — where the current "build X" framing feels weak and a pain-forward or recreate-forward angle would hit harder
- **Objection-reversal copy** — the top 3 objections from chat, reframed as ad hooks that pre-handle them
- **ICP language match** — phrases the right-fit attendees used that should be in the opt-in page
- **Creative concepts** — visual or hook concepts suggested by the chat patterns

This is a working doc section the pod leader or media buyer can pull copy from directly. Keep it specific, keep it in the market's own words, keep it ready to paste into ad creative briefs.

Full framework → `references/marketing-angles.md`

---

## STEP 5 — ASSEMBLE THE DELIVERABLE

Output format is flexible. Pick one based on audience:

- **Internal QC / pre-rerun review** — tight memo, heavy on the top 3 fixes and the named follow-up list. 2-3 pages.
- **Client review meeting** — full 11-section deliverable with the five-lens scorecard, category table, rewrite of the weakest beat, and 30-day plan. Presentation-ready.
- **Multi-run pattern report** — single-webinar audits as appendices, pattern analysis + top 3 systemic fixes + marketing angles as the main body.

Full section-by-section templates → `references/deliverable-template.md`

Every deliverable ends with a **Launch / Re-run Recommendation**: GREEN (run as-is), YELLOW (run after specific fixes), RED (do not run again until one specific condition is true).

Every client-facing audit also ships with a **companion lead list**. The report is the diagnosis. The lead list is the recovery tool the call team can actually run. Format per `references/companion-xlsx.md` (the three-tab structure holds regardless of container).

### Container rule (environment-aware)
The CONTENT standards below are fixed; the container follows the environment:
- **Vibey / any platform with native Doc + table artifacts:** the audit is a Doc artifact ("Webinar Audit — [Client] [Run]"), the lead list a native table or Deliverables cards the call team can sort/filter/assign in-platform. Do NOT export DOCX/XLSX files there — a file inside the platform is a dead deliverable.
- **claude.ai / no native artifacts (fallback):** brand-styled DOCX + companion XLSX to `/mnt/user-data/outputs/`, exactly as the references specify.

---

## VISUAL & BRANDING STANDARDS

The audit deliverable is a ROAS product. It looks like one. Apply these standards to every client-facing report.

### ROAS.co brand colors

Use these exact hex values. Pick by role, not by aesthetic preference.

- **Primary purple `#6D28D9`** — ROAS.co accent. Use for H3 headings, eyebrow tags, action card top borders, info callout left borders.
- **Navy `#0A2540`** — primary headings (H1, H2), main stat values, table headers.
- **Light purple bg `#EDE9FE`** — accent stat blocks, info callout backgrounds.
- **Slate `#475569`** — subtitles, captions, secondary text.
- **Status colors** — Red `#DC2626`, Green `#16A34A`, Amber `#F59E0B`.
- **Status backgrounds** — Success `#DCFCE7`, Alert `#FEE2E2`, Warning `#FEF3C7`.

### Co-branding format (client-facing reports)

- **Header**: `ROAS.co for [ClientName] · [client URL]`
- **Footer**: `ROAS.co · Page X · Confidential · Prepared for [Client]`
- **Cover page**: ROAS.co wordmark in purple, "Performance Marketing for Coaches & Consultants" tagline, "Prepared for [Client] · [URL]" line below

### Required visual elements

Every client-facing audit must include all of these:

- **3-up stat row on cover** — color-coded by win or concern (green for wins, navy or amber for context)
- **Funnel waterfall visualization** — horizontal bars showing each drop-off stage (registered → showed → stayed past pitch → bought)
- **Watch time distribution chart** — horizontal bars by bucket (<10, 10-30, 30-60, 60-90, 90+), green for the sweet spot
- **Action cards** — title, what, then `OWNER:`, `DEADLINE:`, `IMPACT:` line at the bottom
- **Color-coded callout boxes by type** — alert (red), win (green), warn (amber), info (purple)
- **Emoji on section headers and key callouts** — 🏆 🎯 📊 🚀 ⚡ 🔥 💪 📞 🌍 🇺🇸 🌴 🪑 🌐. Tasteful, not spammed.

### Format defaults

- **Section 1 (At a Glance) is bullets and short paragraphs, NOT prose.** Operators scan first, read second.
- **Letter grades from the 5-lens scorecard go at the TOP of the findings section**, before the detailed breakdown. Client wants the verdict before the case file.
- **Target length: 3,000-5,000 words for client deliverables.** Tight, scannable, executive-grade. Not comprehensive. The lead list carries the long-form data, not the report.
- **More tables and graphs by default.** When in doubt, table it. When in further doubt, visualize it. Prose is the exception, not the default.

### Required data tables

Every client-facing audit produces a standard set of audience and performance tables (geographic, regional, demographic, watch time, channel mix, industry). Full specifications and extraction logic in `references/data-tables.md`.

---

## VOICE RULES (non-negotiable)

Load `nate-tilley-voice` and `human-written-copy` before writing anything in the deliverable. The audit is a ROAS product. It sounds like ROAS.

- Coffee-conversation tone. Operator to operator.
- No forbidden words: leverage, seamless, transform, empower, harness, paradigm, robust, optimize, utilize
- No em dashes
- No triplets ("fast, clean, and effective" style)
- No "brutal truth" framing
- One line per idea where the line can carry it
- Direct. No hedging. No "you might consider."
- Never diagnose the presenter personally. Diagnose the mechanics.
- Reference the system and the frameworks, not the client's competence.
- If something happened once, frame the fix as "how we always handle this."
- Lead with the fix, not the problem.
- End with what the client gets when this is fixed, not what's currently broken.

### Attribution rules (apply inside the deliverable when citing examples)
- Direct attribution OK: Andy Elliott, Chris Voss, Krista Mashore, Neel Dhingra
- "Collab through our clients" only, never "worked with": Russell Brunson, Dean Graziosi, David Goggins, Gary Vaynerchuk, Dan Martell, Myron Golden, Jeremy Miner

### Client communication rule
Never diagnose a specific issue back at the client. Reference the system, process, or solution that should exist because of a general category of problem. "Here's how we always handle the drop-off at the pitch bridge" hits. "You lost them at the pitch bridge" lands the wrong way.

### Marketing-function reframe rule (apply globally)
When the marketing function (ads, lander, email, chat scripts, opt-in flow) is RUN BY ROAS, do not flag those areas as "needs improvement" in client-facing deliverables. We are not flagging our own work as broken to the client. Reframe as "good news given the constraints" or "system recommendation for the next phase."

Example:
- Bad: "19% opt-in vs 30% benchmark. Marketing could do better."
- Good: "19% on geo-restricted East Coast cold is healthy. When we expand to other regions at the same CPL, lead volume scales linearly."

This rule applies to every section of the deliverable, not just one place. When you write a finding, ask: who runs the function this finding criticizes? If the answer is ROAS, rewrite as a system recommendation for what comes next.

### Chat moderation reframe rule
When Nate or another ROAS team member was moderating with prebuilt scripts, do not over-focus on chat moderation as the gap. Acknowledge moderation was active and prebuilt scripts ran, then redirect findings to "what slides would have answered visually" rather than "moderation needs to improve."

A slide answers everyone in the room at once for 60 seconds. Chat answers one person at a time. The fix is the slide, not the moderator. If the same question came up 5+ times in chat, that is a missing slide, not a moderation gap.

---

## REFERENCE FILES

Load only what's needed for the current step. Do not preload everything.

- `references/audit-framework.md` — Full 5-lens criteria + 13-category rubric with scoring scale
- `references/chat-forensics.md` — The seven-part chat analysis (A-G) with prompts and examples, including geographic self-ID extraction
- `references/multi-run-patterns.md` — Cross-webinar pattern detection framework
- `references/marketing-angles.md` — Extracting hooks, positioning, and creative concepts from chat
- `references/deliverable-template.md` — Section-by-section output templates for internal memo, client review, and multi-run report
- `references/data-tables.md` — Standard data tables every audit produces (geo, regional, demographic, watch time, channel mix, industry) with extraction logic and standard insight callouts
- `references/companion-xlsx.md` — Three-tab XLSX lead list format that ships alongside the DOCX

---

## COMMON PITFALLS

- **Skipping chat forensics when no transcript was provided.** Flag it loud at the top of the deliverable and run the rest. Do not silently omit.
- **Single-run diagnostics on a multi-run problem.** If the same offer has aired 2+ times, do the pattern pass. The systemic finding is the real deliverable.
- **Diagnosing the presenter instead of the mechanics.** Every finding is about a system, a slide, a transition, a chat moment, never about the person.
- **Generic ad-copy suggestions in Step 4.** If the chat didn't say it, don't put it in the marketing angles section. Extract from the market, don't invent for it.
- **Over-scoring on a deck that read well but converted poorly.** If close rate is low and the five-lens grades are all B+, the audit missed something. Go back to chat forensics.
- **Using forbidden words or em dashes in the deliverable itself.** It's a ROAS product. It has to sound like one.
- **Forgetting the geographic data cuts.** State-level, regional, and top-state city breakdowns are required, not optional. Without them, the cold-vs-list channel attribution insight cannot be made.
- **Counting transactions instead of seats** when the offer is a live-event ticket with multi-seat packages. A 3-pack sale is one transaction and three seats. Lead with seats on the cover stat.
- **Flagging marketing-function gaps to the client when ROAS owns the marketing function.** Reframe as good news given the constraints, or as a system recommendation for the next phase. We do not flag our own work as broken in client deliverables.
- **Over-focusing on chat moderation when ROAS is moderating.** Acknowledge moderation was active and redirect to slide solutions. A repeated chat question is a missing slide, not a moderation gap.
- **Defaulting to prose.** Bullets, tables, and visualizations are the default. Prose is the exception. Operators scan first, read second.
- **Skipping the companion XLSX.** The lead list belongs in a spreadsheet the call team can actually sort, filter, and run. Not in a paragraph in the report.
- **Not asking up front** whether disruptive chatters were removed, who was moderating, what scripts were running, what the offer model is (single ticket vs multi-seat package vs subscription), and which marketing functions ROAS owns. Missing these gates causes rewrites.
