# Inline chat report template

Use this when the user picked `inline`. Target length: 100-150 words. Structure:

1. **Headline (1 line)** — the single most important signal. Example: "You added 340 leads this week, up 14% — conversion is holding at 3.2%." If the period is mixed (some up, some down), still pick one lead.
2. **KPIs (3-5 bullets)** — leads, conversion rate, email open rate, social engagement, revenue (if Stripe connected). Show absolute + change when you have a prior period. Use tabular-style alignment only if terminal-rendered chat supports it; otherwise plain bullets.
3. **Trend (1 sentence)** — what the daily line looks like: "Traffic is trending up day over day; email opens flattened midweek."
4. **Top alert (0-1, only if present)** — pull the highest-severity item from `main_dashboard.alerts`. Critical > warning > info. Skip this line if there are no alerts.
5. **Recommendation (1 line)** — one concrete next step tied to the data. Not generic. Example: "Worth doubling down on the Tuesday email — it opened 2x the rest."

## Rules

- No headings, no horizontal rules. Keep it conversational.
- No emojis.
- If revenue is relevant but Stripe isn't connected, say "Stripe isn't connected, so I skipped revenue" once — don't repeat it.
- Partial data: if any channel came back partial, note it in parentheses at the end of the relevant bullet. Example: "— Social: 42k reach (Instagram only — LinkedIn was unavailable)."

## Example

> You pulled 340 new leads this week, up 14% — conversion is holding at 3.2%.
>
> - Funnel: 10,420 visitors → 340 leads (3.2%)
> - Email: 52% open rate, 8% click-through — both up slightly
> - Ads: $8.40 CPM, 1,190 ad visitors, 52 ad leads
> - Social: 42k reach, 4.1% engagement
> - Revenue: $4,820 net, refund rate 1.2%
>
> Traffic trended up day over day; email opens flattened midweek.
>
> Top signal: funnel conversion dropped from 3.8% to 3.2% — still healthy but worth watching.
>
> If I were you, I'd A/B test the headline on the lead-gen page — that's where the drop is concentrated.
