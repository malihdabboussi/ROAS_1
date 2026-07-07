---
name: integration-playbook
description: How to discover, verify, connect, and use third-party integrations. Use when a user mentions any external service (Google Drive, LinkedIn, Stripe, Slack, etc.), asks about connection status, wants to connect a new service, or when an integration action fails. Triggers on: integration, connect, disconnect, linked, authorized, service name mentions.
---

# Working with Integrations

Vibey connects to third-party services (Google Drive, LinkedIn, Stripe, Slack, and many more). You can check which services the user has connected, help them connect new ones, and execute actions through those services.

## Why Verification Matters

If a user asks about a connected service, your instinct might be to assume you know whether it's connected. Don't. Connection status changes -- users connect and disconnect services between conversations, tokens expire, permissions get revoked. Claiming "that's not connected" when it actually is (or vice versa) erodes the user's trust immediately. A quick check takes a fraction of a second and gives you ground truth.

## The Flow

### 1. Check Before You Speak

When a user mentions a third-party service, verify the connection before responding about its status.

- `check_integration_connection` with `integration_id` (e.g. "google_drive", "linkedin") -- returns `connected: true/false`. Use this when you just need to know if it's connected.
- `get_integration` with `service` (e.g. "instagram", "youtube") -- returns `connected: true/false` plus a list of available actions you can perform. Use this when you need to do something with the integration, since you'll need the action slugs anyway.

### 2. Not Connected? Start the Connection

When `connected` comes back `false`, use `initiate_integration_connect` with the `integration_id`. This opens a connection prompt in the user's browser. Let them know what's happening:

*"I'll set up the connection to [Service Name] -- you should see an authorization prompt momentarily."*

Then wait for them to confirm before proceeding.

### 3. Find What You Can Do

If you're not sure what actions an integration offers, use `search_available_integrations` with a natural language query (e.g. "list files", "send email", "create post"). It returns matching actions grouped by integration. This is useful when the user describes what they want in their own words rather than naming a specific service.

### 4. Execute Actions

Use `use_integration` with `service`, `integration_action` (the action slug from step 1 or 3), and `params`. Each action has its own parameter shape -- the action list from `get_integration` includes parameter definitions.

### 5. Handle Failures Gracefully

When a `use_integration` call fails:
- **Auth/permission errors** mean the connection needs refreshing. Tell the user: *"Your [Service Name] connection needs to be refreshed -- you can reconnect it in Settings > Integrations."* Don't retry the same call -- it will fail again with the same error.
- **Rate limits** are temporary. Wait briefly and try once more.
- **Missing parameters or bad input** means you need to adjust your request. Check the action's parameter schema and fix the call.

## Examples

**User:** "Can you check my latest LinkedIn posts?"

1. Call `get_integration` with `service: "linkedin"`
2. Response has `connected: true` and a list of actions including one for reading posts
3. Call `use_integration` with the appropriate action slug and params
4. Present the results

**User:** "Pull my files from Google Drive"

1. Call `check_integration_connection` with `integration_id: "google_drive"`
2. Response has `connected: false`
3. Call `initiate_integration_connect` with `integration_id: "google_drive"`
4. Tell the user: "I'm setting up the connection to Google Drive -- you'll see an authorization prompt in a moment. Once that's done, I'll be able to browse your files."

**User reports:** "LinkedIn posting stopped working"

1. Call `check_integration_connection` with `integration_id: "linkedin"` -- if `connected: false`, the connection dropped
2. Tell the user: "It looks like your LinkedIn connection needs to be refreshed. You can reconnect it in Settings > Integrations, and I'll be ready to post again."

## What Not to Expose

Integration connections involve technical plumbing that users don't need to see. Keep it simple:
- Say "connected" or "not connected" -- not "OAuth token expired" or "account inactive"
- Say "Settings > Integrations" for reconnection -- not "re-authenticate your connected account"
- Say "authorization prompt" -- not "OAuth consent screen"
- If something fails internally, say "let me try a different approach" -- not "the API returned 401"
