# Chat Forensics — The Six-Part Analysis

The chat transcript is the highest-signal input in any post-webinar audit. It tells you who actually showed up, who was buying, what wasn't answered, and where heat leaked out of the room.

Run all six parts, A through F. Never skip. If a transcript is missing, flag it at the top of the deliverable and run the rest on what's available.

---

## A. WHO SHOWED UP — AUDIENCE QUALIFICATION

Pull a sample of intro / context messages from chat (job, stage of business, why they're here).

Score:
- % of room that matches the stated ICP
- % that are off-ICP
- % that are unclear or unreadable from chat

Red flags to name explicitly:
- Broke tire-kickers
- Wrong industry
- Existing competitors
- Students of the presenter already paying (freeloaders)
- Freeloader energy (free content hunters)

Green flags to name explicitly:
- Specific business context mentioned
- Revenue numbers mentioned
- Active problems stated
- Decision-maker language

**Verdict line**: Did the traffic source deliver the right people. If the answer is no, the webinar can't be blamed for the poor close rate, the traffic bought the wrong room.

---

## B. CLOSABLE LEADS — BUYING TEMPERATURE

For each named attendee who engaged meaningfully, score 1-5:

- **1** — cold / skeptical / off-ICP
- **2** — curious but not ready
- **3** — warm / engaged / qualifying themselves
- **4** — hot / asking buying questions / ready for offer
- **5** — already sold / asking how to pay

Then produce two lists.

### B1. Top 10 hottest leads
Format:
- Name
- Timestamp in webinar
- Direct quote (the thing they typed that scored them hot)
- Temperature score (usually 4 or 5)

### B2. Top 5 missed buying signals
Format:
- Name
- Timestamp
- What they said
- What the moderator / presenter did (ignored, responded wrong, routed to the wrong answer)
- What should have happened

**Verdict line**: Did the presenter and moderator convert chat heat into sales, or did heat leak out of the room.

---

## C. QUESTIONS, COMMENTS, CONCERNS — WHAT WASN'T ADDRESSED

Categorize every substantive chat message into:

- **LOGISTICS** — price, timeline, how it works, what's included
- **OBJECTIONS** — too expensive, not for me, already tried, not right time, trust issues, "will this work for my industry"
- **CLARIFICATIONS** — didn't understand a teaching point
- **BUYING QUESTIONS** — "where do I sign up," "is the link still open," "can I pay in X installments"
- **CONFUSION** — same question asked 3+ times signals a broken slide
- **DISAGREEMENT / PUSHBACK** — important, shows a belief break didn't land

Then flag:
- % of questions answered in real time
- % of objections addressed from stage (even if not directly to the asker)
- Unanswered questions that likely killed conversions
- Any buying question that was missed or routed wrong

This category is where one-fix-doubles-the-close-rate findings usually show up. Spend the most time here.

---

## D. CHAT ENERGY ARC

Map chat volume and sentiment across the webinar timeline. Use the webinar transcript timestamps as anchors.

- **Opening (0-10 min)** — engaged / dead / confused
- **Teaching blocks (10-50 min)** — leaning in / checking out
- **Bridge to offer** — surge / drop / silence
- **Offer reveal** — buying signals / objections / silence / exodus
- **Close** — urgency activating / flat / pushback

**Silence during the offer is often a worse signal than objections.** Flag silence explicitly. Objections mean they're processing. Silence means they already left mentally.

---

## E. MODERATION QUALITY

- Was a moderator in the chat. Named?
- Were hot leads DM'd or tagged for follow-up in real time?
- Were objections surfaced to the presenter to address live?
- Were chat drops (offer link, bonus reveal, scarcity) timed correctly?
- Did chat activity drop when it should have spiked (at the close)?

Moderation is usually the cheapest fix in the audit. A good moderator on the next run can move the needle without changing a single slide.

---

## F. THE FOLLOW-UP LIST — THE FASTEST MONEY RECOVERY

This is the single most valuable section of any audit. Pull a named list from the chat:

- Hot leads who didn't buy (scored 3+, no purchase)
- People who asked a buying question and got no clear answer
- People who raised a specific objection that wasn't handled
- People who asked for the replay or a 1:1

Format so the client's sales team can run it the next business day:

| Name | Score | What they said | Objection type | Recommended outreach | Suggested channel |
|---|---|---|---|---|---|
| (name) | 4 | "can I pay in 3 installments" | logistics / payment | offer payment plan + close | DM + email |
| (name) | 4 | "will this work for SaaS" | industry fit | send 2 SaaS case studies, offer 15-min call | email |
| (name) | 5 | "where's the link" | ready buyer | direct payment link + same-day close | DM + phone |

This is the deliverable section that pays for the entire audit on day one. Do not skimp on it. Pull 15-30 named leads minimum when the data supports it.

---

## G. GEOGRAPHIC SELF-IDENTIFICATION EXTRACTION

The roll-call moment in chat is a goldmine for two things: a state-by-state map of the room, and the cold-vs-list channel attribution insight. Most audits skip this. Don't.

### When the roll-call happens
Typically the 15-25 minute mark, when the presenter asks "where are you from" or "drop your city in chat." Sometimes it happens at the open. Scan the first 30 minutes of chat for clusters of city / state mentions to find it.

### What to extract

Parse every chat message for location signals using three matching layers:

1. **Full state names** — "California," "Texas," "New York," etc.
2. **State abbreviations in formatted contexts** — `,NY`, `/CA/`, ` TX `, ` FL.`, etc. Only match abbreviations when they appear in a context that makes them unambiguous (preceded or followed by a delimiter or city name). Bare two-letter strings inside words are noise.
3. **City-to-state fallback** — when only a famous city is named ("Brooklyn," "Miami," "Austin," "Dallas," "Chicago," "Phoenix"), map to the state. Maintain a city-to-state mapping for the top 100 US metros.

### What to produce

From the parsed location data, build:

- **US states table** — top 10-15 states with attendee count, % of US sample, and a channel attribution note (was this state inside or outside the ad geo)
- **Regional rollup** — East Coast / Midwest / South Central / West / Other with attendee counts and % share
- **Top-state city breakdown** — for the #1 state, especially if the live event is in that state, pull every city mentioned. This is where hidden geographic concentration lives (locals at the event city, drive-over candidates from nearby cities)
- **International total** — flagged as virtual ticket candidates, separated from US numbers

### The two insights this unlocks

**Insight 1: The list is doing real work.** Attendees from outside the ad geo are definitively list-driven. Flag them as a group and call out the % of the room that came from list, not ads. This reframes the "ad ROAS" conversation when the list is carrying the show rate.

**Insight 2: The locals are the easiest yes in the room.** Attendees who live in the live-event city are the lowest-friction buyers. They don't need to fly. They don't need a hotel. They get a dedicated chat-drop, a dedicated slide angle, and a dedicated phone call in the follow-up sequence. Flag them by name.

### Standard insight callout (purple info box)

Every geographic table in the deliverable carries a one-line "what this means" reframe in a purple info callout. Examples:

> **What this means:** 38% of registered attendees came from outside the ad geo. The list is doing real work. When we expand the ad geo at the same CPL, lead volume scales linearly while the list keeps carrying retention.

> **What this means:** 14 attendees live within 30 minutes of the event venue. These are the easiest yes in the room. Dedicated chat-drop at the offer reveal and dedicated phone outreach inside 24 hours.

---

## IF NO CHAT TRANSCRIPT IS PROVIDED

Flag at the top of the deliverable, in bold:

> No chat transcript provided. Chat forensics is the single highest-signal input for webinar diagnosis. It tells us who showed up, who was buying, and what wasn't answered. Pull the full chat log from the webinar platform (Zoom, Demio, StreamYard) and re-run this audit for the complete diagnostic. Without it, scores for audience qualification, chat moderation, and follow-up playbook cannot be completed, and those categories are usually where the biggest revenue leaks show up.

Do the rest of the audit on what's available. Do not silently omit chat forensics.

---

## EXTRACTION PROMPTS (for running chat analysis inside a project thread)

When a chat transcript is long, use these prompts as starting points inside the same project thread where the transcript is loaded.

**Prompt for Part A (audience qualification):**
> Pull every chat message in the first 15 minutes where an attendee introduced themselves, stated their business, or described their situation. Categorize each as on-ICP, off-ICP, or unclear based on the stated ICP of [insert client ICP here]. Return totals and percentages, plus 5 representative quotes from each category.

**Prompt for Part B (buying temperature):**
> For every named attendee in this chat who posted 2+ substantive messages, score them 1-5 on buying temperature using the rubric: 1 cold, 2 curious, 3 warm, 4 hot, 5 already sold. Return the top 10 hottest with timestamps and direct quotes. Then return any messages that look like buying signals where the presenter or moderator either did not respond or responded with a non-answer.

**Prompt for Part C (questions, comments, concerns):**
> Categorize every substantive message (not reactions or one-word hypes) into: logistics, objections, clarifications, buying questions, confusion, disagreement. For each category, return count, 3 representative quotes, and flag which ones were answered in real time vs. ignored.

**Prompt for Part D (chat energy arc):**
> Using the webinar transcript timestamps as section anchors, map chat volume (high / medium / low / silent) and sentiment (leaning in / neutral / disengaging / pushback) across these five sections: opening (0-10), teaching (10-50), bridge (50-60), offer reveal (60-75), close (75-end). Flag any silence during the offer reveal or close as a red flag.

**Prompt for Part F (follow-up list):**
> Pull every named attendee who meets at least one of: scored 3+ on buying temperature but no purchase recorded; asked a buying question that didn't get a clear answer; raised an objection that wasn't handled from stage; asked for the replay or a 1:1. Return as a table: name, score, what they said, objection type, recommended outreach, recommended channel (DM / email / phone).

**Prompt for Part G (geographic self-identification):**
> Find the roll-call moment in chat (typically 15-25 min mark when the presenter asks "where are you from"). Extract every location signal using three layers: full state names, state abbreviations in formatted contexts (e.g., ",NY" or "/CA/"), and city-to-state fallback for famous cities. Return: (1) US states table with top 10-15 states, count, % of US sample, and whether each state was inside or outside the ad geo of [insert ad geo]; (2) regional rollup (East Coast, Midwest, South Central, West, Other); (3) sub-state city breakdown for the #1 state (especially if live event is in [insert event city]); (4) international total. Flag attendees from outside the ad geo as list-driven and attendees in the event city as locals.
