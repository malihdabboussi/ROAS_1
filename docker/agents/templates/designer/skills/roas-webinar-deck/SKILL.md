---
name: roas-webinar-deck
description: Builds the editable Webinar Deck Bones for a ROAS webinar: 10-20 decisive slides covering the promise, problem, big idea, mechanism, teaching framework, proof, offer transition, and complete offer stack. Use for the initial webinar presentation foundation. Do not build a full 40-60 slide deck or export PDF/PPTX in Vibey.
---

# ROAS Webinar Deck Bones

Build one native editable presentation titled `Webinar Deck Bones`. This is the strong first layer future production can expand, not a finished full webinar deck.

## Inputs

- Approved Post-Call Strategy Map and THE PLAN
- Approved Copy Package, especially the title, promise, discover bullets, landing-page copy, and ad angles
- Real host proof, offer details, brand direction, and campaign assets
- Verified client voice plus `dylans-super-voice` for slide language

## Load the campaign Theme first

Call `list_themes`, then `get_theme` for the campaign's active Theme before composing slides. The Theme is the saved brand guide: use its colors, fonts, logo, image direction, brand identity, voice, values, and approved campaign media instead of rebuilding a mini brand guide from memory. Pass its `theme_id` to `create_presentation`, then confirm the saved presentation returns that same `theme_id` so reviewers can verify the source.

If a Theme field is marked `not found` in the Market Research Brand Evidence Ledger, keep that element neutral or bracket it for review. Do not invent a logo, font, color, headshot, or social proof asset.

**Example — complete Theme:** Use the saved yellow/black palette, selected logo asset, heading/body fonts, and approved headshots throughout the deck; attach referenced media to the presentation bundle.

**Example — incomplete Theme:** If the Theme has confirmed colors but no logo, use the confirmed palette and a text wordmark placeholder labeled `[LOGO NOT FOUND]` rather than creating a fake logo.

## Required 10-20 slide bones

1. Title slide using the approved title verbatim
2. Big promise and what the viewer will leave with
3. The problem or current broken approach
4. The big idea or core belief shift
5. The mechanism or named framework
6. Teaching framework and section map
7. One or more decisive teaching slides for the approved discover bullets
8. Real proof or case-study slides, with sources or visible brackets for gaps
9. Recap and offer transition
10. Core product
11. Bonuses
12. Pricing and enrollment path
13. Guarantee, only when verified
14. Real scarcity or urgency, only when verified
15. Clear CTA and next step

Combine or expand these beats as needed, but stay between 10 and 20 slides. The complete offer stack must be understandable from the deck bones.

## Build rules

- Use the environment's native presentation actions and register the artifact in the Space Presentations view.
- Link the presentation to the owning mission subtask.
- Apply the active campaign Theme as one coherent brand and slide-type system across the deck.
- Keep slides visually led and concise. Speaker meaning can live in notes.
- Match the approved title, promise, teaching bullets, offer, and CTA. Do not rewrite locked copy casually.
- Use real proof, price, guarantee, and scarcity. Bracket unknowns instead of inventing them.
- Never export PDF or PPTX inside Vibey.
- Do not pause for a separate outline gate. The Deck Bones artifact is the deliverable for this step.

## Done when

`Webinar Deck Bones` exists as a native editable 10-20 slide presentation, its `theme_id` matches the active campaign Theme, the complete offer stack is present, every unknown is visibly bracketed, and the mission subtask links to it.
