---
name: roas-ad-copy
description: Writes Meta (Facebook and Instagram) ad copy for ROAS client campaigns. Produces the full ad (primary text and hook, image/overlay copy, headline, description, CTA) in the client's voice. Two standing requirements are built in. Every deliverable includes a VALIDATE MESSAGING set, 4-5+ short "if you've / if you are a / if your" identity callouts that each speak to a different audience segment for the same offer. And every new campaign starts with AD LIBRARY RESEARCH, pulling 3-5 competitor and top-performer references from the Meta Ad Library before writing. Load for Meta ad copy, Facebook or Instagram ads, ad creative, hooks, primary text, overlay or image copy, validate messaging sets, identity callouts, or ad library research. Triggers on "write ad copy," "Meta ads," "Facebook ad," "ad creative," "validate messaging," "ad hooks," or a client name paired with an ad campaign. Do NOT load for landing or registration pages, webinar emails (use the webinar skills), or non-ad long-form copy.
---

# ROAS Ad Copy — Meta Ads with Validate Messaging built in

Writes the Meta ad copy that feeds ROAS client funnels, usually driving registration for a webinar or workshop (so this often sits in front of `roas-webinar-emails` and `roas-master-webinar`). The deliverable is the full ad, broken into its real pieces, in the client's voice, grounded in what's actually working in the market.

Two things are standard on every ad-copy task and are not optional, even if the request doesn't mention them:

1. **Validate Messaging set** on every deliverable. 4-5+ short identity callouts, each speaking to a different person/segment, same offer underneath. Details in `references/validate-messaging.md`.
2. **Ad Library research** before writing any new campaign. Pull 3-5 competitor/top-performer references first. Details in `references/ad-library-research.md`.

Do both, every time.

---

## VOICE

Ads run from the client's page in the client's voice (the ad shows "Speaking with Yasir Khan," "Taylor Conroy"). Write as the client, first person, matching their existing ads/brand if samples exist.

- **The human-copy standard is built in and mandatory.** It lives at `references/human-written-copy.md`. Load it before writing and apply it to every line, primary text, hooks, overlays, headlines, and the Validate Messaging set. Meta punishes AI smell harder than almost any channel; a generated-sounding hook tanks relevance and CPM.
- **`dylans-voice` is NOT for the ad copy.** Only load it if Dylan wants a media-buyer brief or team handoff written in his operator-briefing style.

---

## INPUTS REQUIRED — gather before drafting

If any are missing, list the gaps and use clearly-marked placeholders. Don't invent the offer or the audience.

1. **Client + page name** — whose page the ad runs from, the brand/voice
2. **Offer + funnel** — what the ad drives to (free training, workshop, VSL, application) and the page it sends to
3. **The big promise** — the core outcome/transformation the offer delivers
4. **Audience** — who the client actually serves; the raw material for the identity callouts. The more specific the real buyer segments, the better.
5. **Event details if applicable** — date, "free," "live on Zoom," etc. for the creative stamp
6. **Existing ads / brand voice samples** — anything to match
7. **CTA + destination** — the action (register/sign up) and the URL
8. **Competitors to study** — names/pages the client considers competition (seeds the Ad Library research)

---

## STEP 1 — AD LIBRARY RESEARCH (required, before writing)

Load `references/ad-library-research.md`. Mine the Meta Ad Library and competitor pages, pull 3-5 references, and capture each one's hook, identity angle, creative format, CTA, longevity signal, and funnel. If the library won't render through a fetch, web-search the competitors or ask the client to paste screenshots. Don't write blind.

This research feeds both the hooks and the Validate Messaging set. Document the 3-5 references at the top of the deliverable.

---

## STEP 2 — BUILD THE VALIDATE MESSAGING SET (required)

Load `references/validate-messaging.md`. Write 4-5+ identity callouts, each starting with "If you've / if you are a / if your," each calling out a specific person and situation, each hitting a different segment, same offer underneath. Pull the situations from the research and the client's real audience, not imagination. Label which segment each line targets. This block ships in every deliverable.

---

## STEP 3 — WRITE THE ADS

Load `references/ad-anatomy.md` for the six pieces (primary text + hook, headline, description, overlay copy, CTA, destination) and the hook types. Build 2-4 full ad variations off the Validate Messaging matrix so each leads with a different identity. State what's constant across variations (offer, headline, CTA) and what changes (hook, identity, creative angle) so the test is clean.

Pattern-match the proven structures in `assets/swipe-meta-ads.md` (the Yasir and Taylor references); model the structure, write fresh in the client's voice.

Keep the human-copy standard active the whole time you draft.

---

## STEP 4 — SCRUB, THEN OUTPUT

**Scrub first.** Run every line (primary text, hooks, overlays, headlines, Validate Messaging set) back through `references/human-written-copy.md` as a final pass. Hunt the high-frequency offenders: em dashes, triplets, "it's not X it's Y," question-then-list, fake-candor openers, forbidden words, round-number tells. Fix in place. Not done until it passes.

Then output. Default deliverable is a clean markdown doc (copies into Ads Manager / a buyer brief). Structure:

1. **Ad Library research** — the 3-5 references, each with hook/angle/CTA and what's being borrowed
2. **Validate Messaging set** — the 4-5+ labeled identity callouts
3. **The ad variations** — each as all six pieces, clearly labeled, with what's constant vs what's being tested
4. **Flagged gaps / assumptions** at the top if inputs were missing

Offer a DOCX (to share with the client) or the buyer brief in Dylan's voice (`dylans-voice`) on request. Save to `/mnt/user-data/outputs/` and present it.

---

## COMMON PITFALLS

- **Skipping the Validate Messaging set.** It ships every time, even if unasked. 4-5+ distinct identities, not five flavors of one.
- **Generic identity callouts.** "If you're a nonprofit leader" is too broad. "If your nonprofit has changed thousands of lives on a shoestring budget" lands. Specific person, specific situation.
- **Writing blind.** No copy before the Ad Library research. Pull 3-5 references or get them from the client first.
- **Burying the hook.** The first line of primary text carries the click and truncates at ~125 chars. The hook lands before the fold or it's dead.
- **Handing over a copy blob.** Deliver the six labeled pieces, not an undifferentiated paragraph the buyer has to disassemble.
- **AI tells.** Em dashes, triplets, fake-candor openers, forbidden words. Built-in standard at `references/human-written-copy.md`, plus the Step 4 scrub. Don't ship without it.
- **Wrong voice.** Ad copy is the client's voice, not Dylan's and not ROAS's. Dylan's voice is only for a buyer brief.
- **Overlay overload.** One identity callout per creative plus the event stamp. Less text on the image reads better.
- **Unsupported claims / policy risk.** Keep income/results claims to what the client can back; avoid protected-attribute callouts Meta flags. Flag anything borderline.

---

## Where this sits in the funnel

The ad earns the registration click; the webinar skills (`roas-webinar-emails`, `roas-master-webinar`) take it from there. Keep the identity/angle of the winning ads consistent with the webinar's audience and promise so the funnel reads as one message start to finish.
