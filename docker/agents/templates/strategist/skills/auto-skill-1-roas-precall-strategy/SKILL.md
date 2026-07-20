---
name: auto-skill-1-roas-precall-strategy
description: Builds the pre-call strategy map for a new ROAS client BEFORE the internal onboarding call, so the team walks in with the business already mapped and the call becomes confirm-and-correct instead of discovery. Reads the onboarding form, sales notes, and the portal's AI research, then runs the 5-phase strategic research loop (brand, audience/ICP, competitors with receipts, ad library, market proof), runs the client through the ROAS offer/avatar frameworks, and outputs a one-page strategy map with SUGGESTED OFFERS and SUGGESTED AVATARS (these replace the portal's auto-generated offers/avatars), plus a restructured call agenda and portal pre-fill values. Load whenever a new client submits the onboarding form, someone says "prep the onboarding call," "pre-call strategy," "map out [client] before the call," "build the strategy map," "what should we run for [new client]," or a client name is paired with an upcoming onboarding/kickoff call. Do NOT load for post-call strategy revisions (update the existing map instead), webinar audits, or ad/funnel copy production.
---

# ROAS Pre-Call Strategy — walk in already knowing their business

**Trigger:** new client submits the onboarding form (status NEW_CLIENT_INTAKE). Run before the internal onboarding call — you have a 1-3 day window.
**Reads:** onboarding form answers, sales handoff notes, portal AI summary + deep research + business research reports, client website/socials/current funnel.
**Produces:** Pre-Call Strategy Map (markdown Doc) + Visual HTML one-pager of that map + Confirm-or-Correct call agenda + portal pre-fill values.
**Checkpoint:** strategist (Dylan/Nate/Aaron) reviews the map before the call. The map is internal — the client never sees the raw doc.
**Posts to:** campaign Docs (markdown) + Visual tab / Visual Doc card (HTML one-pager) in Vibey. Call agenda is a second Doc for whoever runs the call.

The point: the client should feel "these people already understand my business" in the first ten minutes. Our message beats their discovery. The call stops being an interview and becomes a working session where we confirm a map we already drew.

**The map is a hypothesis, not a script.** The client knows things research can't see: margins, capacity, what they already tried and hated. Lead with "here's what we think, tell us where we're wrong." The corrected map becomes the strategy. Never defend the map on the call.

---

## INPUTS — gather before building

Pull from the campaign brain first; ask only for what's missing. Never invent facts about the client.

**Brain read (required):** call `search_campaign_brain` first — multiple queries covering offer, pricing, ICP, competitors, onboarding form, sales notes, and research.

- Pass `campaign_id` for the client campaign (e.g. Impact). In campaign-scoped chat it auto-injects; if `CAMPAIGN_ID` is missing/General, pass the real campaign_id explicitly — do not proceed without it.
- Do **not** use `search_agent_brain`, `search_user_brain`, `search_company_brain`, `get_brain_pages`, or empty `brain_id` placeholders for client package knowledge.
- Do **not** invent "circuit-broken" for the campaign brain path unless `search_campaign_brain` itself returned `WORKFLOW_CIRCUIT_OPEN`. Agent/company brain failures are a different circuit and do not block `search_campaign_brain`.
- `list_available_brain_scopes` is only for discovery; use `campaign_brains` / `current_campaign_brain.brain_id` or pass `campaign_id` into `search_campaign_brain`. never invent empty ids.

1. **Onboarding form answers** — full submission (business, offer, ideal client, goals, competitors, brand).
2. **Sales handoff notes** — what sales promised, price point sold, any red flags. If none exist, note the gap in the map.
3. **Portal AI research** — the AI summary, deep research report, and business research report the portal generated on form submit. These are raw material, not conclusions. The auto-generated avatars sit unreviewed — review them here.
4. **Live links** — website, socials, current funnel/pages, ad library presence if they run ads.
5. **The agreement tier** — what they bought ($5K core / channel add-ons), so the recommendation matches the scope.

---

## THE WORKFLOW

### Step 1 — Ingest and gap-scan
Read everything above. List what's missing or contradictory (form says one price, site says another; no proof assets mentioned; no list size). Every gap becomes either a research target or a call question.

### Step 2 — Fresh research: the 5-phase loop (web, tight)
The portal research is generic. Replace it with the strategic research loop. Every claim gets a receipt (link, price, number) — no receipt means it becomes a call question, not a finding.

