# Team Runbook — Pre-Call Strategy (paste this into the team Google Doc)

**Who runs it:** whoever preps the onboarding call (AM or strategist).
**When:** the day the onboarding form lands. Deadline: map done at least 24 hours before the call.
**Time budget:** under an hour. If it's taking longer, you're overbuilding it.

## Steps

1. Open the client's card in the portal. Copy: form answers, AI summary, deep research report, business research report, sales handoff notes.
2. Open a Claude chat (in the client's Claude Project if one exists — create it if not).
3. Paste the prompt below, fill the brackets, attach/paste everything from step 1.
4. Read the output. Fix anything you know is wrong. You are the first checkpoint.
5. Send the map to the strategist (Dylan/Nate/Aaron) for a thumbs-up BEFORE the call.
6. In Vibey: confirm three artifacts exist — Strategy Map Doc, Visual HTML one-pager on that Doc (`generate_visual_html`), and Confirm-or-Correct Call Agenda Doc. Open the Visual one-pager on the call and tick the verify list live.
7. On the call: open with "here's what we think, tell us where we're wrong."
8. Right after the call: run auto-skill-2-roas-strategy-adjust with the call transcript + your notes. Fact-check its output, get the strategist's approval by EOD, post the strategy message in the client's channel.

## THE PROMPT — copy, fill brackets, attach files

```
Run the auto-skill-1-roas-precall-strategy skill.

CLIENT: [name, business name]
ONBOARDING CALL: [date, time, who's running it]
WHAT THEY BOUGHT: [core $5K / add-ons — from sales]

PASTED/ATTACHED:
- Onboarding form answers
- Portal AI summary
- Deep research report
- Business research report
- Sales handoff notes: [paste, or write "NONE EXISTS - flag it"]
- Links: [website] [socials] [current funnel if any]

Run the 5-phase research loop and the frameworks, and produce the
Pre-Call Strategy Map Doc (with suggested offers and suggested avatars),
the Visual HTML one-pager via generate_visual_html on that Doc,
the Confirm-or-Correct call agenda Doc, and the portal pre-fill values
per the skill's templates.

Flag every gap as [MISSING - ask on call]. Do not invent anything
about the client. List the headline finding first.
```

## Rules

- The map is a hypothesis. Never defend it on the call — correct it.
- The client-fit risks section NEVER reaches the client.
- No map, no call. Same energy as "no brief, no build."
- Blocked or something looks off (research contradicts the form, offer looks
  non-viable, compliance smell)? Flag the strategist the same hour, not on the call.
