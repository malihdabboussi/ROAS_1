---
name: roas-webinar-emails
description: Writes the full Dylan's Super Voice email + SMS machine that wraps a ROAS client webinar, using the proven flow that doubles back-end bookings. Covers PRE-WEBINAR (list reactivation to drive registrations, confirmation, day-of reminder stack) and POST-WEBINAR, a two-phase engine. A 3-day replay drive ending in a takedown stack, then a hard offer FOMO push to the CTA. Handles attendees (shows) and no-shows as a tone overlay on one machine, pairing every email with an SMS. Load for webinar reminder emails, registration or confirmation sequences, day-of reminders, replay emails, no-show or attendee follow-up, spots-left or cart-close FOMO pushes, "pre-webinar sequence," "post-webinar follow-up," "replay sequence," "no-show emails," "shows vs no-shows," or any presenter name paired with webinar dates and a request for the surrounding emails. Load `dylans-super-voice` with this skill and use it as the master prose standard. Do NOT load to build the webinar (slides, script, offer), that's roas-master-webinar. Do NOT load to audit one that aired, that's roas-webinar-audit.
---

# ROAS Webinar Emails — the Pre + Post Email/SMS Machine

This is the email-and-SMS layer of the ROAS webinar engine. The webinar gets built in `roas-master-webinar` and torn down after in `roas-webinar-audit`. This skill writes the messages that wrap the event and do most of the converting. The structure here is the proven one: on a real client webinar it doubled back-end bookings (5 booked live on the call, 5 more in the days after).

Two halves:

1. **Pre-webinar** — reactivation (drive registrations from an existing list), confirmation, and the day-of reminder stack. Job: fill the room and get people to show up live.
2. **Post-webinar** — a two-phase engine. Job: get the replay watched, then push the offer hard.

The proven swipe copy lives in `assets/`. The transferable plays and their conditions live in `references/angles.md`. Read both before writing the FOMO-heavy sends.

---

## THREE THINGS THAT MAKE THIS WORK (don't skip any)

1. **Email + SMS, paired, every day.** SMS is half the machine, not a bonus. Every email ships with a paired text carrying the same angle in 2-3 lines. The room fills and the bookings come on the texts as much as the emails.
2. **Packets of FOMO, not reminders.** Every single send carries a real deadline, real scarcity, loss framing, or proof others already moved. A send with none of those is filler. Cut it.
3. **Real scarcity, actually executed.** If the replay comes down Friday, it comes down Friday and the page says "Replay Gone." A deadline you don't honor poisons every future send to that list.

---

## VOICE — load before writing a line

Load `dylans-super-voice` first. It is the single voice and anti-AI authority for every email and SMS in this machine.

Confirm the skill loaded before drafting. If it is unavailable, stop and report the missing skill instead of approximating the voice from memory.

- Use **Long-Form Copy** mode for email bodies and **Personal Voice** calibration for SMS.
- Write with Dylan's voice DNA: direct, specific, conversational, properly capitalized, varied in rhythm, and free of corporate or AI phrasing.
- Keep the presenter as the factual speaker. Use their name, offer, proof, stories, audience, and verified claims, but write the words through Dylan's Super Voice.
- Presenter samples refine vocabulary and subject-matter texture; they do not replace the Dylan Super Voice writing standard unless the user explicitly asks for a different voice.

---

## INPUTS REQUIRED — gather before drafting

If any are missing, list the gaps at the top of the deliverable and use clearly-marked placeholders. Never guess a price, a deadline, or a spot count.

1. **Client + presenter** — whose name is in the From field
2. **Webinar topic + promise** — what it teaches, the big belief shift, the headline outcome
3. **Teaching beats** — the 3 things they'll learn (for pre-webinar anticipation and post-webinar callbacks)
4. **Did the webinar actually go deep?** — determines whether the "I revealed too much" angle is honest or nonsense. See `references/angles.md`.
5. **Offer + CTA type** — call/application (spots), purchase (cart), or live-event ticket (seats). Drives the Phase-2 urgency mechanic.
6. **Scarcity structure** — spot count (and how many already taken), cart-close date, fast-action bonus deadline, replay expiration. This is the engine of the whole post flow. No real scarcity = nothing to push against; flag it and recommend one before writing.
7. **Links** — registration, confirm page, Zoom/join, replay, offer/checkout. Real URLs or merge fields.
8. **Existing list?** — is there an aged list to reactivate, or is this paid-traffic registrations only? Determines whether Part A reactivation runs.
9. **Lead runway** — days between registration opening and the webinar
10. **ESP + SMS platform** — GoHighLevel, ActiveCampaign, ConvertKit, Klaviyo, etc. Affects merge-field syntax. Default to plain-text style.
11. **Presenter voice samples** — anything to match. If none, say so and default.

---

## STEP 1 — SCOPE

Decide what's being asked for. Could be the whole machine, just the post-webinar flow, or one piece ("write me the no-show follow-up"). Build only what's asked. If they say "the post-webinar emails" without specifying, that's the full two-phase engine (it serves both shows and no-shows).

Confirm: is there a list to reactivate (Part A), and what's the offer type and scarcity mechanic (drives Phase 2)?

---

## STEP 2 — MAP THE TIMELINE TO A SEND SCHEDULE

Lay out the schedule as a table before writing copy. Every send is anchored to a deadline, not a vibe.

