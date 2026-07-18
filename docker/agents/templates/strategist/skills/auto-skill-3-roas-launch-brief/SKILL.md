---
name: auto-skill-3-roas-launch-brief
description: Runs POST-CALL, immediately after auto-skill-2-roas-strategy-adjust. Consolidates the Pre-Call Strategy Map (auto-skill-1) and Strategy v2 (auto-skill-2) into THE PLAN... the single source of truth for the client AND the strategist's approval package. Includes the fresh creative research pass (ad library, ad-kit method), the recommended angles with starter copy samples (headlines, ad leads, webinar title options), and the offer built as a selectable menu (product stack, price, bonuses, guarantee, scarcity) the strategist can keep/kill/edit. One strategist checkpoint for everything... approval ships the client message and triggers auto-skill-4. Load whenever the post-call strategy exists and the strategist needs the consolidated plan to review... "build the plan," "launch brief for [client]," "consolidate the strategy," "plan for strategist review." Do NOT load to write the strategy (auto-skill-2), build the task tree (auto-skill-4), or produce finished ads/pages/emails (production skills).
---

# ROAS Launch Brief — THE PLAN: one doc, one checkpoint

## AUTOMATION HEADER (agent spec for the bridge)

- **Trigger:** auto-skill-2 completes (post-call). Runs immediately after, same working session.
- **Reads:** Pre-Call Strategy Map (auto-skill-1), Strategy v2 + delta + promise ledger (auto-skill-2), the call transcript/notes (for the ideas ledger and offer verification), asset inventory in the client's Drive folder. Plus fresh web research (creative pass).
- **Produces:** THE PLAN (markdown record + interactive HTML review copy).
- **Human checkpoint:** THE ONE strategist gate. Strategist reviews plan + angles + offer menu + copy samples together, marks keep/kill/edit, approves. Approval → client message (from auto-skill-2) ships AND auto-skill-4 runs. Feedback → revise, resend. No other strategist gate exists downstream.
- **Posts to:** client Drive folder (canonical) + portal Strategist tab + internal client thread. This doc IS the client context brief for handoffs.

**What this is:** the consolidation + recommendation step. Skills 1 and 2 produce hypothesis and truth; this merges them, adds the creative layer, and hands the strategist ONE thing to approve.
**What this is not:** production. No finished ad sets, no page copy, no email sequences, no task tree — those come after approval (auto-skill-4 and the production skills).

## MASTER WRITING STANDARD

Load `dylans-super-voice` and confirm it loaded before writing THE PLAN, starter copy, client approval message, client update, or recap. It is the only voice authority. Do not load `human-written-copy` or `dylans-voice`. Client samples and Brain context may add verified facts, vocabulary, and subject-matter texture, but they do not replace or override Dylan Super Voice.

Use the surface mode that matches the output: Long-Form Copy for marketing copy, Professional Message for client messages, and Operator Voice for internal team updates. Before saving, run the complete Dylan Super Voice checklist and search every shipping line for the literal `—` character. If the skill is unavailable, stop and report the missing skill instead of approximating the voice.

---

## THE WORKFLOW

### Step 1 — Merge, COMPLETE (docs 1 and 2 retire)
Fold the map and v2 together. Keep everything CONFIRMED or NEW, corrected values only (never dead hypotheses), and **ALL research-grade material in full**: complete competitor table with links/prices, market proof receipts, full avatar set, TAM, compliance analysis. After THE PLAN exists nobody opens docs 1 or 2 again, so nothing of value stays behind in them. Delta labels disappear — this reads as fact.

**The ideas ledger:** comb the call transcript and any prior notes for every idea, directive, or targeting thought anyone raised ("do ABCD," "maybe target first-time homebuyers," "invite your agent play," pricing games, positioning lines). List each one and where it landed in the plan (adopted → which section; parked → why; rejected → why). Nothing said on a call evaporates.

### Step 2 — Creative research pass: run `roas-market-research` in FULL mode
**This is where the angles come from.** Run the `roas-market-research` skill in deep mode (8-10 references + organic layer where warranted): live ads through the SearchAPI + Scrape Creators MCPs across Meta (plus Google/TikTok/LinkedIn if the ICP warrants), ranked by longevity, with transcripts pulled for every video winner. Fallback chain if the MCPs are down: browser to the live Ad Library → web search labeled [inferred — web] → user screenshots labeled [user-provided]. Never present inferred patterns as observed pulls.

