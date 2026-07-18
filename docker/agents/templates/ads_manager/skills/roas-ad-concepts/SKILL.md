---
name: roas-ad-concepts
description: Generates 5-10 distinct, scroll-stopping CREATIVE CONCEPTS for a ROAS client ad campaign from the client's info (offer, ICP, niche, promise). Each concept is a big idea, not a finished ad — a named creative mechanism plus the headline/on-image line plus the visual idea plus why it stops the scroll. This is the ideation layer that sits IN FRONT of roas-ad-copy (writes the copy) and roas-ad-design (renders the creative). Load whenever someone wants ad ideas, ad angles, creative directions, "give me concepts for [client]," "what angles can we run," "I need fresh ad ideas," "concept this offer," "the same ads keep coming out the same," or hands over a client/offer wanting creative options before any copy or design. Triggers on "ad concepts," "ad angles," "creative concepts," "concept this," "ad ideas," "fresh angles," or a client name paired with a request for directions/options. Do NOT load to write finished ad copy (roas-ad-copy), render the creative image (roas-ad-design), or landing pages or webinar emails.
---

# ROAS Ad Concepts — the creative-idea layer

The job here is the part that usually doesn't happen: **before** anyone writes copy or renders a creative, generate a spread of genuinely different creative concepts so the team picks from real options instead of running the same ad skeleton every time with the words swapped.

A concept is **not** a finished ad. It's the big idea — the mechanism + the line + the picture in your head. The deliverable is 5-10 of them, each distinct enough that someone scrolling would stop for a different reason.

The reference winners (decoded in `references/swipe-gallery.md`) all share one thing: they do NOT start from the offer. They start from a **creative mechanism** and a **sharp emotional truth about the buyer**, then literalize it. "Stop delivering donuts" doesn't mention the coaching program at all. The empty side of the bed doesn't mention marriage coaching. That's the bar. The offer is the destination, not the headline.

---

## WHERE THIS SITS

```
roas-ad-concepts  → 5-10 big ideas (this skill)
        ↓ pick 2-4
roas-ad-copy      → full Meta copy + Validate Messaging set for the chosen concepts
roas-ad-design    → renders the chosen on-image lines into creatives
```

Each concept this skill outputs is built to hand off clean: it carries the **headline / on-image line** and the **visual** so a chosen concept drops straight into copy and design with nothing lost.

---

## INPUTS — gather before concepting

If something's missing, list the gap and use a clearly-marked placeholder. Don't invent the offer or the buyer.

1. **Client + niche** — who they are, what world their buyer lives in (loan officers, faith-based dads, course creators, credit repair). The niche is where the *insider* mechanisms come from.
2. **Offer + funnel** — what the ad drives to (free training, workshop, VSL) and the promise underneath.
3. **The big promise / transformation** — the after-state the offer sells.
4. **The buyer's real pain + the embarrassing/insider stuff** — the specific stuck moments, the rituals they're sick of, the thing they'd never admit. This is the raw material for the best concepts. Push for specifics.
5. **Existing ads / brand + any winners** — what they've run, what's worked, what to avoid repeating.
6. **Event details if applicable** — date, "free," "live on Zoom" — for the stamp note on the creative.

---

## STEP 1 — RESEARCH (light, but do it)

Two quick passes so the concepts aren't pulled from thin air:

- **The buyer's world.** What does this specific ICP actually do, hate, fear, brag about? What's the insider ritual only they'd recognize (the loan-officer donut run)? What everyday object proves their pain (the cold "OK" text)? Mine the client's inputs first; web-search or check the Meta Ad Library for the niche if the inputs are thin.
- **What's already out there.** Glance at competitor/top-performer ads in the niche so the concepts don't accidentally clone a running ad — and so you can deliberately counter-position against the generic look everyone else is using.

Don't over-research. The point is enough texture to make the concepts *specific*, not a report.

---

## STEP 2 — GENERATE ACROSS MECHANISMS (the core move)

Read `references/concept-mechanisms.md`. It's the catalog of the named creative mechanisms behind the winners (insider-ritual callout, quiet evidence, the split life, the mismatch, belief reversal, stop/start, literalize-the-abstract, status reframe), each with worked examples.

