# Backend Separation — Deployment Guide

## Architecture Overview

```
Frontend (Vercel)
    ├── /api/proxy/chat/*       → Agent Backend (VM:3003)
    ├── /api/proxy/transcribe/* → Agent Backend (VM:3003)
    └── /api/proxy/*            → Platform Backend (Vercel serverless)
                                      ↕
                                   Supabase DB
                                      ↕
                              Agent Backend (VM:3003) → OpenClaw Gateway (VM:18789)
```

---

## Current Tunnel Config (BEFORE split)

Location on VM: `/root/.cloudflared/config.yml`

```yaml
tunnel: 8c95a516
credentials-file: /root/.cloudflared/8c95a516.json

ingress:
  - hostname: gateway.govibey.com
    service: http://localhost:18789
  - hostname: api.govibey.com
    service: http://localhost:3001
  - hostname: staging-api.govibey.com
    service: http://localhost:3001
  - service: http_status:404
```

---

## New Tunnel Config (AFTER split)

```yaml
tunnel: 8c95a516
credentials-file: /root/.cloudflared/8c95a516.json

ingress:
  - hostname: gateway.govibey.com
    service: http://localhost:18789
  - hostname: agent-api.govibey.com
    service: http://localhost:3003
  - service: http_status:404
```

**Changes:**

- REMOVED: `api.govibey.com → localhost:3001` (Platform Backend moves to Vercel)
- REMOVED: `staging-api.govibey.com → localhost:3001`
- ADDED: `agent-api.govibey.com → localhost:3003` (Agent Backend on VM)
- KEPT: `gateway.govibey.com → localhost:18789` (OpenClaw Gateway unchanged)

---

## DNS Records (Cloudflare)

| Hostname                | Type  | Value                       | Proxy | Notes                          |
| ----------------------- | ----- | --------------------------- | ----- | ------------------------------ |
| `agent-api.govibey.com` | CNAME | `8c95a516.cfargotunnel.com` | Yes   | New — Agent Backend            |
| `gateway.govibey.com`   | CNAME | `8c95a516.cfargotunnel.com` | Yes   | Existing — unchanged           |
| `api.govibey.com`       | CNAME | `cname.vercel-dns.com`      | Yes   | Changed — now points to Vercel |

---

## PM2 Processes on VM (AFTER split)

| Process           | Port  | Script                        | Notes         |
| ----------------- | ----- | ----------------------------- | ------------- |
| `vibey-agent-api` | 3003  | `apps/agent-api/dist/main.js` | Agent Backend |
| OpenClaw gateway  | 18789 | (managed by openclaw)         | Unchanged     |

**Old process `vibey-api` on port 3001 should be stopped after validation.**

---

## Environment Variables

### Agent Backend (`apps/agent-api/.env`)

```env
PORT=3003
CORS_ORIGIN=https://app.govibey.com

# Supabase
SUPABASE_URL=<production-supabase-url>
SUPABASE_ANON_KEY=<production-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<production-service-role-key>

# OpenClaw
OPENCLAW_GATEWAY_URL=http://localhost:18789
OPENCLAW_GATEWAY_TOKEN=<gateway-token>
OPENCLAW_AGENT_ID=main
OPENCLAW_SESSIONS_DIR=/root/.openclaw/agents/vibey/sessions

# Brain (NeuralSnap)
NEURALSNAP_SUPABASE_URL=<neuralsnap-url>
NEURALSNAP_SUPABASE_SERVICE_KEY=<neuralsnap-service-key>
BRAIN_AGENT_TOKEN=<brain-agent-token>
BRAIN_AGENT_USER_ID=<brain-owner-user-id>
```

### Frontend (`apps/web/.env`)

```env
BACKEND_URL=https://api.govibey.com           # Platform Backend (Vercel)
AGENT_BACKEND_URL=https://agent-api.govibey.com # Agent Backend (VM)
```

---

## Deployment Steps

### 1. Deploy Agent Backend on VM

```bash
# SSH into VM
ssh root@188.245.41.230

# Pull latest code
cd /root/vibey2.0
git pull origin feat/backend-separation

# Install dependencies
pnpm install

# Build agent-api
cd apps/agent-api
pnpm build

# Create .env from .env.example
cp .env.example .env
# Fill in production values

# Start with PM2
pm2 start ecosystem.config.js
pm2 save

# Verify
curl http://localhost:3003/api
# Should return: { status: "ok", service: "vibey-agent-api" }
```

### 2. Update Cloudflare Tunnel

```bash
# Edit tunnel config
nano /root/.cloudflared/config.yml
# Apply new config (see above)

# Restart tunnel
cloudflared tunnel run 8c95a516
```

### 3. Add DNS Record

In Cloudflare dashboard → DNS → Add CNAME:

- Name: `agent-api`
- Target: `8c95a516.cfargotunnel.com`
- Proxy: Yes

### 4. Update Frontend Environment

In Vercel dashboard → Settings → Environment Variables:

- `BACKEND_URL` = `https://api.govibey.com` (unchanged — now Vercel-to-Vercel)
- `AGENT_BACKEND_URL` = `https://agent-api.govibey.com` (NEW)

### 5. Deploy Frontend

Push changes to trigger Vercel deployment.

### 6. Verify End-to-End

```bash
# Platform Backend (Vercel)
curl https://api.govibey.com/api
# → { status: "ok", service: "vibey-api" }

# Agent Backend (VM)
curl https://agent-api.govibey.com/api
# → { status: "ok", service: "vibey-agent-api" }
```

---

## Rollback Procedure

If issues arise after split:

1. **Restore old monolith on VM:**

   ```bash
   pm2 stop vibey-agent-api
   pm2 start vibey-api  # old monolith process
   ```

2. **Revert tunnel config:**

   ```bash
   # Restore api.govibey.com → localhost:3001
   nano /root/.cloudflared/config.yml
   cloudflared tunnel run 8c95a516
   ```

3. **Revert frontend env:**
   - Remove `AGENT_BACKEND_URL` from Vercel
   - Redeploy frontend

4. **Revert code:**
   ```bash
   git revert <commit-hash>
   ```

---

## Blue-Green Cutover (Zero Downtime)

1. Start agent-api on VM alongside old monolith (different port)
2. Verify agent-api responds correctly
3. Update frontend env to use agent-api for agent paths
4. Deploy frontend
5. Monitor for 24 hours
6. Stop old monolith PM2 process
7. Update tunnel config (remove old api.govibey.com → 3001)
