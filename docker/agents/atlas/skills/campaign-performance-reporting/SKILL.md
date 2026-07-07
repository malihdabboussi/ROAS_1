---
name: campaign-performance-reporting
description: Build a campaign performance report. Use when the user asks how their campaign is doing, wants a daily / weekly / monthly report, or asks about performance, KPIs, analytics, dashboard, ROAS, open rates, engagement, reach, conversion, or revenue. Always asks the user for format (inline, document, or presentation) before pulling data, then calls get_campaign_main_dashboard first and drills into social / stripe / meta insights only when the question or the top-level response requires it.
---

# Campaign Performance Reporting

Answer "how is my campaign doing?" questions with the same numbers the user sees on the Studio dashboard. Before pulling data, confirm the format the user wants — inline chat summary, a full document, or a slide deck. Each format has its own reference template; pulling data for a 1-line inline answer and dumping a 12-section report wastes the user's time and tokens.

## When to use this skill

Trigger when the user asks for:
- How is my campaign doing? / How are things going? / Give me an update
- Daily / weekly / monthly report
- Performance, KPIs, analytics, dashboard, how we're tracking
- ROAS, open rates, engagement rate, reach, revenue, conversion
- A specific channel: "how did my emails perform?", "how's IG doing?"

If the user didn't mention a campaign, resolve the active one from the session. If there's no active campaign and they didn't name one, ask which campaign before doing anything else.

## Step 1 — ask the format first

Always ask this before calling any analytics action. Reason: the data shape is the same, but the render is very different. Pulling a full dashboard to produce a 50-word answer is wasteful; skipping the deep pull when the user wants a deck forces a second round-trip.

Use `ask_clarification` with a single question:

```json
{
  "action": "ask_clarification",
  "label": "Picking the report format",
  "data": {
    "title": "How should I deliver this?",
    "intro_message": "Before I pull the numbers — how do you want this?",
    "questions": [
      {
        "id": "format",
        "text": "Pick a format",
        "type": "single_choice",
        "options": [
          { "id": "inline", "label": "Quick inline summary", "description": "Headline + top KPIs in chat" },
          { "id": "document", "label": "Full document", "description": "Detailed markdown report saved to Documents" },
          { "id": "presentation", "label": "Slide deck", "description": "Presentation with one slide per section" }
        ],
        "required": true
      }
    ]
  }
}
```

Skip the ask only if the user already said it explicitly ("write me a doc", "make a deck", "just tell me the numbers").

## Step 2 — decide the data pull

Start with one call and drill down only when the user's question or the top-level response demands it:

- Always: `get_campaign_main_dashboard` — returns executive KPIs, per-channel summaries, daily trend, contribution breakdown, and alerts in one response.
- Drill into social when: user mentioned Instagram / LinkedIn / posts / reach / engagement, OR `main_dashboard.partial.social === true`, OR `main_dashboard.sources.social.connected_platforms` is non-empty and the report needs per-post detail. Call `get_campaign_social_analytics` once per platform.
- Drill into revenue when: user mentioned revenue / Stripe / sales / ROAS / net, OR report format is document/presentation and revenue is material. Call `get_campaign_stripe_overview`.
- Drill into Meta ads when: user asked about specific ad sets or ads, OR CTR / CPM / ROAS at adset level. Call `get_meta_ads_insights` with the right `level` ("campaign" | "adset" | "ad").

Do not call all four actions by default. One call answers most questions.

## Step 3 — handle not-connected data sources

If any drill-down action returns `connected: false` (or the main-dashboard flags `connected_platforms: []` for a platform the user asked about), hand off to the `integration-playbook` flow instead of silently skipping the section:

1. Call `initiate_integration_connect({ integration_id: <platform> })` — this opens the authorization prompt in the user's browser.
2. Tell the user in plain language, e.g. "Instagram isn't connected yet — I just opened the authorization prompt. Once you approve it, I can pull your last post's reach, engagement, saves, and watch-time." No jargon like "OAuth" or "token".
3. Wait for them to confirm it's connected before retrying the analytics action.

Exception — Stripe revenue: if `get_campaign_stripe_overview` returns `{ connected: false }` during a broader report (inline/document/presentation covering everything), it's fine to skip the Revenue section with a one-line note ("Stripe isn't connected — revenue skipped") rather than interrupt the report flow. Offer the connect step at the end as a follow-up ("Want me to set up Stripe so I can include revenue next time?").

Exception — user already declined: if the user said "don't connect it, just give me what you can", respect that. For social platforms, marketing-domain agents and Vibey can use `use_integration({ service: 'scrapecreators', integration_action: 'instagram_profile', params: { handle } })` to pull public profile data (follower count, post list) — flag clearly that this is public-view data, not owner insights.

## Step 4 — render per format

Each format has a reference template under `references/`. Read the one matching the user's choice and follow it.

| Format         | Reference file                         | Rough length          |
| -------------- | -------------------------------------- | --------------------- |
| `inline`       | `references/inline-template.md`        | ~100-150 words        |
| `document`     | `references/document-template.md`      | 600-1200 words        |
| `presentation` | `references/presentation-template.md`  | 8-12 slides           |

For drill-down decisions, see `references/drill-down-guide.md`.

## Output actions

- `inline` → write the summary directly in chat. No extra action call.
- `document` → `save_document` with `title` and markdown `content`. Tell the user where it was saved.
- `presentation` → read `references/presentation-template.md`, then call `create_presentation` once with a complete HTML bundle.

## Tone and numbers

- Round percentages to one decimal (17.4%, not 17.42%).
- Use absolute values and changes together ("1,240 leads, up 8% vs last week") — not just one.
- Lead with what changed, not what's stable.
- Surface alerts from `main_dashboard.alerts` as-is; don't invent new alerts the data doesn't support.
- If a section is `partial: true`, say so explicitly rather than hiding it.

## Examples

**User**: "How's my campaign doing this week?"
**You**: Ask format. User picks inline. Call `get_campaign_main_dashboard` with `since=<7 days ago>`. Write 4-bullet summary.

**User**: "Generate a weekly report doc for the team."
**You**: Skip format ask (user said "doc"). Call `get_campaign_main_dashboard` + `get_campaign_stripe_overview`. Call `get_campaign_social_analytics` per connected platform. Follow `references/document-template.md`. `save_document`.

**User**: "How's Instagram?"
**You**: Ask format. User picks inline. Call `get_campaign_social_analytics` with `platform=instagram` directly (no main-dashboard needed — the question is narrow).

**User**: "How did my last IG post do?" (Instagram not connected)
**You**: Ask format → user picks inline. Call `get_campaign_social_analytics` with `platform=instagram` → response is `connected: false`. Do NOT write "zero posts, zero reach" — follow the Step 3 handoff: `initiate_integration_connect({ integration_id: 'instagram' })`, tell the user "Instagram isn't connected yet — I just opened the authorization prompt. Once you approve it, I'll pull the numbers." Stop and wait.
