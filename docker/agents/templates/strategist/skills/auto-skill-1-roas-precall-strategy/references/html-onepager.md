# HTML One-Pager — the human-facing version of the map

Every run outputs TWO files: the markdown map (for Drive/records) and this HTML one-pager (for the team). The AM keeps the HTML open during the call and ticks the verify list live. Save as `[Client]-Strategy-Map.html`.

## Build rules

- **Single self-contained file.** All CSS/JS inline. No external assets, no CDN. Opens anywhere, drops into Slack.
- **Same content as the markdown map** — this is a rendering, never a rewrite. If it's not in the map, it's not in the HTML.
- **Section order:** dark header (client, built date, call date, contact, HYPOTHESIS pill) → Headline Finding (gold callout) → Offer Read (3S pass/partial/fail badges + bullets) → Suggested Offers (numbered cards: name, price, tier tag, one-line rationale) → Suggested Avatars (2x2 card grid: who, quote-style pain, dream, objection, targeting) → Market Snapshot (table: competitor link | price | counter-position, plus the pattern line) → Recommended Play (blue callout: campaign + funnel line + timeline chips showing the 23-day math) → Client-Fit Risks (red callout, "INTERNAL ONLY" label) → Verify List (green callout, clickable checkboxes with fallback lines) → Fill the Gaps → Portal Pre-Fill (dark mono block) → footer.
- **The verify list is interactive:** each item is a checkbox row; clicking toggles strikethrough. Plain JS, no libraries.
- **Palette:** ink #101418, bg #f6f7f9, cards white with #e5e9ed borders, accent blue #0b5fff, gold #b98900 (headline), red #c0392b (risks), green #1e7e46 (verify). System font stack. Max-width 920px.
- **Links everywhere receipts exist.** Every competitor price links out. Date-stamp stays visible ("receipts as of [month year]").
- **Risks stay marked INTERNAL ONLY** in the red block — this file is internal; the client never sees it.

## Skeleton (use this structure; fill with the run's content)

```html
<!DOCTYPE html><html><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>[Client] — Pre-Call Strategy Map</title>
<style>
:root{--ink:#101418;--ink2:#3d4650;--muted:#77828d;--line:#e5e9ed;--bg:#f6f7f9;
--accent:#0b5fff;--accent-soft:#eaf1ff;--gold:#b98900;--gold-soft:#fdf6e3;
--red:#c0392b;--red-soft:#fdeeec;--green:#1e7e46;--green-soft:#e8f5ee}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;
background:var(--bg);color:var(--ink);line-height:1.55;padding:32px 16px 80px}
.wrap{max-width:920px;margin:0 auto}
header{background:var(--ink);color:#fff;border-radius:14px;padding:28px 32px;margin-bottom:20px}
.card{background:#fff;border:1px solid var(--line);border-radius:14px;padding:24px 28px;margin-bottom:16px}
.card h2{font-size:12px;letter-spacing:.13em;text-transform:uppercase;color:var(--muted);margin-bottom:12px;font-weight:800}
.headline{border-left:5px solid var(--gold);background:var(--gold-soft)}
.play{border-left:5px solid var(--accent);background:var(--accent-soft)}
.risk{border-left:5px solid var(--red);background:var(--red-soft)}
.verify{border-left:5px solid var(--green);background:var(--green-soft)}
.vitem{display:flex;gap:12px;background:#fff;border:1px solid var(--line);
border-radius:10px;padding:12px 14px;margin-bottom:8px;cursor:pointer}
.vitem.done .q{text-decoration:line-through;color:var(--muted)}
/* + badges (.pass/.part/.fail), offer/avatar cards, table, timeline chips,
   .prefill dark mono block — style to match the palette above */
</style></head><body><div class="wrap">
<!-- sections in the order above -->
</div>
<script>
document.querySelectorAll('.vitem').forEach(function(i){
i.addEventListener('click',function(e){var c=i.querySelector('input');
if(e.target!==c){c.checked=!c.checked}i.classList.toggle('done',c.checked)})});
</script></body></html>
```

Reference build: `Impact-Elite-Strategy-Map.html` (first run, Jul 2026) — match its look and density.