**Re-validation rule (mandatory):** do NOT inherit skill 1's competitor rankings. The pre-call research was a hypothesis; this pull is the truth. Re-rank the competitive set by observed live spend and longevity, and say both things when they differ ("Duncan anchors the price point; GO Coaching is the one actually spending"). Every competitive claim in THE PLAN traces to this pull, date-stamped. This is NOT a rehash of skill 1's research — that asked "is this market real"; this asks "what are we up against in the feed this month, proven by longevity."

### Step 3 — The recommended approach (angles + starter copy)
From the strategy's angle directions + step 2's research, build per `references/creative-research.md`:
- **5-8 recommended angles** spread across DIFFERENT mechanisms so each stops a different person. Each angle gets 2-3 PLAIN sentences: what the ad actually shows/says, who it's for, and why the research says it'll land. No shorthand tags a cold reader can't parse — "insider ritual · Capped Producer" means nothing to someone who didn't build the doc; "this ad names the exact moment our buyer lives every night: answering a borrower text at 9pm at their kid's game" does.
- **Identity callouts** (validate-messaging style): 4-6 "if you're a / if you've / if your" lines, each a different segment.
- **Starter copy samples** so the strategist reviews something concrete: **3 landing page headline options**, **3 Meta ad copy leads** (first-line hooks, sub-125-char), and for webinar/event campaigns: **webinar title + subtitle + 3 topic/session options**.
All of it labeled RECOMMENDED — candidates for keep/kill/edit, not locked copy. Every line passes the human-copy standard (no em dashes, no triplets, sounds like a person).

