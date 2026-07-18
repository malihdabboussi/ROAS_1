# THE PLAN — output template (v3 order)

One markdown record copy + one interactive HTML review copy. As long as it needs to be; the TL;DR does the at-a-glance job. Load `dylans-super-voice` first and use it as the only voice authority for all prose, starter copy, client messages, and updates. Do not combine it with `human-written-copy` or `dylans-voice`. Every section is written for the person who was not on the call, then checked with the full Dylan Super Voice checklist and a literal `—` scan.

```
# [Client] — THE PLAN
Last updated: [date] · Status: [AWAITING STRATEGIST REVIEW / APPROVED (name, date)] · AM: [name]
Changelog: [date — what changed] (newest first)

## SOURCE OF TRUTH (top of doc, right under the header)
Onboarding call: [Fathom link] · [date, attendees] · Call notes: [portal ref]
Full transcript: LINK ONLY — the Fathom recording + the raw transcript file in
the client Drive folder. Never embed or condense it into the doc. Provenance legend: 🔒 CLIENT-AGREED (quoted,
timestamped) · 📋 CALL NOTES · 🔎 RESEARCH (receipt linked) · 💡 ROAS RECOMMENDATION.

## TL;DR
[5-8 lines: who the client is, the offer, the buyer, what we're running, locked
dates, the one open blocker.]

## 1. HERE'S WHO THE CLIENT IS
[The business in plain sentences: what they do, how they got here, the product
ladder with prices. Then the people, each introduced by NAME + ROLE — including
anyone who appears later (speakers, presenters). Then the engagement: what they
bought from us, when.]

## 2. HERE'S WHAT WE'RE DOING
[The campaign in plain full sentences: type, locked dates/times,
presenters (already introduced above), the list plan, targets-as-targets,
and the one-line why.]
How it runs: [the format decision, stated plainly — e.g. "LAUNCH EVENT:
announcement + ticket drop, MC + rotating speakers, deal live from pitch #1.
Not a teaching webinar, not evergreen." This one line branches every
downstream deliverable, so it is never left implied in prose.]
Modeled on: [closest past winning campaign we've run, if one exists — name it
and link its assets. The structure gets modeled before anything is written.]

## 3. HERE'S THEIR OFFER
LOCKED (agreed on the call — fact, not proposal): [each element in full,
standalone sentences]
[Tier name] — $[price]... what you get: [the real list: days, sessions, meals,
access. DRAFT names marked [DRAFT — confirm].]
Price + anchor: [the actual math written out, receipts linked]
Bonuses (☐ each): [named, with what it is and why it sells]
Risk reversal (☐ decide): [drafted guarantee with name + terms, or "None today"
+ the competitor note]
Scarcity (☐ each): [REAL options only]

## 4. HERE'S THE POSITIONING... AND WHY
[The mechanism, ideally in the client's own words. The unowned position. The
reasoning that connects the research to the choice, in prose a founder could
repeat on a call.]

## 5. COMPETITIVE RESEARCH
### The companies
[Full table: name (link) · price · what they offer · their gap. Date-stamped.]
### The live feed ([date], via roas-market-research)
[Per reference: advertiser · hook · identity angle · format · CTA/destination ·
longevity observed · borrow/counter. Winners' video transcripts summarized.
Saturation note: what everyone runs, where the open lane is.]
### Market proof
[Numbered receipts with links.]
### The buyers
[Full avatar set: who, pains in their words, dream, objection, where to find
them. TAM with source.]
### The outcome stack (what they actually want — every copy decision tests against this)
Stated outcome: [what they'd say they want — the numbers, quoted/sourced]
Real outcome: [what they mean — the pain inverted, in their words from the tape]
Status layer: [the identity/title/rank dimension in their world]
The test: [one line — e.g. "does it promise the title, the freedom, or both?
If it only promises tactics, it's selling the mechanism, not the outcome."]

## 6. HERE'S HOW WE EXECUTE
### What we're building
[Each item named so a cold reader knows what it IS: "Webinar registration
funnel: reg page → confirmation → reminder emails/texts." "Post-webinar
retargeting: the ads + emails that push non-buyers to the event funnel."
No jargon names, no compliance gates in this list.]
### Identity callouts (first — who the ads speak to)
[The callout lines. These set context for the angles below.]
### Recommended angles (☐ each)
[Each angle: the line or visual idea, then 2-3 plain sentences — what the ad
shows/says, who it's for, why the research says it lands.]
### Starter copy
[Pick-one groups: 3 headlines, 3 ad leads, webinar title/subtitle/topic options.]
### Assets & proof
[Have / owed (owner + date) / compliance rules in full.]
### Ideas ledger
[Every call idea → ADOPTED (where) / PARKED (why) / REJECTED (why).]

## 7. TIMELINE & ROADMAP
[Launch math backwards from fixed dates, arithmetic visible. Phase chips.
What fires on approval: auto-skill-4 → task tree → production skills.
BLOCKED items flagged with unblock condition.]

## 8. OPEN ITEMS
- **[BUDGET if unresolved — first, bolded]** → owner, date
- [item] → owner, date
```

## Interactive HTML review copy

House design language (dark header, numbered section cards, timeline chips). Review layer:
- **☐ checkboxes** on every reviewable item (angles, bonuses, guarantee, scarcity) + ONE notes field per section. No keep/kill/edit buttons anywhere.
- **Pick-one groups** for headlines / ad leads / titles.
- **Locked facts**: lock badge, no controls.
- **Expand/collapse** for long research subsections — collapse, never delete.
- **DECISIONS SUMMARY** dock: live-compiles checks, picks, and notes into copyable plain text + "APPROVED BY ___ ON ___" bar.
Single self-contained file, inline CSS/JS.

## Routing
1. THE PLAN (md + html) → client Drive folder (canonical) · portal Strategist tab · TL;DR in internal thread.
2. HTML → strategist. Approve → fold decisions in, stamp APPROVED, ship the client message (auto-skill-2's), run auto-skill-4. Feedback → revise, resend.
3. AM owns freshness: update on every landed open item, stamp the changelog.