- **Phase 1 · Brand:** site, socials, current funnel. What are they actually selling today, at what price, with what proof and what tone? How big is the audience?
- **Phase 2 · Audience/ICP:** who actually buys, in their own words — pull from their reviews, testimonials, comments, community posts. Pains, desired outcomes, objections, buying triggers.
- **Phase 3 · Competitors:** 3 named competitors WITH LINKS AND PRICES — positioning, offer, guarantees, mechanisms, what their headlines lead with (per the Market Research framework in `references/roas-frameworks.md`). Then the pattern: what everyone does the same, and the position nobody owns. That unowned position is usually the strategy.
- **Phase 4 · Ad library:** what's running in this niche right now. **Run the `roas-market-research` skill in LIGHT mode (standard brief, 3-5 references)** — it pulls live ads through the SearchAPI + Scrape Creators MCPs, ranked by longevity. If that skill or its MCPs aren't available in the environment, fall back to web-searching competitors + category and label every reference [inferred — web]. Note borrow vs. counter-position. This pre-call pull is a hypothesis layer — auto-skill-3 reruns the research in full mode and re-ranks competitors by live spend; never treat this pull as final.
- **Phase 5 · Market proof:** evidence this category converts — comparable launches/campaigns/funnels with real numbers (the standard: "MOFT Z did $1.14M from 16,388 backers"). This is what makes the client strategy message credible later.
- **Niche state:** growing or tired, awareness level, sophistication stage (what claims has this market already heard?).

### Step 3 — Offer read
Run their offer through the ROAS frameworks (`references/roas-frameworks.md`):
- **3S test:** specific problem, specific person, specific way. Where does it fail?
- **Stack read:** is there a one-stop-shop offer with 3-5 nameable components, or a loose service?
- **Pricing read:** against the vertical benchmarks. Under-priced, over-priced, or missing anchor?
- **Mechanism:** do they have a "New Way," or are they selling the same promise as everyone in Step 2?
- **Scalability:** does fulfillment survive 2-5x volume?
State the offer's biggest weakness in one sentence. That sentence is usually the map's headline finding.

Then build **2-3 SUGGESTED OFFERS**: name/promise, price point anchored to the Phase 3 receipts and the vertical benchmarks, tier position (front-end/core/premium), and what we'd change from how they present it today. These replace the portal's auto-generated offers. Status: HYPOTHESIS — pricing and appetite get verified on the call.

### Step 4 — Buyer read + suggested avatars
Who actually buys, in their own language. Pull from Phase 2 + form: the pain that keeps them up, the desire, the lies they believe, the objections. One tight paragraph plus a 3-line empathy snapshot.

Then build **2-4 SUGGESTED AVATARS**, grouped by buying likelihood (not demographics): who they are (role, situation, one humanizing specific), the pain in their words, the dream outcome, top objection to beat, where to find them (targeting note). These replace the portal's auto-generated avatars — if the portal versions are provided, mark each KEEP / FIX / KILL as a cross-check, but our avatars are the ones that ship.

### Step 5 — Client-fit read (internal honesty)
Score against the 11 winning-client traits (proof of concept, $10K+/mo, defined niche, audience, on camera, coachable). Flag every miss as a risk with a mitigation. This section is internal only and never softens.

### Step 6 — Campaign recommendation
Pick the first campaign and defend it in three sentences:
- **Webinar launch** (flagship default): proven offer, client good on camera, price supports it, audience or list exists.
- **VSL / call-booking:** high-ticket, sales team in place, client won't do live events well.
- **Low-ticket / SLO:** big TAM, impulse price, list-building goal.
- **Skool / community:** community-based delivery, strong organic, engagement play.
Include: funnel outline (pages needed), whether their own list gets pushed (DBR — mandatory if a list exists), a realistic first-launch window using the 23-day line, and compliance flags (income/health claims, A2P) to raise on the call.

### Step 7 — The Confirm-or-Correct list
The 5-8 highest-leverage assumptions the call must verify, each phrased as a QUESTION or a "we believe X, where are we wrong?" statement with a fallback. Example: "We believe the $1,997 program is the lead offer and the $8K mastermind is backend. If backwards, campaign type flips to VSL call-booking." Never phrase a verify item as a verdict or accusation ("the form contradicts the site") — neutral questions only ("confirm exact event dates and length; all copy depends on it"). This list IS the new call agenda for steps 2-4 of the guided call.

