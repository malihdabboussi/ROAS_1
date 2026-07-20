---
name: roas-webinar-copy-package
description: ORCHESTRATOR that assembles WEB#5A, the ROAS webinar copy package, by running roas-webinar-topics, roas-webinar-emails, roas-ad-copy, and roas-video-ad-scripts in order. Dylan's Super Voice is loaded for every writing owner and again for the final package-wide rejection check. Landing-page copy is intentionally separate in WEB#5B through roas-landing-page-copy. Load for copy package, full webinar copy, Phase B copy, or an approved strategy ready for copy. Do NOT load for one atomic unit, landing pages, creative production, or strategy.
---

# ROAS Webinar Copy Package - WEB#5A, one Doc, four owners

This skill sequences the atomic skills and assembles their outputs; it never writes copy itself. On a reject at review, re-run only the owning skill for the rejected section with the feedback injected. Landing-page copy has its own WEB#5B task and document so the page-writing skill runs directly and the funnel handoff stays clean.

## INPUTS
1. **The approved strategy brief** (THE PLAN) — offer, buyer, promise, proof rules, dates.
2. **Market research** — a `roas-market-research` brief. If absent, run it first (it grounds every downstream skill).
3. **A picked webinar title** — if none, Step 1 produces options; either pause for the pick (pipeline mode, default) or proceed on the recommended option if the user says run straight through.
4. **Scope trims** — any unit the campaign doesn't need (e.g. no video scripts). Confirm the list; default is all four.

## THE SEQUENCE
Run in this order — each unit consumes the ones before it. Load each skill and follow it fully; summaries below are routing, not instructions.

1. **`roas-webinar-topics`** → 3-5 title options + recommendation. *Dependency: everything downstream inherits the pick.*
2. **`roas-webinar-emails`** → the pre/post email + SMS machine, built on the picked title and the funnel dates.
3. **`roas-ad-copy`** → Meta ad variations + the Validate Messaging set (its own ad-library research step is satisfied by the research brief — don't re-pull).
4. **`roas-video-ad-scripts`** → 2-4 client-filmed scripts with hooks/delivery/overlays.
Before each writing unit, load `dylans-super-voice` and keep it active through that unit's scrub. Client voice samples and Brain context add verified facts, vocabulary, and subject-matter texture. They do not replace Dylan's Super Voice as the writing standard.

## ASSEMBLY
Compile into one markdown doc:
```
# [Client] - Webinar Copy Package ([date])
**Title (picked):** ... | **Webinar date:** ... | **Grounding:** [research brief ref]
**Contents:** 1. Title options 2. Emails+SMS 3. Meta ads 4. Video scripts
**Open flags:** [every bracket/proof gap from all four units, deduped, in one list]

## 1. Webinar Title + Topics
[the topics skill's output, verbatim]
## 2. Email + SMS Sequence
[...]
## 3. Meta Ad Copy + Validate Messaging
[...]
## 4. Video Ad Scripts (client-filmed)
[...]

## REVIEW MAP
[section → owning skill, so a reject re-runs the right unit:
1→roas-webinar-topics · 2→roas-webinar-emails · 3→roas-ad-copy · 4→roas-video-ad-scripts]
```
Deliver per environment: in a platform with native document artifacts (Vibey), register the markdown as a Doc artifact (`document_artifact`) with the title above. Do not write to `/mnt/user-data/outputs/` inside the platform. In claude.ai or an environment without native artifacts, save to `/mnt/user-data/outputs/` and present. Title the Doc exactly `WEB#5A - Copy Package` (legacy `WEB#5 — Copy Package` and `Copy Package` still match). Present the package first; keep per-unit files as attachments only if the platform supports them.

## FINAL PACKAGE GATE

Load `dylans-super-voice` again after all four sections return. The assembler does not rewrite copy. It checks the complete package and rejects any failing section back to its owning skill.

The package cannot be saved until all of these are true:

- Client-facing copy contains zero em dashes. Search for the literal `—` character across titles, subject lines, bodies, SMS, ads, scripts, overlays, and instructions.
- The Dylan's Super Voice checklist passes across every shipping line, including no triplets, fake-candor openers, question-then-list patterns, staccato fragment drums, or AI word smells.
- Each Meta variation contains one continuous, unquoted **Ad text** block. Do not expose Hook, Body, or CTA labels. Follow it only with On-image text, Headline, Description when used, Button, and Destination.
- Each video uses only **Script**, **Shooting instructions**, and **Overlays**, followed by one shared **Post-production** section for all scripts. The spoken script is continuous and unquoted. Do not expose Hook, Body, CTA, Delivery, or Shot + setting labels. Reject timestamps, editing timecodes, and time ranges such as `0:00-0:05` or `0-3s`; rerun `roas-video-ad-scripts` to return exact overlay lines in spoken order.
- Landing-page copy is absent. WEB#5B owns it.

## HARD RULES
- **No copy logic here.** If this skill is writing headlines, something's wrong — the atomic skill owns it.
- **Order matters.** Title before everything; research before title.
- **Rejects are surgical.** Feedback on section N re-runs only skill N with `{{run.review_feedback}}` / the reviewer's comment injected; the other sections ship untouched.
- **One flags list.** Every bracket and proof gap surfaces at the top — the reviewer shouldn't hunt.
- **Consistency check before shipping:** the picked title and promise agree across topics, ads, emails, and scripts. WEB#5B consumes them next.

## COMMON PITFALLS
- Writing "quick versions" inline instead of loading the owning skills.
- Re-running the whole package on a single-section reject.
- Skipping the research step because the strategy doc "has enough."
- Letting the units drift so ads, emails, and scripts promise different outcomes. Run the consistency check.
- Assuming an atomic skill's self-check passed. The package-wide gate is the final authority and sends failures back to the owner.