### Step 4 — The offer, written as the actual offer
Build the offer section as an offer one-pager a cold reader could sell from — NOT as a list of tasks about the offer. Sections: **What You Get** (the real stack, listed out: days, sessions, meals, access, everything — draft component names if the agenda isn't final, marked [DRAFT — confirm]), **Price + Anchor** (the actual anchor math written out with receipts), **Bonuses** (each named, with what it is), **Risk Reversal** (the drafted guarantee with a name and terms — or "None currently" plus a note like "Duncan runs '10x or refund' at this price point; decide whether to match"), **Scarcity** (the real options, listed). Verify every element against the call and notes first — anything the client decided live (a tier, bundle, fast-action mechanic, price) is FACT, marked locked. Optional elements and our additions get simple ✓/✗ checkboxes in the review copy. We recommend on top of what was agreed, never over it.

### Step 4b — Build requirements (extracted, explicit)
Comb the call and strategy for every thing that must be BUILT: each page, funnel, sequence, redirect, integration. List them plainly ("webinar registration funnel · direct event/ticket funnel for post-webinar retargeting · live-redirect wiring · show-up stack..."). A build requirement said on a call that doesn't appear on this list is a dropped ball — this list is what auto-skill-4 turns into the task tree.

### Step 5 — Assemble THE PLAN (narrative order — it reads like a story, not a database)
Per `references/output-template.md`, in THIS order:
1. **Here's who the client is** — business, the ladder, and every person introduced by NAME AND ROLE. Nobody appears later in the doc who wasn't introduced here.
2. **Here's what we're doing** — the campaign, dates, format, targets, in plain full sentences.
3. **Here's their offer** — the offer one-pager from Step 4.
4. **Here's the positioning and why** — the mechanism, the unowned position, and the reasoning that connects the research to the choice.
5. **Competitive research** — ONE consolidated section: the companies (who they are, what they offer, prices, links) AND the live ad pull (who's actually spending, on what, longevity, as of the pull date). Full tables, nothing condensed; the HTML uses expand/collapse for length, never deletion. Avatars + market proof live here too.
6. **Here's how we execute** — build list in plain specific names (a cold reader knows what each item IS: "Post-webinar retargeting — the ads + emails that push non-buyers to the event funnel," never "bridge" or "wiring" jargon; compliance gates like A2P go to open items, not the build list), recommended angles + starter copy, assets & proof, ideas ledger.
7. **Timeline & roadmap** — its own section: launch math, phase chips, what fires on approval.
8. **Open items** — budget first, everything owned and dated.

### Step 6 — Render for review
Two files: markdown (record copy) + **interactive HTML** (per the output template's HTML spec): angle cards and offer components with keep/kill/edit toggles + notes fields, headline/title options as pick-one groups, and a DECISIONS SUMMARY block that compiles every choice into copyable text. House design language, single self-contained file.

### Step 7 — The ONE strategist checkpoint
Send to the strategist. They review everything in one sitting — plan, angles, copy samples, offer menu — adjust, and approve. **Approve** → the decisions summary gets folded back in, THE PLAN is stamped APPROVED, the client message ships, auto-skill-4 runs. **Feedback** → revise, resend, repeat. Keep the doc alive afterward: AM updates on every landed open item, changelog line at the top.

---

## HARD RULES

- **Provenance on everything — the anti-hallucination rule.** Every claim in THE PLAN carries its source, and the reader can always tell WHO said it: LOCKED facts quote the client's exact words from the call transcript with a timestamp link (Fathom deep link where available) — "Let's keep it $2,497 like we've had it" [Oleg, 50:20] beats any paraphrase. Structured facts cite the call notes field. Research claims keep their receipt links. Everything WE propose is explicitly labeled ROAS RECOMMENDATION. If a fact can't be traced to a quote, a notes field, or a receipt, it prints as [UNVERIFIED — confirm] or doesn't print. AI paraphrase never masquerades as client agreement.
- **The call rides with the doc.** THE PLAN's header carries the Fathom link to the onboarding call (timestamps in the doc deep-link into it) and points to the raw transcript file in the client Drive folder. No embedded/condensed transcript — link to the source, never summarize it into the doc. Same for any later calls that changed the plan.
- **No unknowns typed into client-facing copy, ever.** If a value isn't known (a time, a count, a name), it does not appear as a placeholder in anything a client could see — it's omitted, and the gap becomes an open item with an owner. Brackets are for internal working docs only, and the QC gate's "["-scan is the backstop.
- **Reference first.** Before writing the recommended approach, name the closest past winning campaign (same format/type) and model its structure. The winning move is usually remembering the right reference, not inventing.
- **Render, don't describe.** Every recommendation appears as the finished artifact — the named stack, the written anchor math, the drafted guarantee. "Name the sessions as components" is an instruction; the named components are the deliverable. Missing inputs get drafted anyway and marked [DRAFT — confirm].
- **Write for the person who wasn't on the call.** Every fact expands to standalone sense ("Group discount: buy 5 tickets together, get 10% off — existing sales-team lever," never "Group 5+ = 10%"). No internal scaffolding labels (MENU 1, item 2b) in anything the reader sees.
- **All narrative prose runs through Dylan Super Voice exclusively.** Keep `dylans-super-voice` loaded, do not combine it with either legacy voice skill, and rewrite anything that reads like a database export or AI summary.
- **One control style: checkboxes.** Every reviewable item — angles, offer elements, bonuses, scarcity options — gets a simple ✓ checkbox + a shared notes field per section. Copy options (headlines, leads, titles) are pick-one groups. No keep/kill/edit buttons, no internal labels (MENU 1, item 2b). Locked facts get no controls at all.
- **One doc to rule the account.** Handoffs, new team members, founder drop-ins: they read THE PLAN, nothing else.
- **One checkpoint.** The strategist approves here, once, with everything in front of them. Downstream skills never wait on another strategist gate.
- **Complete merge.** If it was research in docs 1 or 2, it's in THE PLAN. Full tables, full receipts, date stamps intact.
- **Call facts outrank recommendations.** Offer components agreed on the call print as LOCKED. The menu is for what's still ours to propose.
- **Samples, clearly labeled.** Headlines/leads/titles are candidates. Production copy comes from the production skills after approval.
- **The ideas ledger is mandatory.** Every call idea gets a line and a disposition.
- **Budget unresolved = first open item, bolded.** Roadmap steps that need it show BLOCKED.
- **No em dashes anywhere in shipping copy. Specific numbers everywhere.**

## COMMON PITFALLS

- **Summarizing instead of merging.** THE PLAN that loses the competitor table to save space just forced someone to reopen dead docs.
- **Skipping the ad library pass because skill 1 "already researched."** Different question, different pass.
- **Recommending over the client's head.** They designed an offer on the call. It's locked. Improve around it.
- **Copy samples that sound like AI.** Three headlines nobody would click are worse than none. Scrub them.
- **A review HTML with no decisions trail.** The whole point is the strategist's keep/kill/edit choices compile into something actionable.
