# Pixel Slack live audit — 2026-08-18 (read-only, prod `lhfgtsjetcardinpgouq`)

Plan §11.7 first step. Source: `slack_observation_events` (last 30 days), Pixel bot `U0A27G2FG5N`.

## Volume
- **228 Pixel asks in 30 days** (= `@Pixel` mentions + messages in Pixel DMs). DM asks are essentially one person (`U03HG94MS8P`, 48 DMs / 14 days). Channel mentions: 12 channels, ≤5 asks each (`roas-above-it`, `roas-madeline-vetrano`, `roas-ford-media-paincon`, `roas-rich-by-credit`, `client-call-recaps`, …).
- Bot outbound (14 days): 53 "Launch Agent Check-in" DMs (hourly, one DM channel) + ~150 QC/launch posts (see §11.5 finding: ledger disabled by the personal Page Grader row → PR #322).

## Ask-kind histogram (classifier from PR #317, after the audit patch)
| kind | count | notes |
| --- | --- | --- |
| client | 62 | stats/KPIs for a client, `<#C…>` channel refs, "make a task … ASAP", Monday updates |
| team | 12 | "any campaigns off KPI", "everything client wise", "accounts inactive on Slack" |
| general | 1 | "review my call with Aaron and Nate" |
| unclear | 153 | 84 are <40 chars ("hi", "sup", "thoughts?", "has joined the channel", DM continuations without thread ctx) |

## Shapes the R-list under-weighted (now added / fixed)
1. **Channel references by id** — `Prepping for call with <#C0B5MKP7Y30>`, `peep the client channel <#C…>`, `Catch me up on client <#C…>`. Fixed: classifier signal + Client Context Bundle from the referenced channel (PR #321 stack).
2. **Service Request intent over forwarded content** — `need to make a task to edit these videos ASAP`, `I need a video editing task for this due ASAP`, `need this edited VSL style by EOW`. Fixed: classifier signals; assets on SRs (PR #320).
3. **Weekly client update** — `Can you draft monday morning update for me for the client Yasir Khan / Speak Like a CEO` (×3, retyped). Fixed: `client-weekly-update` skill (PR #323).
4. **Portfolio sweeps** — `Any campaigns off KPI?`, `full breakdown of everything client wise on KPIs`, `accounts active but quiet on Slack`. Classifier → team; retrieval ladder for team asks is R13/R50 (list_campaigns/list_clients).
5. **Typos** — `webianr`, `Matser yoru kraft`, `slicnet`. Fuzzy client-name match already exists (PR 288); classifier vocabulary is exact — accepted, the stamp is a hint not a gate.

## R-list adjustments
- Promote R02 (channel-ref catch-up) and R31 (SR over forwarded asset) to tier-1 fixtures.
- Add R50 (inactive-on-Slack accounts) as a team fixture.
- Keep R55 ("thoughts?") as the unclear/ask-one-question fixture.

## Harness
`scripts/roas/pixel-slack-harness/run.mjs` — dry-run verified against prod (channel `2` = `C0A183R8MPV`). Live mode posts the 12 fixtures as the operator (needs `SLACK_HARNESS_USER_TOKEN`), waits for `slack_pixel_turns` (PR #317 migration must be applied), scores kind / forbidden-ask / tools / mentions, writes `.docs/reports/pixel-slack-harness-<date>.json`. Not run live in this session (posting to Slack requires explicit approval).
