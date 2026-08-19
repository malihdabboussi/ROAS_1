-- Pixel operator skill kit (plan §11.4): the weekly client-update mode, launch
-- brief routing to the strategist, and honest browser QC. Pixel's agent_key is
-- 'vibey'; 'pixel' rows are patched alongside so the two never drift (§11.12 #3).

-- 1. Weekly client update — a Pixel *mode* (retrieve → draft in voice → ask once).
INSERT INTO public.agent_skills (
  agent_key,
  skill_key,
  name,
  description,
  markdown_content,
  is_enabled,
  source,
  user_id,
  org_id
)
VALUES (
  'vibey',
  'client-weekly-update',
  'Client weekly update',
  'Drafts the Monday / weekly client update for one client from the Campaign Brain, the client Slack channel, Fathom calls, and open Service Requests, in the team voice, then asks once before posting. Use for "weekly update", "Monday update", "client recap", "what do we tell <client> this week".',
  $skillbody$# Client weekly update

Draft the weekly (usually Monday) update for one client. Use this skill when the user asks for a weekly/Monday update, a client recap, or "what do we tell <client> this week".

## Order of work

1. **Bind the client first.** Use the `[Client context]` bundle / channel identity when present; otherwise resolve the client by name (`list_clients` / `search_campaign_brain` with `campaign_name`). Never draft for a guessed client. If two clients match, ask one question.
2. **Retrieve before drafting** — in this order, and name each source you used:
   - Campaign Brain (`search_campaign_brain`): last 7–10 days of results, decisions, blockers, launch dates.
   - Client Slack channel (`SLACK_SEARCH_MESSAGES` with `client_id=`): what the team shipped, what the client asked, anything unanswered.
   - Fathom calls (`FATHOM_*` / meeting tools): promises made on the last call, next call date.
   - Open Service Requests / tasks for the client (Portal): what is in progress, due dates.
   - Ads/funnel numbers only from tools that return real data. Never invent a metric.
3. **Draft in the team voice** (`dylans-super-voice`): short, warm, specific. Structure:
   - One-line headline (the win or the state of play).
   - **Shipped this week** — 2–5 bullets with links (funnel URLs, Drive/Docs, Loom).
   - **Numbers** — only what you retrieved; say "no new numbers this week" if none.
   - **Next up** — what ships next, owner, date.
   - **Need from you** — questions or approvals, each one line.
4. **Ask once, then act.** Show the draft, say where you would post it (the client channel, or a DM to the account owner), and ask for a yes. Do not post to a client channel without that yes. On yes, post via `SLACK_SEND_MESSAGE` and confirm with the permalink.

## Guardrails

- Client data stays inside the client channel / internal DMs. If the ask came from a mixed Slack Connect DM from an internal sender, drafting is fine; posting goes to the mapped client channel.
- If a source returned partial coverage, say so in one line ("Slack search only covered the last 30 days").
- No filler, no "hope you're doing well". Lead with the substance.
$skillbody$,
  true,
  'system',
  NULL,
  NULL
)
ON CONFLICT (agent_key, skill_key) WHERE user_id IS NULL AND org_id IS NULL
DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  markdown_content = EXCLUDED.markdown_content,
  is_enabled = EXCLUDED.is_enabled,
  source = EXCLUDED.source,
  updated_at = now();

-- 2. Launch briefs + honest browser QC in TOOLS.md (Pixel and Vibey together).
UPDATE public.agent_definitions
SET
  content = content || $guidance$

## Launch briefs and browser QC

- A launch brief asked for in Slack or chat is Pixel's ask: bind the client, retrieve
  (Campaign Brain, client Slack channel, last call), then delegate the strategy
  write-up to the agency strategist with `ask_agent` (agent_key `nate`) and
  return the brief in your own reply. Do not tell the user to hire or ask another
  agent, and never say a brief is impossible.
- Browser click-through is available to you on every channel, including Slack.
  When asked to QC a funnel or page, actually open it and report what you saw.
  If the browser fails or the page cannot be reached, say exactly that — never
  describe a page you did not open.
$guidance$,
  updated_at = now()
WHERE user_id IS NULL
  AND org_id IS NULL
  AND agent_key IN ('vibey', 'pixel')
  AND file_name = 'TOOLS.md'
  AND content NOT LIKE '%## Launch briefs and browser QC%';
