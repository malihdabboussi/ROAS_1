# Output Templates — match these exactly

## Artifact 1: Strategy v2 + Delta (internal)

```
# [Client] — Strategy v2 (post-call) · [date]
Call: [date, who attended] · AM: [name] · Strategist approval: [name] by EOD [date] · Status: FINAL PENDING APPROVAL

## THE DELTA (read this in 2 minutes)
### Confirmed by the call
- [map claim] ✓ [one-line receipt from call]
### Corrected by the call
- [old hypothesis] → [call truth]
### New from the call (things the map never saw)
- [decision/offer/constraint invented or revealed live — exact mechanics]
### Still open
- **[BUDGET if unresolved — always first, bolded]** → owner, deadline
- [item] → [owner], [deadline]

## THE STRATEGY (rebuilt with call truth)
Campaign: [type, locked dates/times, format, presenters]
Offer: [final offer incl. anything designed on the call — tiers, prices, bundles, mechanics]
Funnel: [pages, platform, gating, what replaces what]
List/DBR: [size, engaged segment, cadence, plan]
Launch math: [backwards from fixed dates, arithmetic visible]
Compliance: [flags that survived the call + how angles handle them]

## PROMISE LEDGER
They owe us: [asset/decision] — [owner] — [due]
We owe them: [deliverable] — [owner] — [due]
```

## Artifact 2: Portal campaign details (paste-ready)

```
Campaign 1: [type] · Date: [locked] · Budget: [$ or OPEN-flagged] · KPIs: [targets]
Campaign 2: [type if discussed]
Offer: [name] · Price: [$] · LTV est: [$] · Compliance: [1-10]
```

## Artifact 3: The client strategy message (their Slack channel)

House style — modeled on the ArqDoc message. Plain text, no asterisks/bold, emoji-light, tag real people. Structure:

```
Hey @channel! We've been able to review everything from the call [+ any assets sent since].
Here's where we're at and how we see this going.

WHAT THE RESEARCH TOLD US
1. [Closest competitor + link + price + their pitch in one line + the gap]
2. [Market proof with real numbers + links]
3. [The client's own advantage, ideally in their own words from the call, and the
   position nobody else owns]

THE PLAN
[The approach and why it wins — mechanism, not vibes. Locked dates. The offer
including anything we designed together on the call, framed as the plan, with
the value math.]

Who we're going after first:
- [angle DIRECTION: the person + the pain/desire it hits — e.g. "the capped
  producer who's paid for coaching before and got a binder"]
- [2-4 directions total. NO ad copy, NO quoted lines — finished angles come
  from the ad kit run and follow separately.]

A FEW THINGS WE NEED FROM YOU
1. [Specific ask — owner tagged — deadline]
2. [same]
[3-6 items max, each one actionable]
```

Rules for the message:
- Real links, real numbers, no promised results (targets are fine).
- The client's own good lines from the call get reused — people commit to plans that sound like them.
- Anything we invented together on the call is presented as "the plan we built together," never as news.
- No em dashes. No triplets. Fifth-grade reading level. Sounds like a sharp teammate, not a report.

## Routing (every run)
1. Strategy v2 → client Drive folder + portal Strategist tab.
2. Delta section → internal client thread (paste, don't attach).
3. Client message → posted in client channel AFTER strategist approval, by EOD.
4. OPEN items + promise ledger → ClickUp tasks with owners and dates.
5. **Immediately after this run: auto-skill-3-roas-launch-brief** builds THE PLAN
   (the strategist's approval package). This skill's outputs serve the AM; the
   strategist reviews THE PLAN, not these docs. The client message ships once
   the strategist approves THE PLAN. Ad angles NEVER ship from this skill;
   they come from auto-skill-4 after approval.
```
