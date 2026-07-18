BEGIN;

UPDATE public.skill_library
SET
  description = $desc$ORCHESTRATOR that assembles WEB#5A, the ROAS webinar copy package, by running roas-webinar-topics, roas-webinar-emails, roas-ad-copy, and roas-video-ad-scripts in order. Dylan's Super Voice is loaded for every writing owner and again for the final package-wide rejection check. Landing-page copy is intentionally separate in WEB#5B through roas-landing-page-copy. Load for copy package, full webinar copy, Phase B copy, or an approved strategy ready for copy. Do NOT load for one atomic unit, landing pages, creative production, or strategy.$desc$,
  markdown_content = $body$# ROAS Webinar Copy Package - WEB#5A, one Doc, four owners

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
- Each video uses only **Script**, **Shooting instructions**, and **Overlays**, followed by one shared **Post-production** section for all scripts. The spoken script is continuous and unquoted. Do not expose Hook, Body, CTA, Delivery, or Shot + setting labels.
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
- Assuming an atomic skill's self-check passed. The package-wide gate is the final authority and sends failures back to the owner.$body$,
  updated_at = now()
WHERE skill_key = 'roas-webinar-copy-package';

UPDATE public.skill_library
SET
  description = $desc$Writes clean CLIENT-FACING video ad scripts for ROAS webinar and offer campaigns that clients film themselves. Uses Dylan's Super Voice for natural spoken copy and verified client facts and vocabulary for specificity. Each script is delivered as uninterrupted, unquoted spoken text followed by Shooting instructions and Overlays, with one shared Post-production section for the full set. Load for video ad scripts, client-filmed scripts, UGC or talking-head ads, filming instructions, or what a client should say on camera. Do NOT load to produce AI video, write static ads, or write the webinar itself.$desc$,
  markdown_content = replace(
    replace(
      replace(
        replace(
          replace(
            replace(
              replace(markdown_content,
              $old$# ROAS Video Ad Scripts — written for a client, a phone, and one take$old$,
              $new$# ROAS Video Ad Scripts — written for a client, a phone, and one take$new$
              ),
            $old$### Step 2 — Write each script
Structure per script:
- **HOOK (0-3s)** — the scroll-stopper, first words out of their mouth. Identity callout or pattern interrupt. This line does 80% of the work; write 2 alternates for at least one script.
- **BODY** — the promise/mechanism/story, in spoken language: short sentences, contractions, the way this specific person actually talks. Read-aloud timing rules: ~2.5 words/second; a 30s script is ~70-75 words total, a 60s is ~145-150. Count them.
- **CTA (last 3-5s)** — the exact ask, once, clean.$old$,
            $new$### Step 2 — Write each script
Draft with an opening that stops the scroll, a spoken argument or story, and one clean ask. These are internal writing beats, not client-facing labels. Present the final spoken words as one uninterrupted block so the client can read or paste the script exactly as written. Do not put quotation marks around it. If alternate openings are useful, turn them into complete alternate script versions instead of attaching loose hook fragments.

Use short sentences, contractions, and the way this specific person talks. Read-aloud timing rules: ~2.5 words/second; a 30s script is ~70-75 words total, a 60s script is ~145-150. Count them.$new$
          ),
          $old$Per script add:
- **Delivery notes** — energy, pace, where to pause, which line to punch. Plain language ("say this like you're annoyed for them").
- **Shot + setting** — one setup only: framing (chest-up, phone at eye level), location suggestion, lighting in one line (face a window). No multi-shot edits, no b-roll dependencies — one take must be enough.
- **Overlay plan** — the 3-5 caption/text-overlay moments (hook text on screen, the key number, the CTA end frame) so the editor knows what to burn in.
- **Do NOT say** — claims to avoid on camera (uncleared results, income promises, anything the client can't back).$old$,
          $new$Per script add:
- **Shooting instructions** — combine delivery, pace, pauses, framing, setting, and lighting into short general directions a non-videographer can follow. Use one setup and make one take sufficient.
- **Overlays** — list the 3-5 caption or text-overlay moments so the editor knows what to burn in.

Put uncleared claims, income promises, or anything the client cannot back in the document's open flags, not between the script and filming directions.

After all scripts, add one **Post-production** section that applies to the full set: caption style, basic cuts, audio cleanup, color treatment, end frame, aspect ratios, and export notes. Do not repeat editing directions under every script.$new$
        ),
        $old$Read every script aloud in your head; anything that doesn't sound like a person talking gets rewritten. Full `dylans-super-voice` no-AI-smell pass. Deliver per environment: in a platform with native document artifacts (Vibey), register the markdown as a Doc artifact (`document_artifact`) with the title above — do not write to `/mnt/user-data/outputs/` inside the platform. In claude.ai / no native artifacts (fallback), save to `/mnt/user-data/outputs/` and present.$old$,
        $new$Load `dylans-super-voice` before drafting and confirm it loaded. If it is unavailable, stop and report the missing skill instead of approximating it from memory. Keep it active through the final scrub. Read every script aloud; anything that does not sound like a person talking gets rewritten. Then search for the literal `—` character and run the complete Dylan's Super Voice anti-AI checklist across the spoken text, overlays, and client instructions. Deliver per environment: in a platform with native document artifacts (Vibey), register the markdown as a Doc artifact (`document_artifact`) with the title above. Do not write to `/mnt/user-data/outputs/` inside the platform. In claude.ai or an environment without native artifacts, save the markdown deliverable to `/mnt/user-data/outputs/` and present.$new$
      ),
      $old$# [Client] — Video Ad Scripts ([campaign])
**On camera:** ... | **CTA:** ... | **Grounding:** [research brief / concepts used]

## Script 1 — [FORMAT] ([15s], ~[38] words)
**HOOK (0-3s):** "..."
  Alt hook A: "..." | Alt hook B: "..."
**BODY:** "..."
**CTA:** "..."
**Delivery:** ...
**Shot + setting:** ...
**Overlays:** ...
**Do not say:** ...

[Scripts 2-4...]

## FILMING NOTES (once, for the client)
[phone setup, window light, 3 takes per script, send raw files — five plain lines max]$old$,
      $new$# [Client] - Video Ad Scripts ([campaign])
**On camera:** ... | **Destination:** ... | **Grounding:** [research brief / concepts used]
**Open flags:** [uncleared claims or missing facts]

## Script 1 ([15s], ~[38] words)
### Script
[complete spoken text, uninterrupted and without quotation marks]

### Shooting instructions
[delivery, pace, pauses, framing, setting, and lighting]

### Overlays
[overlay moments]

[Scripts 2-4...]

## Post-production (all scripts)
[captions, cuts, audio cleanup, color, end frame, aspect ratios, and exports]$new$
    ),
    $old$- **Scripts, not production.** No Higgsfield, no generation — that's roas-video-ads.$old$,
    $new$- **Scripts, not production.** No Higgsfield, no generation — that's roas-video-ads.
- **Client-clean format.** No quotation marks around scripts and no Hook, Body, CTA, Delivery, or Shot + setting labels in the delivered document.$new$
  ),
  $old$- One hook per script — the hook is the test; give alternates.$old$,
  $new$- Loose alternate hooks that force the client to reconstruct the script. Make each alternate a complete script version.$new$
  ),
  updated_at = now()
WHERE skill_key = 'roas-video-ad-scripts'
  AND markdown_content NOT LIKE '%**Client-clean format.**%';

UPDATE public.skill_library
SET markdown_content = replace(
  markdown_content,
  'a 60s is ~145-150. Count them.',
  'a 60s script is ~145-150. Count them.'
), updated_at = now()
WHERE skill_key = 'roas-video-ad-scripts';

UPDATE public.skill_library
SET
  description = $desc$Writes Meta (Facebook and Instagram) ad copy for ROAS client campaigns in Dylan's Super Voice, while preserving verified client facts and vocabulary. Presents each variation as continuous, paste-ready ad text instead of AI-looking Hook, Body, and CTA fragments, followed by only the operational Meta fields. Every deliverable includes a VALIDATE MESSAGING set and starts with AD LIBRARY RESEARCH. Load for Meta ad copy, Facebook or Instagram ads, ad creative, hooks, primary text, overlay or image copy, validate messaging sets, identity callouts, or ad library research. Do NOT load for landing pages, webinar emails, or non-ad long-form copy.$desc$,
  markdown_content = replace(
    replace(
      replace(
        replace(
          replace(
            replace(markdown_content,
              $old$Writes the Meta ad copy that feeds ROAS client funnels, usually driving registration for a webinar or workshop (so this often sits in front of `roas-webinar-emails` and `roas-master-webinar`). The deliverable is the full ad, broken into its real pieces, in the client's voice, grounded in what's actually working in the market.$old$,
              $new$Writes the Meta ad copy that feeds ROAS client funnels, usually driving registration for a webinar or workshop. Draft with the real Meta anatomy in mind, then present each variation as clean continuous copy a client can read and a buyer can paste without reassembling AI-looking fragments.$new$
            ),
            $old$- **Dylan's Super Voice is mandatory.** Load `dylans-super-voice` before writing and apply its Human Enforcement layer to every line, primary text, hook, overlay, headline, and Validate Messaging angle.$old$,
            $new$- **Dylan's Super Voice is mandatory.** Load `dylans-super-voice` before writing and apply its Human Enforcement layer to every line, primary text, hook, overlay, headline, and Validate Messaging angle.
- Confirm the skill loaded before drafting. If it is unavailable, stop and report the missing skill instead of approximating it from memory.$new$
          ),
          $old$Load `references/ad-anatomy.md` for the six pieces (primary text + hook, headline, description, overlay copy, CTA, destination) and the hook types. Build 2-4 full ad variations off the Validate Messaging matrix so each leads with a different identity. State what's constant across variations (offer, headline, CTA) and what changes (hook, identity, creative angle) so the test is clean.$old$,
          $new$Load `references/ad-anatomy.md` for the working anatomy and hook types. Build 2-4 full ad variations off the Validate Messaging matrix so each leads with a different identity. The hook, argument, and ask must read as one continuous primary-text block. Never expose Hook, Body, or CTA sublabels in the client-facing output.$new$
        ),
        $old$**Scrub first.** Run every line through the `dylans-super-voice` final checklist. Fix every violation in place. Not done until it passes.$old$,
        $new$**Scrub first.** Run every line through the `dylans-super-voice` final checklist, then search the entire deliverable for the literal `—` character. Fix every violation in the owning ad. Not done until the full deliverable passes.$new$
      ),
      $old$3. **The ad variations** — each as all six pieces, clearly labeled, with what's constant vs what's being tested$old$,
      $new$3. **The ad variations** — each with one uninterrupted **Ad text** block, then **On-image text**, **Headline**, **Description** when used, **Button**, and **Destination**. Do not wrap the ad text in quotation marks.$new$
    ),
    $old$- **Handing over a copy blob.** Deliver the six labeled pieces, not an undifferentiated paragraph the buyer has to disassemble.$old$,
    $new$- **Exposing the drafting anatomy.** Hook, Body, and CTA are internal thinking tools. The client gets one continuous ad-text block plus the operational Meta fields.$new$
  ),
  updated_at = now()
WHERE skill_key = 'roas-ad-copy'
  AND markdown_content NOT LIKE '%Confirm the skill loaded before drafting.%';

UPDATE public.skill_library
SET markdown_content = replace(
  replace(markdown_content,
    $old$Load `dylans-super-voice` first. It is the single voice and anti-AI authority for every email and SMS in this machine.$old$,
    $new$Load `dylans-super-voice` first. It is the single voice and anti-AI authority for every email and SMS in this machine.

Confirm the skill loaded before drafting. If it is unavailable, stop and report the missing skill instead of approximating the voice from memory.$new$
  ),
  $old$**Scrub first.** Before saving anything, run every email and SMS through the `dylans-super-voice` final checklist. Confirm that every fact and scarcity claim is verified, each send has one destination, and the copy contains no residual AI patterns. A sequence is not done until it passes the Dylan's Super Voice checklist.$old$,
  $new$**Scrub first.** Before saving anything, run every email and SMS through the `dylans-super-voice` final checklist. Then search the complete batch for the literal `—` character, including subject lines, preview text, sign-offs, P.S. lines, and SMS. Any match sends that message back for a rewrite. Confirm that every fact and scarcity claim is verified, each send has one destination, and the copy contains no residual AI patterns. A sequence is not done until the complete batch passes.$new$
), updated_at = now()
WHERE skill_key = 'roas-webinar-emails'
  AND markdown_content NOT LIKE '%approximating the voice from memory.%';

UPDATE public.skill_library
SET markdown_content = replace(
  replace(
    replace(
      replace(markdown_content,
        $old$# ROAS Landing Page Copy — the webinar funnel's front door, written$old$,
        $new$# ROAS Landing Page Copy - WEB#5B$new$
      ),
      $old$### Step 2 — Write every block
Full copy, no stubs:$old$,
      $new$### Step 2 — Write every block
Load `dylans-super-voice` and confirm it loaded before writing. If it is unavailable, stop and report the missing skill instead of approximating it from memory.

Full copy, no stubs:$new$
    ),
    $old$Every shipping line through the `dylans-super-voice` no-AI-smell standard (em dashes, triplets, "it's not X it's Y," fake-candor openers — hunt and fix). Section-guide notes are instructions, not copy; they're exempt. Deliver per environment: in a platform with native document artifacts (Vibey), register the markdown as a Doc artifact (`document_artifact`) with the title above — do not write to `/mnt/user-data/outputs/` inside the platform. In claude.ai / no native artifacts (fallback), save to `/mnt/user-data/outputs/` and present.$old$,
    $new$Every shipping line goes through the `dylans-super-voice` no-AI-smell standard. Search the full client-facing page copy for the literal `—` character, plus triplets, "it's not X it's Y," fake-candor openers, and other AI patterns. Section-guide notes are instructions, not copy, but keep them plain and client-ready. Deliver per environment: in a platform with native document artifacts (Vibey), register the markdown as a Doc artifact (`document_artifact`) titled exactly `WEB#5B - Landing Page Copy`. Do not write to `/mnt/user-data/outputs/` inside the platform. In claude.ai or an environment without native artifacts, save to `/mnt/user-data/outputs/` and present.$new$
  ),
  $old$# [Client] — Webinar Landing Pages ([webinar title])
**Flow:** Opt-In → Registration Confirmation | **Date/time:** ... | **Flags:** [brackets, brand source, missing proof]

## Page 1 — Opt-In (Goal: capture registration)
[full copy, every block]

## Page 2 — Registration Confirmation (Goal: raise show rate)
[full copy, every block]

## Design handoff
### Mini brand guide
[fonts, colors/hex + source, button style, look]
### Section guide — Opt-In
[blocks in order, one line each]
### Section guide — Confirmation$old$,
  $new$# [Client] - Webinar Landing Pages ([webinar title])
**Flow:** Opt-In → Registration Confirmation | **Date/time:** ... | **Flags:** [brackets, brand source, missing proof]

## Page 1 - Opt-In (Goal: capture registration)
[full copy, every block]

## Page 2 - Registration Confirmation (Goal: raise show rate)
[full copy, every block]

## Design handoff
### Mini brand guide
[fonts, colors/hex + source, button style, look]
### Section guide - Opt-In
[blocks in order, one line each]
### Section guide - Confirmation$new$
  ), updated_at = now()
WHERE skill_key = 'roas-landing-page-copy'
  AND markdown_content NOT LIKE '%titled exactly `WEB#5B - Landing Page Copy`%';

UPDATE public.skill_library
SET markdown_content = replace(
  replace(
    replace(markdown_content,
      $old$## THE WORKFLOW

### Step 1 — Extract the angle set$old$,
      $new$## THE WORKFLOW

Load `dylans-super-voice` before drafting and confirm it loaded. If it is unavailable, stop and report the missing skill instead of approximating it from memory. Keep it active through the title, teaching bullets, recommendation, and final literal `—` character scan.

### Step 1 — Extract the angle set$new$
    ),
    $old$# [Client] — Webinar Title Options ([date])$old$,
    $new$# [Client] - Webinar Title Options ([date])$new$
  ),
  $old$## Option 1 — [ANGLE NAME]$old$,
  $new$## Option 1 - [ANGLE NAME]$new$
), updated_at = now()
WHERE skill_key = 'roas-webinar-topics'
  AND markdown_content NOT LIKE '%Keep it active through the title, teaching bullets%';

UPDATE public.skill_library_resources
SET content = replace(
  replace(
    replace(content,
      $old$# Meta Ad Anatomy — what you're actually writing

A Meta ad is a few distinct pieces, each with its own job. Write all of them, label them, and keep each one in its lane. Don't hand over a blob of "ad copy" that the buyer has to disassemble.$old$,
      $new$# Meta Ad Anatomy - what you're actually writing

A Meta ad has distinct platform fields, but the primary text should still read like one person wrote it in one pass. Use the anatomy to draft and QA. In the client-facing deliverable, keep the full primary text together instead of exposing Hook, Body, and CTA labels.$new$
    ),
    $old$Deliver every ad as all six pieces, clearly labeled.$old$,
    $new$Deliver each ad in this clean order:

1. **Ad text** as one uninterrupted, unquoted block containing the opener, argument, and ask
2. **On-image text**
3. **Headline**
4. **Description** when used
5. **Button**
6. **Destination**

Never label parts of the primary text as Hook, Body, or CTA in the client-facing output.$new$
  ),
  $old$# Meta Ad Anatomy — what you're actually writing$old$,
  $new$# Meta Ad Anatomy - what you're actually writing$new$
)
WHERE skill_key = 'roas-ad-copy'
  AND file_path = 'references/ad-anatomy.md'
  AND content NOT LIKE '%Never label parts of the primary text as Hook, Body, or CTA%';

UPDATE public.skill_library
SET markdown_content = replace(
  markdown_content,
  $dupe$- Confirm the skill loaded before drafting. If it is unavailable, stop and report the missing skill instead of approximating it from memory.
- Confirm the skill loaded before drafting. If it is unavailable, stop and report the missing skill instead of approximating it from memory.$dupe$,
  $single$- Confirm the skill loaded before drafting. If it is unavailable, stop and report the missing skill instead of approximating it from memory.$single$
), updated_at = now()
WHERE skill_key = 'roas-ad-copy';

UPDATE public.skill_library
SET markdown_content = replace(
  markdown_content,
  $dupe$Confirm the skill loaded before drafting. If it is unavailable, stop and report the missing skill instead of approximating the voice from memory.

Confirm the skill loaded before drafting. If it is unavailable, stop and report the missing skill instead of approximating the voice from memory.$dupe$,
  $single$Confirm the skill loaded before drafting. If it is unavailable, stop and report the missing skill instead of approximating the voice from memory.$single$
), updated_at = now()
WHERE skill_key = 'roas-webinar-emails';

UPDATE public.skill_library
SET markdown_content = replace(
  markdown_content,
  $dupe$- **Client-clean format.** No quotation marks around scripts and no Hook, Body, CTA, Delivery, or Shot + setting labels in the delivered document.
- **Client-clean format.** No quotation marks around scripts and no Hook, Body, CTA, Delivery, or Shot + setting labels in the delivered document.$dupe$,
  $single$- **Client-clean format.** No quotation marks around scripts and no Hook, Body, CTA, Delivery, or Shot + setting labels in the delivered document.$single$
), updated_at = now()
WHERE skill_key = 'roas-video-ad-scripts';

INSERT INTO public.template_skill_assignments (template_key, skill_key, is_enabled)
VALUES
  ('copywriter', 'dylans-super-voice', true),
  ('ads_manager', 'dylans-super-voice', true)
ON CONFLICT (template_key, skill_key) DO UPDATE SET is_enabled = true;

INSERT INTO public.agent_skills (
  user_id, org_id, agent_key, skill_key, name, description, markdown_content, is_enabled, source
)
SELECT NULL, NULL, agent.agent_key, voice.skill_key, voice.name, voice.description,
  voice.markdown_content, true, 'system'
FROM (VALUES ('copywriter'), ('ads_manager')) AS agent(agent_key)
CROSS JOIN public.skill_library AS voice
WHERE voice.skill_key = 'dylans-super-voice'
ON CONFLICT (agent_key, skill_key) WHERE user_id IS NULL AND org_id IS NULL
DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  markdown_content = EXCLUDED.markdown_content,
  is_enabled = true,
  source = 'system',
  updated_at = now();

INSERT INTO public.agent_skills (
  user_id, org_id, agent_key, skill_key, name, description, markdown_content, is_enabled, source
)
SELECT DISTINCT
  marker.user_id,
  marker.org_id,
  marker.agent_key,
  voice.skill_key,
  voice.name,
  voice.description,
  voice.markdown_content,
  true,
  'template'
FROM public.agent_skills AS marker
JOIN public.skill_library AS voice ON voice.skill_key = 'dylans-super-voice'
WHERE marker.skill_key IN (
  'roas-webinar-copy-package',
  'roas-webinar-emails',
  'roas-webinar-topics',
  'roas-ad-copy',
  'roas-video-ad-scripts',
  'roas-landing-page-copy'
)
  AND (marker.user_id IS NOT NULL OR marker.org_id IS NOT NULL)
  AND marker.source IN ('template', 'system', 'default')
ON CONFLICT DO NOTHING;

UPDATE public.agent_skills AS target
SET
  name = library.name,
  description = library.description,
  markdown_content = library.markdown_content,
  is_enabled = true,
  updated_at = now()
FROM public.skill_library AS library
WHERE target.skill_key = library.skill_key
  AND target.skill_key IN (
    'roas-webinar-copy-package',
    'roas-webinar-emails',
    'roas-webinar-topics',
    'roas-ad-copy',
    'roas-video-ad-scripts',
    'roas-landing-page-copy'
  )
  AND target.source IN ('template', 'system', 'default');

UPDATE public.agent_skill_resources AS target
SET content = library.content, content_type = library.content_type, updated_at = now()
FROM public.skill_library_resources AS library
WHERE target.skill_key = library.skill_key
  AND target.file_path = library.file_path
  AND target.skill_key = 'roas-ad-copy'
  AND target.file_path = 'references/ad-anatomy.md';

COMMIT;
