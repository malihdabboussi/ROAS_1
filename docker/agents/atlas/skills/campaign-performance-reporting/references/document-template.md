# Document report template

Use this when the user picked `document`. Render as markdown, then call `save_document` with `title: "<Campaign name> — Performance Report (<date range>)"` and `content: <markdown>`. Target length: 600-1200 words.

## Structure

```markdown
# Executive Summary

2-4 sentences. Answer "what's the single thing to know this week?" Include the headline KPI and one sentence on risk / opportunity.

## Highlights

- 3-5 bullets. Absolute + change. Weighted by business impact (revenue > leads > traffic).

## Channel Performance

### Funnel
- Visitors, leads, conversion rate (+ WoW change)
- Page views, top page (if known)

### Email
- Sent, open rate, click rate, bounce rate
- What changed vs last period

### Ads
- Total ads, ad visitors, ad leads, ad-driven conversion rate
- Meta: spend, impressions, CTR, CPM, ROAS (if connected)

### Social
- Per platform: reach, engagement rate, follower growth, post count
- Top post (by total_interactions) — include caption snippet, post type, reach, engagement

## Trend

1-2 paragraphs. Describe the daily curve for visitors, leads, email opens, social reach. Call out spikes and dips with likely cause ("Friday dip aligns with the email cadence pause").

## Revenue (skip if Stripe not connected)

- Gross, refunds, fees, net
- Refund rate
- Transaction count
- 1-sentence read on margin and refund health

## Alerts

One bullet per alert from `main_dashboard.alerts`. Prefix with severity: `[critical]`, `[warning]`, `[info]`. Don't invent alerts.

## Recommendations

3-5 concrete actions tied to the data. Each is one line. Format: "`<action>` — because `<evidence from the data>`." Example: "Pause the 'Summer Test' ad set — CPM is 2.4x the account average with zero conversions in 7 days."

## Appendix: Raw Tables

Optional. Include the raw timeseries (last 7-14 rows) and per-post table if the user asked for detail or if the dataset is actionable.
```

## Rules

- Use markdown tables for anything with ≥4 rows of structured data.
- Never copy unverified numbers. Every figure must trace back to an actual action response.
- If a section has no data (e.g. no ads, no social), write one line "No ad activity this period" rather than omitting the section — it's meaningful that it's absent.
- Don't include code fences, emoji, or decorative dividers.