**The proven post-webinar shape (adapt to the actual deadline):**
- **Days 1-3: Replay Drive.** One email + one SMS per day pushing the replay. Day 1 = the pattern interrupt. Day 2 = "did you watch" + proof. Day 3 = the **takedown stack** (3 sends: morning offer-reveal, early-evening "pulling it down," night "last call"), then the replay actually comes down.
- **Days 4-5 (the weekend): Offer FOMO.** One email + one SMS per day, replay gone, hard push straight to the CTA with diminishing scarcity.

Default close is ~5 days post-webinar. Stretch or compress to the real deadline. If the offer has its own hard cart close, that close day gets its own 2-3 send stack too.

Build the table with: send time, channel (email/SMS), phase, segment (registrants / shows / no-shows / all), and the one job of that send. This table is the spine of the deliverable and the build sheet for whoever loads it.

---

## STEP 3 — WRITE EACH PART

Before writing a single send, load `dylans-super-voice` and select its Long-Form Copy mode. Keep it active through the complete draft and final scrub.

Then load the reference for what you're writing, plus `references/email-craft.md` once for the per-send mechanics (subject lines, SMS craft, CTAs, merge fields, deliverability, FOMO standard).

- Master prose voice (load first, apply to everything) → `dylans-super-voice`
- Pre-webinar (reactivation, confirmation, day-of stack) → `references/pre-webinar.md`
- Post-webinar (the two-phase engine + show/no-show overlay) → `references/post-webinar.md`
- The named angles and their conditions → `references/angles.md`
- Proven swipe copy to pattern-match → `assets/swipe-pre-webinar.md`, `assets/swipe-post-webinar.md`

Pattern-match the swipe for FOMO mechanics; adapt the angles to the client; never copy the specifics. Dylan's Super Voice controls the final rhythm and wording. Don't preload everything. Load the voice skill, the part you're on, plus email-craft and angles.

---

## STEP 4 — SCRUB, THEN OUTPUT

**Scrub first.** Before saving anything, run every email and SMS through the `dylans-super-voice` final checklist. Then search the complete batch for the literal `—` character, including subject lines, preview text, sign-offs, P.S. lines, and SMS. Any match sends that message back for a rewrite. Confirm that every fact and scarcity claim is verified, each send has one destination, and the copy contains no residual AI patterns. A sequence is not done until the complete batch passes.

Then output. Default deliverable is clean markdown content that copies straight into an ESP. Structure:

1. **Send schedule table** at the top (from Step 2)
2. **Every send in full**, grouped by part and phase, in send order. For each EMAIL: send timing, channel, segment, 2-3 subject line options, preview text, full body with merge fields, and the P.S. written out. For each SMS: the 2-3 line text with its link.
3. **Flagged gaps / assumptions** at the very top if inputs were missing

Publish according to the environment:

- **Vibey / native artifacts:** call `save_document` once and publish a native editable Doc titled `Webinar Email + SMS Machine — [Client]`. Do not create PDF, DOCX, XLSX, or other file-export companions, and do not write to `/mnt/user-data/outputs/`.
- **Copy Package section 2:** return the complete section to `roas-webinar-copy-package` for verbatim assembly into its single `Copy Package` Doc. Do not publish a separate companion file.
- **claude.ai / no native document capability:** save the markdown deliverable to `/mnt/user-data/outputs/` and present it. Create DOCX or XLSX only when the user explicitly requests that file format.

---

## COMMON PITFALLS

- **Skipping the SMS.** Every email pairs with a text. The flow underperforms by roughly half without them.
- **Using "I revealed too much" when the webinar was thin.** The angle only works when the content genuinely went deep. On a surface-level pitch webinar it reads as fake. Lead the replay drive with outcome/proof instead. See `references/angles.md`.
- **Promising a takedown you don't execute.** If the replay doesn't actually come down when you said, the list learns to ignore every deadline. Take it down.
- **One polite send on the hinge day.** The takedown day (and any hard cart-close day) gets a 3-send stack, not a single reminder.
- **Selling no-shows like they saw the pitch.** They saw nothing. Keep them in replay-drive logic a beat longer before the offer push.
- **Sends that just inform.** Every send carries a deadline, scarcity, loss, or proof-of-action. No FOMO mechanic = cut it.
- **Writing without Dylan's Super Voice loaded.** It is the master voice and Human Enforcement layer for every email and SMS in this skill.
- **AI tells in bulk sends.** Em dashes, triplets, question-then-list, fake-candor openers, and word smells tank deliverability. Run the Dylan's Super Voice Step 4 scrub before shipping.
- **Burying the CTA / link salad.** One destination per send, link 2-3 times in an email, once in an SMS. In Phase 2 the replay link is dead, so nothing competes with the offer.
- **No real scarcity at all.** If there's no spot cap, cart close, bonus expiry, or replay deadline, the post flow has nothing to push. Flag it and recommend a structure before writing.
- **Replay page with no CTA on it.** The booking calendar / checkout should sit directly below the replay video, so watching drops the viewer on the CTA.

---

## Offer-type quick reference (Phase 2 urgency mechanic)

- **Call / application** → booking link + diminishing-spots countdown (10 → 3 → 2 → 1)
- **Purchase** → checkout link + cart-close deadline + fast-action bonus expiry; close day gets a stack
- **Live event ticket** → registration link + seats remaining + event date
