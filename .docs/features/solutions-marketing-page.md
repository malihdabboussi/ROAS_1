# Solutions — Marketing Page Plan

Route: `/solutions/marketing`  
Audience: VP Marketing, Head of Growth, marketing directors forwarding to CMO/CRO  
Tagline: **From strategy to live campaigns**  
Status: Hero live; body sections below are the build spec  
Last updated: 2026-03-23

---

## Page goal

Give a management champion enough proof to forward internally in under 5 minutes. C-level should understand problem → Vibey’s role → what goes live → proof → next step.

---

## Section order

### 1. Hero (live)

| Field | Copy |
|-------|------|
| Kicker | Solutions |
| H1 | MARKETING |
| Tagline | From strategy to live campaigns |
| Subtitle | Your team already has tools for drafts. Vibey is where strategy becomes live campaigns — with memory, agents, and guardrails built in. |
| Bullets | Research → live loop · On-brand via Brain · Publishes to your domain |
| CTA primary | Get Early Access |
| CTA secondary | Book a call (when sales link exists) |

**Visual (phase 2):** Campaign loop mockup or Neel event screenshot — not a generic Studio mockup.

---

### 2. The problem — “Drafts everywhere. Nothing live.”

**Headline:** YOUR TEAM SHIPS DOCUMENTS. NOT CAMPAIGNS.

Three cards:

| Pain | One line |
|------|----------|
| Context loss | Every tool starts from zero. Brand voice drifts campaign to campaign. |
| Tool sprawl | ChatGPT for copy, Canva for creative, builder for pages, separate ESP, separate ad manager. |
| Execution gap | Landing pages stay previews. Emails stay drafts. Ads never connect to the funnel. |

**Reuse:** Pitch slides `SlideProblemMemory`, `SlideProblemSprawl` — rewritten for in-house marketing (not investor tone).

---

### 3. The shift — “One loop, not ten tabs”

**Headline:** FROM STRATEGY TO LIVE CAMPAIGNS

Horizontal or numbered loop (13 steps collapsed to 6 for scanability):

1. Research & positioning  
2. Offer & messaging  
3. Funnel — live on your domain  
4. Email sequences — sending, not drafted  
5. Ads — published to Meta  
6. Leads & analytics — captured automatically  

**Key line:** *Claude gives you a preview. Vibey launches the campaign.*

**Reuse:** `.documentation/overview/pitch.md` “Complete Loop” — marketing-safe wording.

---

### 4. How Vibey runs marketing (three pillars)

**Headline:** THREE PIECES. ONE MARKETING ENGINE.

| Pillar | Marketing angle | Link |
|--------|-----------------|------|
| Brain | Brand voice, offers, past campaigns — agents don’t forget | `/features/the-brain` |
| Agents | Copy, design, media, ads specialists working in parallel | `/features/your-team` |
| Spaces | Calendar, drafts, launch tracker, channels in one workspace | `/features/spaces` |

**Visual:** Existing marketing mockups (`MarketingDocumentsMockup`, campaign preview rotator).

---

### 5. Strategic guardrails

**Headline:** AUTONOMOUS — BUT NOT OFF-SCRIPT

Short block for C-level risk concerns:

- North Star: Result, Purpose, Strategy, Off-Limits  
- CEO agent checks every autonomous action against guardrails  
- No strategy defined → asks first, doesn’t guess  

**Reuse:** `MarketingNorthstarGuardrailMockup` if available.

---

### 6. Proof — customer stories

**Headline:** IN MARKETING TEAMS LIKE YOURS

Two story cards (from pitch deck):

#### Neel Dhingra — Event launch
- **Situation:** Live event, full campaign needed mid-cycle  
- **Ran in Vibey:** Ads, registration page, emails, social — one Space  
- **Outcome:** 8,000+ registrations · 1,000-person event sold out  

#### Adley — Content at scale
- **Situation:** Multi-platform creator, can’t sound like a bot  
- **Ran in Vibey:** Brain from past content · Agents in her voice · Content calendar in Spaces  
- **Outcome:** 1–3B impressions/month  

Each card: photo, role, Brain / Agents / Spaces bullets, proof metric.

**Reuse:** `pitch-slides-customers-model.tsx` copy + `/pitch/` images.

---

### 7. What goes live (differentiation table)

**Headline:** WHAT ACTUALLY SHIPS

| Output | Typical AI stack | Vibey |
|--------|------------------|-------|
| Landing page | Preview in chat | Live on your domain |
| Email sequence | Google Doc | Sends from your domain |
| Meta ads | Copy to paste | Published to ad account |
| Leads | Manual export | CRM / workspace automatically |
| Brand voice | Re-prompt every time | Brain compounds |

**Reuse:** Compare page matrix pattern (`CompareMatrix`).

---

### 8. Typical workflows

**Headline:** WHAT MARKETING TEAMS RUN FIRST

Three zigzag blocks (like compare showcase):

| Workflow | Description | Mockup |
|----------|-------------|--------|
| Launch a campaign | Brief → funnel + emails + ads in one mission | `CapabilitiesCarousel` or funnel hero |
| Content engine | Brain + calendar + multi-channel drafts | `MarketingDocumentsMockup` |
| Event / launch sprint | Time-boxed Space with all channels | Neel screenshot |

---

### 9. FAQ (marketing-specific)

| Question | Answer direction |
|----------|------------------|
| We already use ChatGPT / Claude | Point tools vs full loop — link `/compare/vs-chatgpt` |
| Do we need developers? | Web app, no Docker — link docs getting started |
| How long to first live campaign? | Onboarding shape: Brain → first mission → publish |
| What integrations? | Meta, email, domain, CRM — link integrations feature page |
| Can we approve before things go live? | Guardrails + mission review flow |

**Reuse:** `FAQAccordion` from feature pages.

---

### 10. Closing CTA

**Headline:** READY TO SHOW YOUR TEAM?

- Primary: Get Early Access  
- Secondary: Forward `/resources/overview` when live (executive deck)  
- Tertiary: Other solutions → Agencies, Operations  

**Reuse:** `CompareClosingCta` pattern.

---

## Components to build (marketing body)

| Component | Based on |
|-----------|----------|
| `SolutionProblemSection` | Compare differentiation cards |
| `SolutionLoopSection` | New — numbered loop |
| `SolutionPillarsSection` | Feature value prop grid |
| `SolutionProofStories` | Pitch use case slides |
| `SolutionOutputTable` | Compare matrix |
| `SolutionWorkflowZigzag` | Compare showcase zigzag |
| `SolutionFaq` | Feature FAQ accordion |

Content lives in `solutions-content.ts` under `marketing.sections` (extend type when building).

---

## SEO

- Title: `Marketing Solution | Vibey` (live)  
- Description: live in `solutions-content.ts`  
- Canonical: `https://vibey.im/solutions/marketing`

---

## Build phases

| Phase | Ship |
|-------|------|
| **1 (done)** | Nav + hero + sibling links |
| **2** | Sections 2–4 (problem, loop, pillars) |
| **3** | Sections 5–7 (guardrails, proof, table) |
| **4** | Sections 8–10 (workflows, FAQ, CTA) + hero visual |

---

## Out of scope for this page

- Pricing details (link `/pricing` when enabled)  
- Investor traction / MRR  
- Full product docs (link docs.vibey.im)  
- Agency or ops stories (those live on sibling solution pages)
