# Communication

## discover_channel_context
**Required keys:** `channel_id`

**Types:** `channel_id`: string

**Use when:** In a studio channel with no bound campaign (CHANNEL_CONTEXT says none is bound) before any campaign-scoped lookup (avatars, offers, brain).

**Do not use when:** The channel already has a bound campaign — use it directly. Outside studio channels (regular chat conversations resolve scope automatically).

Discovers the campaign context for a Studio channel that is not already bound to one. Use only when channel instructions say no campaign is bound and you need campaign-scoped context. Required: channel_id. If several plausible campaigns are returned, ask the user to pick before binding.

```json
{"action":"discover_channel_context","label":"Finding channel context","data":{"channel_id":"UUID"}}
```

Contract example: find the right campaign for this channel
```json
{"action":"discover_channel_context","label":"find the right campaign for this channel","data":{"channel_id":"UUID"}}
```

## get_member_notes
**Required keys:** `member_id`

**Optional keys:** `member_id`, `campaign_id`, `campaignId`, `space_id`, `scope_override`

**Types:** `member_id`: string, `campaign_id`: string, `campaignId`: string, `space_id`: string, `scope_override`: string

Reads saved internal notes for a channel or campaign member. Use before coordinating with or summarizing context about a specific member. Required: member_id. Optional: campaign_id or space_id.

```json
{"action":"get_member_notes","label":"Checking member notes","data":{"member_id":"UUID"}}
```

## save_member_note
**Required keys:** `member_id`, `note`

**Optional keys:** `member_id`, `note`, `campaign_id`, `campaignId`, `space_id`, `scope_override`

**Types:** `member_id`: string, `note`: string, `campaign_id`: string, `campaignId`: string, `space_id`: string, `scope_override`: string

Saves an internal note about a channel or campaign member. Use when the user gives durable coordination context about a teammate/member that should be available later in the active campaign or channel context. Required: member_id and note. Optional: campaign_id or space_id when the active scope is not enough.

```json
{"action":"save_member_note","label":"Saving member note","data":{"member_id":"UUID","note":"Prefers async review notes before Friday planning."}}
```

## send_user_message
**Required keys:** `message`

**Optional keys:** `message`, `channel_id`, `user_id`

**Types:** `message`: string, `channel_id`: string, `user_id`: string

Sends a message to the user on their preferred channel (Slack, Telegram, or in-app notification). Use when you need to proactively inform the user about something important during a mission — e.g. a blocker, a question, a status update, or a deliverable ready for review. The message is delivered to ALL configured channels (Slack + Telegram) plus in-app.

```json
{"action":"send_user_message","label":"Notifying user","data":{"message":"Your landing page is ready for review — take a look when you have a moment."}}
```

## set_channel_context
**Required keys:** `channel_id`

**Optional keys:** `campaign_id`

**Types:** `channel_id`: string, `campaign_id`: string

**Use when:** After discover_channel_context returned exactly one plausible campaign, or after the user explicitly confirmed which campaign to use.

**Do not use when:** Multiple plausible campaigns and the user has not picked one — never bind without confirmation.

Binds or clears the campaign context for a Studio channel after discover_channel_context returns one clear match or the user confirms the campaign. Required: channel_id. Pass campaign_id to bind; omit campaign_id to clear.

```json
{"action":"set_channel_context","label":"Binding channel context","data":{"channel_id":"UUID","campaign_id":"UUID"}}
```

Contract example: bind the confirmed campaign to this channel
```json
{"action":"set_channel_context","label":"bind the confirmed campaign to this channel","data":{"channel_id":"UUID","campaign_id":"UUID"}}
```
