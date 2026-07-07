---
name: brain-library-organization
description: Organize new memories into narrative wiki pages that form Atlas knowledge library. Use for library sync and knowledge-page maintenance missions.
---

# Brain Library Organization

You maintain a personal knowledge library for the user — a flat directory of markdown pages at `~/brain/` where each page synthesizes raw memories into a coherent narrative about one topic, entity, or cross-cutting insight.

The library exists because you answer questions faster and better when knowledge is organized. Instead of searching 500 scattered memories every time someone asks "what's our brand voice?", you read one well-maintained page and have the complete picture — including how it evolved, why it evolved, and what to watch out for.

## Your Library

Your library lives at `~/brain/` — a flat directory of markdown files. No subfolders. Three files are always present:

- **INDEX.md** — your map of every page with one-line summaries, grouped by meaning
- **CAPSULE.md** — ~150–200-word essence of this user, loaded into every conversation
- **LOG.md** — recent changes you've made

Everything else is pages you create as knowledge accumulates. Page names are descriptive slugs — the user's actual topics, not predefined categories. A library with 20 conversations might have 5 pages; one with 200 conversations might have 15. The library grows organically from the user's actual knowledge.

## When You Create vs Update

Your mission context contains the new memories that triggered this sync (typically 10+). For each memory, decide:

- **Fits an existing page** → read that page, patch it with the new information
- **Doesn't fit any page** → skip it. The memory stays in the brain, fully searchable. Not lost. A separate health check (lint) periodically scans for orphan clusters that deserve a page.
- **3+ new memories cluster around a theme with no page** → create a new page. When you do, call `search_user_brain` to find older related memories and include them too — there may be relevant knowledge from previous syncs that now fits this theme.
- **Spans multiple pages** → patch each affected page

A good page has 3+ source memories. Don't create a page from a single data point.

## How to Write Pages

Pages tell stories, not list facts. The user's brand voice didn't appear from nowhere — it evolved through decisions, corrections, and experiments. Write the narrative of that evolution.

Each page follows this flow:
1. **Context** — what this topic is and why it matters to this user (1-2 sentences)
2. **Core insight** — the most important thing to know right now (1-2 sentences)
3. **The story** — how this evolved over time, key decisions, turning points. Include WHY things changed, not just WHAT changed. Note contradictions as growth: "Previously X, but after [event], shifted to Y."
4. **Key takeaways** — 3-5 actionable points an agent would need

Use temporal fields for the story, not row creation time. If a source was imported today but happened two years ago, write the page as an old event learned today. When the page reveals a durable formation, shift, contradiction, decision, or resolution, treat it as timeline-worthy and preserve the evidence references for timeline synthesis.

Keep pages under 500 words. Dense and useful beats comprehensive and long.

**Example — brand-voice.md:**

> The brand started casual-first, reflecting the founder's coaching background. Early conversations (January) used informal, peer-to-peer language — "hey, let's figure this out together."
>
> After B2B outreach began in March, the user explicitly corrected toward professional tone for business contexts. The correction came after an email draft that felt "too bro-y" for enterprise prospects.
>
> The sweet spot that emerged: playful-confident for social and consumer content, structured-professional for B2B. The user described it as "coach speaking at a conference — warm but authoritative, not guru-like." The Velocity carousel copy was specifically praised as the right tone reference.
>
> Watch out: the user's instinct is casual. When they're in flow during a chat session, they default to informal. But when they review deliverables, they want the elevated version.
>
> **Key takeaways:**
> Social/consumer: warm, conversational, coach-like
> B2B/enterprise: structured, authoritative, conference-speaker energy
> Reference: Velocity carousel for tone
> Avoid: guru tone, bro-speak, overly polished corporate

## CAPSULE.md

The capsule is special — ~150–200 words, second person ("You are working with..."), loaded into every Atlas conversation. It's the most compressed, essential context about this user. It is the *capsule twin* of the runtime Spotlight: it must reflect the user's identity AND their cognition (perspectives, beliefs, tensions), not just their projects.

**Before writing or updating the capsule, ALWAYS:**

- Call `get_brain_perspectives` (status `active` or `shifting`) to see every active worldview lens.
- Call `get_brain_belief_patterns` (status `active` or `challenged`) to see dominant beliefs and live tensions.
- Read INDEX.md so you know which entities and topics are central.

**Structure (in this order):**

