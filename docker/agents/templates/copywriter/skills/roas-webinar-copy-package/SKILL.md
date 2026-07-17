---
name: roas-webinar-copy-package
description: ORCHESTRATOR — assembles the full Phase B webinar copy package for a ROAS client by running the atomic skills in order (roas-webinar-topics → roas-webinar-emails → roas-ad-copy → roas-video-ad-scripts → roas-landing-page-copy) and compiling one reviewable package doc. Contains NO copy logic of its own; every deliverable comes from its owning skill. Load for "copy package," "the full webinar copy," "Phase B," "write everything for the webinar," "the whole copy pack for [client]," or a strategy brief approved and ready for the complete copy pass. Do NOT load when the ask is one unit (use the atomic skill directly), for creative/design work (Phase C skills), or for strategy (that's upstream).
---

# ROAS Webinar Copy Package — one Doc, five owners

Thin by design. This skill sequences the atomic skills and assembles their outputs; it never writes copy itself. On a reject at review, re-run ONLY the owning skill for the rejected section with the feedback injected — that's the whole point of the atomic split.

## INPUTS
1. **The approved strategy brief** (THE PLAN) — offer, buyer, promise, proof rules, dates.
2. **Market research** — a `roas-market-research` brief. If absent, run it first (it grounds every downstream skill).
3. **A picked webinar title** — if none, Step 1 produces options; either pause for the pick (pipeline mode, default) or proceed on the recommended option if the user says run straight through.
4. **Scope trims** — any unit the campaign doesn't need (e.g. no video scripts). Confirm the list; default is all five.

## THE SEQUENCE
Run in this order — each unit consumes the ones before it. Load each skill and follow it fully; summaries below are routing, not instructions.

1. **`roas-webinar-topics`** → 3-5 title options + recommendation. *Dependency: everything downstream inherits the pick.*
2. **`roas-webinar-emails`** → the pre/post email + SMS machine, built on the picked title and the funnel dates.
3. **`roas-ad-copy`** → Meta ad variations + the Validate Messaging set (its own ad-library research step is satisfied by the research brief — don't re-pull).
4. **`roas-video-ad-scripts`** → 2-4 client-filmed scripts with hooks/delivery/overlays.
5. **`roas-landing-page-copy`** → Opt-In + Confirmation page copy + the design handoff for roas-funnel-design.

Voice: every skill already routes through `dylans-super-voice`; the assembler does not re-edit their copy.

## ASSEMBLY
Compile into one markdown doc:
```
# [Client] — Webinar Copy Package ([date])
**Title (picked):** ... | **Webinar date:** ... | **Grounding:** [research brief ref]
**Contents:** 1. Title options 2. Emails+SMS 3. Meta ads 4. Video scripts 5. Landing pages
**Open flags:** [every bracket/proof gap from all five units, deduped, in one list]

## 1. Webinar Title + Topics
[the topics skill's output, verbatim]
## 2. Email + SMS Sequence
[...]
## 3. Meta Ad Copy + Validate Messaging
[...]
## 4. Video Ad Scripts (client-filmed)
[...]
## 5. Landing Page Copy + Design Handoff
[...]

## REVIEW MAP
[section → owning skill, so a reject re-runs the right unit:
1→roas-webinar-topics · 2→roas-webinar-emails · 3→roas-ad-copy · 4→roas-video-ad-scripts · 5→roas-landing-page-copy]
```
Deliver per environment: in a platform with native document artifacts (Vibey), register the markdown as a Doc artifact (`document_artifact`) with the title above — do not write to `/mnt/user-data/outputs/` inside the platform. In claude.ai / no native artifacts (fallback), save to `/mnt/user-data/outputs/` and present. Title the Doc exactly `WEB#5 — Copy Package` (legacy `Copy Package` still matches). Present the package first; keep per-unit files as attachments only if the platform supports them.

## HARD RULES
- **No copy logic here.** If this skill is writing headlines, something's wrong — the atomic skill owns it.
- **Order matters.** Title before everything; research before title.
- **Rejects are surgical.** Feedback on section N re-runs only skill N with `{{run.review_feedback}}` / the reviewer's comment injected; the other sections ship untouched.
- **One flags list.** Every bracket and proof gap surfaces at the top — the reviewer shouldn't hunt.
- **Consistency check before shipping:** the title, the promise, and the three discover-bullets read identically across ads, emails, and the opt-in page.

## COMMON PITFALLS
- Writing "quick versions" inline instead of loading the owning skills.
- Re-running the whole package on a single-section reject.
- Skipping the research step because the strategy doc "has enough."
- Letting the units drift (ad promises one outcome, LP another) — run the consistency check.
