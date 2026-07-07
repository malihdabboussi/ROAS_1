## Local <-> Prod Routing SOP

This SOP is for switching mission flow between local-only and production routing.

### Scope

- Project: `qfrvykscoymiwwgysvsr`
- Account used for profile routing: `sefy@olympus-digital.com`
- Local services:
  - Web: `http://localhost:3000`
  - API: `http://localhost:3001`
  - Agent API: `http://localhost:3003`
  - Mission Worker: `http://localhost:3005`
  - OpenClaw Gateway: `http://localhost:18789`
  - Redis: `redis://127.0.0.1:6379`

---

## A) Switch to LOCAL mode (100% local routing)

1. Start local infra/services:
   - Docker Redis on `6379`
   - `pnpm dev:back`
   - `pnpm dev:agentapi`
   - `pnpm dev:agent`
   - `pnpm dev` in `apps/mission-worker`

2. Set local env values:
   - `apps/mission-worker/.env`
     - `REDIS_URL=redis://127.0.0.1:6379`
     - `REDIS_URL_MISSIONS=redis://127.0.0.1:6379`
     - `OPENCLAW_GATEWAY_URL=http://127.0.0.1:18789`
     - `MISSION_CALLBACK_URL=http://localhost:3001/api/internal/missions/callback`
   - `apps/api/.env`
     - `OPENCLAW_GATEWAY_URL=http://localhost:18789`
     - `AGENT_API_URL=http://localhost:3003`

3. Set Supabase profile routing to local (for `sefy@olympus-digital.com`):
   - `profiles.fly_machine_url = 'http://localhost:3003'`
   - `profiles.fly_machine_status = 'running'`
   - `profiles.fly_machine_id = null`

4. Restart local services after env updates.

5. Verify local-only routing:
   - Mission worker logs show mission picked.
   - OpenClaw local terminal shows activity.
   - No Fly-only URL in mission path.

---

## B) Switch to PROD mode (restore production routing)

1. Update env values:
   - `apps/api/.env`
     - `OPENCLAW_GATEWAY_URL=https://gateway.govibey.com`
     - optional if needed: `AGENT_API_URL=https://vibey-runtimes.fly.dev`
   - `apps/mission-worker/.env`
     - `REDIS_URL` and `REDIS_URL_MISSIONS` back to production Redis URL
     - `OPENCLAW_GATEWAY_URL=https://gateway.govibey.com`

2. Set Supabase profile routing back to production machine:
   - `profiles.fly_machine_url = 'https://vibey-runtimes.fly.dev'`
   - `profiles.fly_machine_status = 'running'`
   - `profiles.fly_machine_id = '6e823460c49558'` (or current live machine id)

3. Restart services that read these envs.

4. Verify production routing:
   - Mission calls resolve to Fly machine URL.
   - Production gateway handles OpenClaw path.

---

## Quick SQL snippets

### Local routing (already applied for `sefy@olympus-digital.com`)

```sql
update public.profiles
set
  fly_machine_url = 'http://localhost:3003',
  fly_machine_status = 'running',
  fly_machine_id = null
where id = '37212aea-db05-4178-a6d2-265111a81a78';
```

### Prod routing restore

```sql
update public.profiles
set
  fly_machine_url = 'https://vibey-runtimes.fly.dev',
  fly_machine_status = 'running',
  fly_machine_id = '6e823460c49558'
where id = '37212aea-db05-4178-a6d2-265111a81a78';
```
