# HTML One-Pager — the human-facing version of the map

Every run outputs TWO Vibey artifacts for the strategy map:

1. Markdown Doc via `save_document` (record copy in campaign Docs)
2. Visual HTML one-pager via `generate_visual_html` on that Doc's `item_id` (the copy the AM keeps open on the call)

A markdown-only run is incomplete. Do not route to Drive/Slack — those are not agent actions in Vibey.

## Vibey save contract

```json
{
  "action": "generate_visual_html",
  "label": "Designing the pre-call strategy one-pager",
  "data": {
    "item_id": "SPACE_ITEM_UUID_FROM_SAVE_DOCUMENT",
    "style_hint": "one-pager",
    "prompt": "Internal pre-call strategy one-pager. Dark header with client, built date, call date, HYPOTHESIS pill. Gold headline-finding callout. Offer read with 3S pass/partial/fail badges. Numbered suggested-offer cards (name, price, tier, one-line rationale). 2x2 suggested-avatar cards (who, pain quote, dream, objection, targeting). Competitor table with linked prices and counter-position. Blue recommended-play callout with 23-day timeline chips. Red INTERNAL ONLY client-fit risks. Green verify list as native HTML checkboxes (no scripts/on* handlers). Portal pre-fill as a dark mono block. Same facts as the markdown map — render, never rewrite. Receipts dated."
  }
}
```

## Design rules (for the visual prompt)

- **Same content as the markdown map** — rendering, never a rewrite. If it's not in the map, it's not in the HTML.
- **Section order:** dark header (client, built date, call date, HYPOTHESIS pill) → Headline Finding (gold callout) → Offer Read (3S badges + bullets) → Suggested Offers (numbered cards) → Suggested Avatars (card grid) → Market Snapshot (competitor table + pattern line) → Recommended Play (blue callout + timeline chips) → Client-Fit Risks (red, INTERNAL ONLY) → Verify List (green, native checkboxes + fallback lines) → Fill the Gaps → Portal Pre-Fill (dark mono) → footer.
- **Verify list:** use native `<input type="checkbox">` rows. Platform visual docs strip scripts — do not rely on custom JS toggles.
- **Links everywhere receipts exist.** Date-stamp stays visible ("receipts as of [month year]").
- **Risks stay INTERNAL ONLY** — client never sees this file.
- **Look:** dense internal one-pager, not a marketing landing page. Prefer ink/gold/accent callouts over decorative chrome.

Reference look: Impact Elite strategy map (Jul 2026) — match its density and section hierarchy.