1. **Identity** — who they are, what world they operate in, the key people / orgs / products that matter to them.
2. **Worldview** — 1–2 sentences synthesized from **all active perspectives combined**. This is not a quote of one perspective — it is the throughline that links them, the meta-pattern in how this user *frames the world*. If only one perspective is active, compress that perspective's narrative. If many are active, find the shared logic underneath them and write *that*.
3. **Core beliefs** — 1–2 dominant active beliefs that shape decisions. Phrase them as the user would say them.
4. **Strategy** — what they're building and how, in their own framing.
5. **Voice** — how they want to be communicated with: tone, dominant emotion (pull from belief `emotional_signature` if present), what they dislike.
6. **Priorities right now** — near-term focus (this quarter / this month). Not a list of evergreen interests.
7. **Constraints / off-limits** — what to avoid: budget caps, channels they don't use, framings they reject.
8. **Tensions** — only when one or more beliefs are currently `challenged` or `transforming`. One line each: "Currently negotiating: X vs Y." Omit the section entirely if none.

**Example:**

> You are working with a content-and-marketing operator embedded in the viral-content world (Viralish, Storyhouse) and building Vibey — an AI operating system replacing the agency tool stack. Sefy (developer, founder) is the core counterpart.
>
> **Worldview:** treats content, business, and growth as solvable systems — formulas to engineer, not artistic acts. Default frame is "what's the repeatable mechanism?"
>
> **Core beliefs:** viral content is a formula, not personality. Agencies are software businesses in disguise.
>
> **Strategy:** Service-as-a-Software — replace the 30–40 tool stack agencies run on with the four-brain Vibey architecture (User, Agent, Company, Customer). Meta ads as the high-volume execution layer.
>
> **Voice:** direct, confident, system-language. Frameworks land (Hormozi Value Equation, Grand Slam Offer, OOC). Avoid guru tone, hype, personality-driven framing.
>
> **Priority right now:** Cortex / Brain depth — making Vibey's identity layer feel neurological.
>
> **Off-limits:** soft-launch / "build in public" framing; pure creative-as-art positioning.
>
> **Tensions:** currently negotiating depth-of-system vs speed-to-ship.

Update the capsule whenever the cognition layer or strategy meaningfully shifts — not on every sync.

## INDEX.md

The index groups pages by meaning — not by type. You decide the groupings based on how the knowledge actually relates.

**Example:**

```markdown
# Brain Index

## The Business
- **product-healing-waves.md** — 49-track meditation library, passive income model
- **target-audience.md** — B2B SaaS founders, $10-50K MRR, time-poor

## How We Communicate
- **brand-voice.md** — Coach at a conference: warm, authoritative

## Strategy & Execution
- **marketing-strategy.md** — Shifting to organic-first after Q1 paid experiments
- **ad-performance.md** — ROAS declining since iOS privacy changes
- **campaign-q2-launch.md** — Community-first launch, school model

## Competitive
- **competitor-jasper.md** — AI copywriting, template-strong, different positioning

## Patterns
- **campaign-learnings.md** — Organic outperforms paid 3:1 for this audience

Last updated: April 5, 2026
Recent: Updated brand-voice.md (Apr 5), Created competitor-jasper.md (Apr 4)
```

Regroup as the library evolves. "Strategy & Execution" might split into "Growth Strategy" and "Campaign Operations" once there are enough pages to justify it.

## Cross-References

When a page mentions another topic that has its own page, note the connection. Use `link_brain_pages` to create the link in the database (this powers graph visualization). In the markdown itself, just mention the related page name naturally — don't add explicit link syntax.

## Actions Reference

Read `references/actions.md` for the complete action reference with parameters.

## Your Workflow (Mission)

When you receive a library sync mission:

1. Read `~/brain/INDEX.md` for current library state
2. Review the new memories in your mission context
3. For each memory, decide which page(s) it belongs to
4. Read affected pages from your workspace
5. Update pages via `patch_brain_page` for section-level changes, or `update_brain_page` for full rewrites (prefer patching — it's faster and preserves content you didn't touch)
6. Update INDEX.md if pages were created or summaries changed
7. Update CAPSULE.md if the overall picture shifted. **Before writing**, call `get_brain_perspectives` (active/shifting) and `get_brain_belief_patterns` (active/challenged), then synthesize a worldview line from **all** perspectives combined (not just one). Follow the structure in the `## CAPSULE.md` section above.
8. Log what you did via `log_brain_event`

For a first-time library (no pages exist yet), read all the memories, identify 3-5 natural themes, and create pages for the strongest clusters. Build INDEX.md and CAPSULE.md from scratch.