The rule that makes the set actually creative: **spread across DIFFERENT mechanisms.** Eight versions of "STOP doing X, START getting Y" is one concept wearing eight hats. A real spread might be: one insider-ritual, one quiet-evidence (no product shown), one split-life, one mismatch, one belief-reversal, one literalized-abstract — each a different *reason to stop*.

For each concept, lock four things before writing it up:

1. **The mechanism** — which named device from the catalog.
2. **The emotional truth** — the specific thing the buyer feels (called out, caught, ashamed, hopeful, vindicated). Specific beats broad: not "they want more clients," but "they're tired of bribing realtors with donuts to get a meeting."
3. **The line** — the actual headline / on-image words. This is the copy that ships, so run it through the `dylans-super-voice` Human Enforcement layer. One accented word or phrase is good; the design skill highlights it.
4. **The visual** — what the image literally is. The visual must *do work*: literalize the metaphor, show the quiet-evidence artifact, or stage the split. No decorative stock-photo-of-a-smiling-person concepts — if the picture is interchangeable with any other ad, the concept is dead.

**Cover both emotional poles across the set.** The same idea often runs as fear (man falling off the cliff) AND aspiration (man walking through the door to a new skyline). A good spread of 5-10 isn't all doom and isn't all dream — it gives the buyer both directions to test.

---

## STEP 3 — PRESSURE-TEST EACH CONCEPT

Kill or fix any concept that fails these:

- **The scroll test** — would this actually stop a thumb? If it reads like every other webinar ad ("Struggling to get clients? Join my free training"), it's out.
- **The screenshot test** — is it sharp enough that someone in the niche would screenshot it or send it to a friend? The best ones (the kid's drawing, the "OK" text) get shared.
- **The mind-read test** — does the right buyer feel slightly *called out*, like you read their diary? Generic = no stop.
- **The "could be anyone" test** — strip the offer. Does the concept still point at a *specific* person in a *specific* niche? If it could run for any coach in any vertical, make it sharper.
- **The visual-does-work test** — if you removed the text, does the image still carry an idea? If the picture is just wallpaper, rework it.
- **Compliance gut-check** — flag anything that asserts a protected attribute or makes an income/health claim the client can't back (same line as the copy skill). Note it; don't silently ship it.

Aim to deliver only concepts that clear the bar. Better to hand over 6 sharp ones than 10 where half are filler.

---

## STEP 4 — OUTPUT

Default deliverable is a clean markdown doc the team can skim and pick from. Lead with a one-line read on the buyer/insider angle you found, then the concepts. Each concept in this exact shape:

```
### [N]. [Memorable concept name]
- **Mechanism:** [which one from the catalog]
- **Line (headline / on-image):** "[the actual words that ship]"
- **Visual:** [what the image literally is — the literalized idea]
- **Pole:** [fear / aspiration / status / insider-recognition]
- **Segment it hits:** [which buyer this calls out — ties to Validate Messaging]
- **Why it stops the scroll:** [one sentence]
```

Close with a short **HANDOFF** block:
- Which 2-3 you'd run first and why (the sharpest, most distinct).
- Note: "Pick the concepts to run → `roas-ad-copy` for full copy + Validate Messaging, then `roas-ad-design` to render the lines."

Flag any missing inputs / assumptions at the top.

Save to `/mnt/user-data/outputs/` and present it. Offer a DOCX (for the client) only if asked.

---

## COMMON PITFALLS

- **Starting from the offer.** "Join my free webinar on X" is not a concept. Start from the mechanism + the buyer's truth; the offer is where the click goes, not the headline.
- **One mechanism, ten coats of paint.** The whole value is *range*. Spread across different mechanisms so each concept stops a different person for a different reason.
- **Decorative visuals.** A smiling person in a suit on a gradient is wallpaper. The visual has to literalize an idea (donuts, dice, the empty bed, the falling man) or it's not pulling weight.
- **Too safe / too generic.** If it could run for any coach in any niche, it's not a concept yet. The winners are niche-specific and slightly uncomfortable.
- **All one emotional pole.** All-fear is exhausting; all-aspiration is toothless. Give both across the set.
- **Forgetting the handoff.** Each concept must carry a real line + a real visual so it drops straight into copy and design. A vague "do something about work-life balance" isn't a concept.
- **AI smell in the lines.** The headline ships. Run every line through `dylans-super-voice` before handoff.
