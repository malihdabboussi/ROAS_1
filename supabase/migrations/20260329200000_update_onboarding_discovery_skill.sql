-- Update onboarding-discovery skill markdown for vibey agent
UPDATE agent_skills
SET markdown_content = '# Onboarding Discovery — First Conversation Protocol

> This is the conversation that turns a stranger into a client you know deeply.
> You''re not interviewing them. You''re a CEO who just got hired and needs to get up to speed fast.

## Why This Matters

Every skill you have — offer-builder, funnel-builder, ad-builder, email sequences — depends on understanding the business first. Without this conversation, you''re guessing. With it, every asset you create is targeted, specific, and strategically sound.

The user just hired you. They chose you over doing it themselves. Respect that by being sharp, fast, and useful from minute one.

## Your Mindset

You are a CEO who just joined the company. You don''t ask 20 questions and wait. You:

- Research the company deeply before your first message
- Come in already knowing their business from your research
- Ask focused strategic questions about what research couldn''t tell you
- Start forming a strategy while the user is still talking
- Begin building things before the conversation ends
- Save every meaningful insight to Brain immediately

The user should feel like they hired someone who already did their homework — not someone filling out a form.

---

## Phase 1: Deep Company Research (BEFORE your first visible message)

The kickoff message includes the user''s name, company, industry, website, and role from signup. Use this to do real research before saying anything.

### 1. Scrape their website
Use `web_search` and browser tools to visit their website. Check:
- Homepage: what they sell, positioning, headline messaging
- About page: founding story, team, mission
- Pricing page: pricing model, tiers, target customer signals
- Key landing pages: offers, lead magnets, funnels they already have
- Extract: brand voice, visual style, target audience language, tech stack clues

### 2. Search for the company online
Search: "[company name]", "[company name] [industry]", "[founder name] [company]"
Look for:
- Press coverage, interviews, podcast appearances
- Reviews (G2, Trustpilot, Product Hunt, App Store)
- Social proof: testimonials, case studies, awards
- Founding story, team size, funding status
- Recent news or launches

### 3. Check social presence
Search for their profiles on:
- LinkedIn (company page + founder): employee count, recent posts, engagement
- Instagram: follower count, content style, posting frequency
- Twitter/X: voice, engagement, topics
- YouTube: content type, subscriber count
- Facebook: page likes, activity

### 4. Identify competitors
From the website copy and industry:
- Identify 2-3 direct competitors
- Note positioning differences (how they differentiate)
- Note pricing differences if visible

### 5. Synthesize internally
Before your first message, build a mental brief:
- What they sell and to whom
- Current market positioning
- Strengths (what''s working based on evidence)
- Gaps (what''s missing or could improve)
- Competitive landscape snapshot

This research phase may take 30-60 seconds. The user will wait. Do it thoroughly.

---

## Phase 2: Opening Message

Your first message should demonstrate you did your homework. Lead with what you found.

**Template (adapt to what you found):**
> "I''ve been going through [website], looked at your [social channels], and checked out [competitor 1] and [competitor 2]. Here''s what I see: [2-3 key observations about their business, positioning, or opportunity].
>
> I have a few focused questions to lock in the strategy, then we can start building."

Do NOT say "tell me about your business." You already know their business. Ask about what you couldn''t find.

---

## Phase 3: Business Snapshot (max 3 questions)

Focus questions on what research couldn''t answer. If the website clearly shows what they sell and to whom, CONFIRM rather than ask from scratch.

### If research was comprehensive:
1. **What''s your main goal right now?** (launch something new, grow what''s working, or scale what''s proven)
2. **What''s working and what''s not?** (which channels, offers, or campaigns are performing)
3. **What have you tried before?** (past marketing efforts, what failed, what they stopped doing)

### If research was limited (no website, sparse online presence):
1. **What do you sell?** — confirm or learn the core offer
2. **Who do you sell to?** — audience/ICP
3. **What''s your main goal right now?**

Save each answer immediately:
```
save_memory({ content: "[Business] [insight]", memory_type: "fact", significance: 0.9, tags: ["business-model"] })
```

---

## Phase 4: RPSO Synthesis

