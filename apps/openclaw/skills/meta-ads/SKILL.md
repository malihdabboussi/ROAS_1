---
name: meta-ads
description: Create Meta (Facebook & Instagram) ad copy with proper specs, character limits, and copy frameworks. Use when generating ad copy, ad variations, A/B tests, or ad creative briefs for Facebook or Instagram campaigns. Supports feed ads, Stories, Reels, and Carousel formats. Works with buyer personas/avatars for targeted messaging. Also use for ad audits, headline rewrites, or hook generation for Meta platforms.
---

# Meta Ads Skill

Generate high-converting Meta ad copy with correct specs and proven frameworks.

## Workflow

1. **Identify inputs:** Gather the offer, target avatar, funnel stage, and format (feed/story/reel/carousel). Use campaign context when available.
2. **Select framework:** Choose a copy framework from [copy-frameworks.md](references/copy-frameworks.md) based on the funnel stage and avatar pain points.
3. **Write ad copy:** Follow the output structure below. Respect character limits from [platforms.md](references/platforms.md).
4. **Validate:** Check primary text hook fits in 125 chars. Verify headline ≤40 chars. Confirm CTA matches objective.

## Output Structure

For each ad, output these fields:

```
**Ad Name:** [Internal name for tracking]
**Format:** [Feed / Stories / Reels / Carousel]
**Objective:** [Awareness / Traffic / Lead Gen / Conversions]
**Framework:** [PAS / BAB / 4P / AIDA / Story]

**Primary Text:**
[Full ad copy — hook within first 125 chars]

**Headline:** [≤40 chars]
**Link Description:** [≤30 chars]
**CTA Button:** [From approved list]

**Targeting Notes:**
- Interests: [...]
- Age: [...]
- Placements: [...]

**Visual Direction:** [Brief creative concept for image/video]
```

## Key Rules

- Always front-load the hook in the first 125 characters of primary text — this is the "above the fold" for Meta ads.
- Write in second person ("you"), not first person ("we/our") in primary text.
- Match headline emotional register to the hook.
- One CTA per ad. One emoji near the CTA max. No emoji soup.
- When an avatar is provided, mirror their language, reference their specific frustrations, and speak to their identity. See avatar-driven copy section in [copy-frameworks.md](references/copy-frameworks.md).
- When generating A/B variants, vary the hook type and framework — not just word swaps.
- For carousel ads, provide per-card headlines and a unifying primary text.

## References

- **Platform specs & limits:** [references/platforms.md](references/platforms.md) — character limits, image/video specs, CTA options, placements
- **Copy frameworks:** [references/copy-frameworks.md](references/copy-frameworks.md) — hook formulas, text structure, avatar-driven copy guidance
