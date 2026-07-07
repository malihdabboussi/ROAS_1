# TOOLS.md — How Vibey Saves Work

## Data Persistence

All data is saved through the `campaign_capability` tool. Context is automatic — you never need tokens, URLs, or credentials.

**Rules:**

- ALWAYS save to the campaign workspace after completing work — no exceptions
- NEVER save to local files as primary storage — local files are temporary
- Check the response from every save — if it returns an `id`, it worked
- Chain IDs — create offer → use offer_id for steps 2-5, create funnel → use funnel_id for pages
- Context is automatic — the platform knows which user and campaign you're working on

## campaign_capability Actions

| Asset        | Create Action                                                                                   | Read Action                  |
| ------------ | ----------------------------------------------------------------------------------------------- | ---------------------------- |
| Offers       | `create_offer`, `update_offer_step`                                                             | `list_offers`, `get_offer`   |
| Funnels      | `create_funnel`, `add_funnel_page`                                                              | `list_funnels`, `get_funnel` |
| Sequences    | `create_sequence`, `add_sequence_email`                                                         | `list_sequences`             |
| Lead Magnets | `create_lead_magnet`, `update_lead_magnet`                                                      | `list_lead_magnets`          |
| Avatars      | `create_avatar`                                                                                 | `list_avatars`               |
| Themes       | `create_theme`                                                                                  | `list_themes`                |
| Documents    | `save_document`                                                                                 | `list_documents`             |
| Skills       | `create_agent_skill`, `update_agent_skill`, `delete_agent_skill`, `create_agent_skill_resource` | `list_agent_skills`          |
| State        | `update_state`                                                                                  | `get_state`                  |

## Skills Management

You can manage your own skills dynamically — list, create, update, or delete them.

- **`list_agent_skills`** — List all skills assigned to a specific agent. Pass `agent_key` in data.
- **`create_agent_skill`** — Create a new skill. Pass `agent_key`, `skill_key`, `name`, `description`, and `markdown_content` in data.
- **`update_agent_skill`** — Update an existing skill. Pass `agent_key`, `skill_id`, and at least one of: `name`, `description`, `markdown_content`, `is_enabled`, `skill_key`. To update reference files, use `create_agent_skill_resource` instead.
- **`delete_agent_skill`** — Remove a skill. Pass `agent_key` and `skill_id`.
- **`create_agent_skill_resource`** — Add or replace a reference file for a skill. Pass `agent_key`, `skill_key`, `file_path`, and `content`.

Skills saved via these actions are stored in the campaign workspace and synced automatically.

## Working State

Your working state persists across conversations. The platform loads it into `STATE.md` before every session.

- **`update_state`** — Pass `state_content` with the full STATE.md markdown after significant actions (completing an asset, starting async work, hitting a blocker). This replaces the entire state.
- **`get_state`** — Read your current state mid-session if needed.

## Label Parameter

When calling `campaign_capability`, ALWAYS include a `label` — a short, friendly progress message shown to the user. Write it in your Vibey voice. No emojis.

### Label Quality Protocol (MANDATORY)

Labels must describe the exact action being executed right now. The label is user-facing progress UI.

- Match label to `action` exactly (no cross-artifact wording)
- Start with a verb in present tense (`Creating`, `Updating`, `Generating`, `Checking`, `Saving`, `Publishing`)
- Keep it short (4-12 words)
- Be concrete about the artifact (`ad`, `funnel page`, `lead magnet`, `image`, `video`)
- Add one specific context token when available (offer name, page goal, ad angle, asset type)
- Never use unrelated labels (example: funnel label during `create_ad`)
- Avoid generic-only labels when context exists (`Creating your funnel` is weaker than `Creating your webinar opt-in funnel`)

### Action → Label Examples

- `create_ad` → `Creating your retargeting ad`
- `create_ad_set` → `Creating your warm-audience ad set`
- `create_ad_campaign` → `Setting up your traffic ad campaign`
- `create_funnel` → `Creating your webinar registration funnel`
- `add_funnel_page` → `Adding your pricing page`
- `update_funnel_page` → `Updating your checkout page copy`
- `create_offer` → `Creating your high-ticket offer`
- `update_offer_step` → `Updating your offer positioning`
- `create_sequence` → `Creating your welcome email sequence`
- `add_sequence_email` → `Adding your objection-handling email`
- `create_lead_magnet` → `Creating your sleep reset guide`
- `update_lead_magnet` → `Updating your lead magnet content`
- `create_avatar` → `Creating your founder-coach avatar profile`
- `create_theme` → `Creating your luxury brand theme`
- `generate_image` → `Generating your hero background image`
- `generate_video` → `Generating your hero loop video`
- `get_video_status` → `Checking video generation status`
- `publish_ad_to_meta` → `Publishing your ad to Meta`
- `check_meta_connection` → `Checking your Meta connection`
- `update_state` → `Updating campaign state`

## Integrations

The user may have third-party services connected (Fathom, Fireflies, Calendly, Stripe, GoHighLevel, Google Drive, Dropbox, GitHub, Meta, Social Analysis). When connected, you can use them to help the user.

**How it works:**

1. Your system prompt includes a `CONNECTED_INTEGRATIONS` section listing what the user has connected. If it's not there, they have no integrations.
2. Before using an integration, read its capability file: `integrations/{provider}.md` (e.g., `integrations/fathom.md`).
3. The capability file lists every action, its parameters, and example calls.
4. Most integrations use the `use_integration` action. GitHub and Meta have dedicated actions.

**General pattern:**

```
vibey_backend({ action: "use_integration", label: "...", data: {
  "service": "fathom",
  "integration_action": "list_meetings",
  "params": {}
}})
```

**To discover capabilities programmatically:**

```
vibey_backend({ action: "get_capabilities", label: "Checking available integrations", data: {} })
```

**Rules:**

- Only use integrations the user has connected (check CONNECTED_INTEGRATIONS)
- Read the capability file before calling — don't guess action names or params
- If an integration isn't connected and the user asks for it, tell them to connect it in Settings → Integrations
- Never expose tokens, credentials, or internal routing to the user

## Reference Files

Read-only reference material in your workspace:

- `skills/` — Step-by-step workflows for each asset type
- `integrations/` — Capability files for each connected integration
- `examples/` — High-converting examples of funnels, emails, and offers

Use the `read` tool to access these when you need guidance.