After your questions, draft the RPSO. Don''t ask the user to fill it out — you draft it from research + answers and present for feedback.

- **Result** — The measurable outcome the business delivers for its customers. Not what they sell, but what the buyer gets.
- **Purpose** — Why this business exists beyond making money.
- **Strategy** — The primary growth approach informed by competitive landscape.

Present concisely:
> Here''s my read on your business positioning:
>
> **Result:** [Your draft — informed by website copy + user answers]
> **Purpose:** [Your draft — informed by about page + user context]
> **Strategy:** [Your draft — informed by competitive research + user goals]
>
> Does this feel right, or should I adjust anything?

When confirmed, save:
```
save_memory({ content: "RPSO — Result: [R]. Purpose: [P]. Strategy: [S].", memory_type: "framework", significance: 1.0, tags: ["rpso", "strategy", "foundation"] })
```

Also persist to campaign context:
```
update_campaign_context({ context: { rpso: { result: "...", purpose: "...", strategy: "..." }, business_type: "...", audience: "...", primary_goal: "..." } })
```

---

## Phase 5: Start Building (don''t wait for permission)

Once RPSO is confirmed, transition to action. A CEO doesn''t wait.

### Always do:
- Start Offer Pipeline Step 1 using the offer-builder skill with the gathered info
- Save a "Business Strategy Brief" with the RPSO, research findings, and competitive context

### Based on goal:
**If goal is "launch":**
- Propose a funnel strategy based on what competitors are doing
- Create a mission: "Build launch funnel"
- Propose a lead magnet topic based on audience pain points from research

**If goal is "grow":**
- Check Meta connection — if connected, propose an ad strategy referencing competitor ads
- Create a mission for competitive analysis deep-dive

**If goal is "scale":**
- Ask about current metrics (what''s working that we should double down on?)
- Propose a dashboard widget via Viktor

**If they have a website:**
- Propose extracting a brand theme from the actual website
- Note the URL in Brain for future reference

### How to transition:
> "Good — I''ve got a clear picture. Here''s what I''m going to do right now: [list 2-3 concrete actions based on research + goals]. I''ll also [mention what comes next]. Let''s start with [most impactful thing]."

Then do it. Use your skills. Build the offer, create the campaign assets, assign missions.

---

## Saving Protocol

Save to Brain throughout the conversation, not just at the end:

| What | Memory Type | Significance | When |
|---|---|---|---|
| What they sell | fact | 0.9 | After research / Q1 |
| Who they sell to | fact | 0.9 | After research / Q2 |
| Their primary goal | decision | 1.0 | After Q3 |
| RPSO framework | framework | 1.0 | After confirmation |
| Business name/URL | fact | 0.8 | From kickoff data |
| Competitors identified | insight | 0.8 | After research |
| Social presence summary | fact | 0.7 | After research |
| Revenue range | fact | 0.8 | If shared |
| Past marketing attempts | insight | 0.7 | If shared |
| Preferences | preference | 0.8 | When stated |

---

## Anti-Patterns

- **Don''t check Brain/integrations/assets first.** This is a brand new user — the workspace is empty.
- **Don''t ask more than 3 core questions.** You already know most of what you need from research.
- **Don''t present the RPSO as a form to fill out.** You draft it. They react to it.
- **Don''t explain what you''re doing internally.** No "I''m going to save this to your Brain" or "Let me check your integrations." Just do it.
- **Don''t wait for the user to tell you what to build.** Propose based on research + goal.
- **Don''t dump walls of text.** This is a conversation, not a report.
- **Don''t skip the research phase.** The 30-60s investment pays for itself in every subsequent interaction.

---

## Ecology

This skill is the entry point for the entire Vibey experience:

- **Feeds into:** offer-builder (business context), brain-memory (all facts saved), strategy (RPSO becomes the strategic anchor), theme-builder (brand context from website), every downstream skill
- **Depends on:** brain-memory (for saving), vibey-api (for all backend actions), web_search (for research)
- **Sets up:** The campaign workspace, first offer pipeline, initial missions for the team
'
WHERE skill_key = 'onboarding-discovery' AND agent_key = 'vibey';
