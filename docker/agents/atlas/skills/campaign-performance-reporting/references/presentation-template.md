# Presentation Report Template

Use this when the user picked `presentation`. Target: 8-12 fixed-stage slides.

If `presentation-builder` is available, read it before writing source. Build one `html_bundle` deck with `index.html` and `styles.css`. Do not create a title-only presentation and then add slides with `title`/`content`; that legacy path produces low-quality, inconsistent decks.

## Slide Plan

| # | Slide | Pattern | Content |
|---|---|---|---|
| 1 | Title | Cover | Campaign name, date range, "Performance Report" |
| 2 | Executive Summary | Thesis | Top signal, top risk, top opportunity |
| 3 | KPIs at a Glance | Metric Spread | Leads, conversion, email open, engagement, reach, revenue if any |
| 4 | Funnel Performance | Process / Metric | Visitors to leads, conversion rate, trend direction |
| 5 | Email Performance | Metric Spread | Sent, open rate, click rate, top-performing send |
| 6 | Ads Performance | Comparison | Spend, CTR, CPM, ROAS, top ad campaign |
| 7 | Social Performance | Comparison | Per-platform reach and engagement, top post |
| 8 | Revenue | Metric Spread | Gross, refunds, net, refund rate; skip if not connected |
| 9 | Unified Trend | Timeline | Daily visitors, leads, email opens, social reach |
| 10 | Alerts | Evidence Stack | One alert per row; if none, state "No alerts - all healthy." |
| 11 | Recommendations | Roadmap | 3-5 action items tied to evidence |
| 12 | Next Steps | Close / CTA | What to do this week and who owns it if known |

## Per-Slide Rules

- Use one idea and one composition pattern per slide.
- Headlines state the takeaway, not the metric name. Not "Email Performance" but "Email open rate jumped 4 points - headline testing is working."
- Numbers first. If a bullet starts with "The user..." or "Our...", rewrite with the number up front.
- Skip any slide whose underlying section has zero data, but say so on slide 3 ("No ads this period").
- Keep the deck fixed-stage: each slide is `1280px` by `720px`; no `min-height: 100vh`, responsive card grids, or viewport-based type.

## Output Action

Create one presentation with a complete file bundle:

```json
{"action":"create_presentation","label":"Creating the performance deck","data":{"name":"<Campaign> - Performance Report","source_mode":"html_bundle","entry_file":"index.html","files":[{"path":"index.html","role":"entry","content":"<!doctype html><html data-vibey-theme-native=\"true\">...</html>"},{"path":"styles.css","role":"style","content":":root { ... } .deck { width: 1280px; } .slide { width: 1280px; height: 720px; overflow: hidden; }"}]}}
```
