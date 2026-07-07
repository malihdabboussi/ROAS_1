# Vibey Mini (Chrome extension)

Manifest V3 **side panel** workspace: **Chat** with your agents (SSE via `agent-api`), **Brain** capture (link / selection / Readability article), **Missions** glance, and **Sessions** (signed-in cookie sharing for approved social platforms). Popup only opens the side panel.

## Prereqs

- Log into the **same Vibey web app** (same Chrome profile) so the Supabase session cookie exists on `VITE_VIBEY_APP_ORIGIN`.
- Optional: set **Org ID** in the side panel if you use org-scoped workspaces (`x-org-id`).
- Set **`VITE_VIBEY_WEB_ORIGIN`** (default `VITE_VIBEY_APP_ORIGIN`) for streaming chat through the web proxy.
- **`VITE_VIBEY_AGENT_API_ORIGIN`** is deprecated; chat no longer calls agent-api directly.

## Dev

```bash
cp .env.example .env
# edit .env — same NEXT_PUBLIC_SUPABASE_* + API URL as apps/web

pnpm --filter @vibey/chrome-extension build
# or watch:
pnpm --filter @vibey/chrome-extension dev
```

Load unpacked: `chrome://extensions` → Developer mode → **Load unpacked** → choose `apps/chrome-extension/dist`.

## Prod / store zip

```bash
pnpm --filter @vibey/chrome-extension build
cd apps/chrome-extension/dist && zip -r ../vibey-mini.zip .
```

Narrow `host_permissions` in `public/manifest.json` to your real app/API hosts before publishing.

## Shortcut

- `Ctrl+Shift+B` / `Cmd+Shift+B`: reserved for future use (opens action; popup is default).
- `Ctrl+Shift+V` / `Cmd+Shift+V`: open side panel.

## API

- **Main API** (`VITE_VIBEY_API_ORIGIN`): `GET /api/brain/brains`, `POST /api/brain/import-jobs/*`, `GET /api/brain/search`, `GET /api/brain/import-jobs/active`, `GET/POST /api/conversations`, `GET /api/conversations/:id/messages`, `GET /api/missions`.
- **Chat proxy** (`VITE_VIBEY_WEB_ORIGIN`): `POST /api/proxy/chat` (SSE) via service-worker stream port.