### Step 8 — Output and route (Vibey artifacts — required)
Build the artifacts per `references/output-template.md` and `references/html-onepager.md`. Do **not** stop at markdown Docs. Do **not** invent Drive/Slack/portal uploads — Vibey has no agent action for those.

**Required save sequence (every run):**

1. **`save_document` — Pre-Call Strategy Map (markdown)**  
   Title: `[Client] — Pre-Call Strategy Map`.  
   Body: one page per `references/output-template.md` Artifact 1 (suggested offers, suggested avatars, market proof receipts).  
   This is the record copy. Capture `space_item_id` (or `document_id` + dual-write id) from the result.

2. **`generate_visual_html` — HTML one-pager (required)**  
   Call on the map Doc's `item_id` / `space_item_id` immediately after step 1.  
   Pass `style_hint: "one-pager"` and a prompt that matches `references/html-onepager.md` (dark header, gold headline callout, 3S badges, offer/avatar cards, competitor table with links, timeline chips, INTERNAL ONLY risks, verify checklist as native HTML checkboxes — no scripts).  
   This is the copy humans open on the call. A markdown-only run is incomplete.

3. **`save_document` — Confirm-or-Correct Call Agenda**  
   Title: `[Client] — Confirm-or-Correct Call Agenda`.  
   Body: Artifact 2 from `references/output-template.md`. Guided steps 2–4 = confirm-or-correct; step 5 = logistics/access. Call MUST leave with offer, pricing, campaign type, and budget verified.

4. **Portal pre-fill values** — include as the last section of the Strategy Map Doc (and echoed in the Visual one-pager). Ready to paste: main offer name/price/LTV estimate, USP, avatar description, primary + secondary campaign type, compliance level.

If `save_document` does not return `space_item_id`, call `list_documents` for the campaign/space, find the map Doc, then run `generate_visual_html`. Never claim the HTML exists unless `generate_visual_html` succeeded.

**What happens after the call (not this skill):** `auto-skill-2-roas-strategy-adjust` reruns the map against the call transcript + AM notes, AM fact-checks, strategist approves by EOD of the call day, and the client strategy message goes to their channel. There is no separate strategy session call.

---

## HARD RULES

- **Markdown + Visual HTML, every run.** `save_document` for the map then `generate_visual_html` on its `item_id` is mandatory. Stopping at Document cards is a failed run.
- **Hypothesis, not script.** Every claim in the map is falsifiable on the call. "Tell us where we're wrong" is the opening frame.
- **Never invent proof, numbers, or client facts.** Gaps get a clearly-marked [MISSING — ask on call] tag, never a guess.
- **Internal honesty stays internal.** The client-fit risks section never reaches the client in any form.
- **Real research, not vibes.** Three named competitors minimum with actual observed positioning. If the ad library and site reveal nothing, say so.
- **Date-stamp every receipt.** Prices and claims go stale: "$2,495 as of Jul 2026 ([link])." Anything worth citing gets a link; if it can't be linked, it's a call question.
- **Audit what already exists.** If the form or links reveal a prior funnel, replay page, or past campaign, autopsy it — that is real conversion data. What did they run, what does it look like, what would we keep or kill?
- **Show the launch math.** Any proposed dates work backwards from the client's fixed dates using the 23-day line, arithmetic visible ("event Sept 30 → ads live by Sept 7 → gate 2 by Sept 5 → copy locked Aug 25").
- **Compliance flagged, never fudged.** Income/health/protected-class claims get named on the map for the call.
- **Specific numbers everywhere. No em dashes.**
- The map takes under an hour to build. If it's taking longer, you're writing the strategy session, not the pre-read.

## COMMON PITFALLS

- **Rewriting the portal's research.** Synthesize it, don't repeat it. The map is decisions, not data.
- **Generic competitor sections.** "They have a strong social presence" is filler. Name what they charge, what they promise, what to counter.
- **Recommending webinar by reflex.** It's the flagship, not the law. A camera-shy founder with a $15K offer and two closers is a VSL client.
- **Burying the one big weakness.** If the offer fails the 3S test, that's the headline of the map, not a footnote.
- **Letting the map die after the call.** The corrected map is the strategy artifact everything downstream (ads, funnel, webinar skills) builds from. Update it on the call or same day.
