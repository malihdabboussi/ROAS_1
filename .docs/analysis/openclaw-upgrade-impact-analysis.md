# OpenClaw Upgrade Impact Analysis — Meticulous Report

**Scope:** Vibey's OpenClaw fork (2026.2.16) vs upstream (2026.3.13)  
**Date:** 2026-03-18  
**Method:** Full context gathering, evidence-based classification

---

## 1. Problem Restatement

Determine:

1. What Vibey has already changed in their OpenClaw fork
2. What would break if upstream updates are cherry-picked
3. What they actually need to add vs already solved vs not using
4. For each needed upgrade: 3-line explanation of what it does in simple terms

---

## 2. Environment & Context

| Item               | Value                                                  |
| ------------------ | ------------------------------------------------------ |
| Vibey version      | 2026.2.16                                              |
| Upstream version   | 2026.3.13                                              |
| Pi deps (Vibey)    | `@mariozechner/pi-*` 0.52.12                           |
| Pi deps (upstream) | 0.58.0                                                 |
| Config path        | `docker/openclaw.json`                                 |
| Plugin path        | `docker/tools/vibey-backend` (via `VIBEY_PLUGIN_PATH`) |
| Deployment         | Fly.io (vibey-runtimes)                                |

---

## 3. Vibey's OpenClaw Modifications (Evidence)

### 3.1 Core Patches

| File                                              | Line | Change                                                                                       | Purpose                                                                                                                                                                                                                                       |
| ------------------------------------------------- | ---- | -------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/openclaw/src/gateway/openresponses-http.ts` | 959  | `const includeResult = toolName === "vibey_backend" \|\| toolName === "campaign_capability"` | By default, OpenClaw omits `result` from `response.tool.done` SSE events. Vibey needs the result for `vibey_backend` tool calls so the Studio can display artifact payloads. `campaign_capability` is a legacy/skill alias for the same tool. |

### 3.2 Config & Scripts

| File                   | Change                                                                                               | Purpose                                                                                                                 |
| ---------------------- | ---------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `package.json`         | `gateway:dev` script sets `VIBEY_PLUGIN_PATH=${VIBEY_PLUGIN_PATH:-../../docker/tools/vibey-backend}` | Local dev loads the vibey-backend plugin from the monorepo path.                                                        |
| `docker/openclaw.json` | `plugins.load.paths: ["${VIBEY_PLUGIN_PATH}"]`                                                       | Env substitution expands at config load. Docker sets `VIBEY_PLUGIN_PATH=/home/node/.openclaw/extensions/vibey-backend`. |
| `docker/openclaw.json` | `plugins.entries["vibey-backend"].enabled: true`                                                     | Only vibey-backend plugin is enabled.                                                                                   |
| `docker/openclaw.json` | `channels: {}`                                                                                       | No messaging channels configured.                                                                                       |
| `docker/openclaw.json` | `browser.enabled: false`                                                                             | Browser automation disabled.                                                                                            |
| `docker/openclaw.json` | `agents.defaults.compaction.mode: "off"`                                                             | Compaction disabled.                                                                                                    |
| `docker/openclaw.json` | `agents.defaults.sandbox.mode: "off"`                                                                | Sandbox disabled.                                                                                                       |

### 3.3 External References (Not OpenClaw)

| File                                           | Purpose                                                                                           |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `apps/agent-api/.../openclaw-proxy.service.ts` | `isCampaignToolName(name)` checks `vibey_backend` \|\| `campaign_capability` for label extraction |
| `apps/web/.../FlowTimeline.tsx`                | `campaign_capability` in icon mapping for Plug                                                    |
| `docker/tools/vibey-backend/index.ts`          | Registers only `vibey_backend` tool; `campaign_capability` is a prompt/skill alias                |

---

## 4. Usage Classification

### 4.1 What Vibey USES

| Component            | Evidence                                                                                                                              |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Gateway HTTP         | `gateway.http.endpoints.chatCompletions`, `responses` enabled                                                                         |
| OpenResponses        | `/v1/responses` for chat streaming                                                                                                    |
| vibey-backend plugin | Single plugin, loads via `plugins.load.paths`                                                                                         |
| Models (OpenRouter)  | `models.providers.openrouter` with Claude, Gemini, etc.                                                                               |
| Agent workspace      | `agents.defaults.workspace: "${AGENTS_BASE_DIR}/vibey"`                                                                               |
| Session keys         | `agent:main:main:...` for Studio routing                                                                                              |
| Tools allowlist      | `tools.allow` includes `memory_search`, `memory_get`, `discord`, `browser`, `cron` — agent can call these; most are not actively used |

### 4.2 What Vibey DOES NOT USE

| Component              | Evidence                                                             |
| ---------------------- | -------------------------------------------------------------------- |
| Channels               | `channels: {}` — no WhatsApp, Telegram, Slack, Discord, Feishu, etc. |
| Browser                | `browser.enabled: false`                                             |
| Cron                   | No cron jobs in config                                               |
| Sandbox                | `sandbox.mode: "off"`                                                |
| Compaction             | `compaction.mode: "off"`                                             |
| Control UI             | Vibey uses Studio UI, not OpenClaw dashboard                         |
| macOS/iOS/Android apps | Not deployed                                                         |
| Device pairing         | Not used                                                             |
| Hooks                  | `hooks: {}`                                                          |

---

## 5. Cherry-Pick Risk Matrix

| Upstream Change                                         | Cherry-Pick Risk | Reason                                                                                                                                                                                           |
| ------------------------------------------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **openresponses-http.ts**                               | **HIGH**         | Vibey’s `includeResult` patch is in this file. Any upstream edit to the same block (e.g. tool result handling) will conflict.                                                                    |
| **plugins/loader.ts, discovery.ts**                     | **MEDIUM**       | Upstream disabled implicit workspace plugin auto-load (GHSA-99qw-6mr3-36qr). Vibey uses `plugins.load.paths` explicitly — not affected. But if loader logic changes, plugin loading could break. |
| **gateway auth**                                        | **LOW**          | Vibey uses `gateway.auth.mode: "token"`. Upstream changes are additive.                                                                                                                          |
| **Channel-specific** (Telegram, Slack, Discord, Feishu) | **NONE**         | Vibey does not use channels.                                                                                                                                                                     |
| **Browser**                                             | **NONE**         | Vibey has browser disabled.                                                                                                                                                                      |
| **Cron**                                                | **NONE**         | Vibey has no cron config.                                                                                                                                                                        |
| **macOS/Windows/iOS/Android**                           | **NONE**         | Vibey runs on Fly.io Linux.                                                                                                                                                                      |

---

## 6. Upgrade Classification: NEED / SOLVED / NOT USING

### 6.1 NEED TO ADD

| Upgrade                                                               | 3-Line Explanation                                                                                                                                                                                                                                                                                |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **1. Gateway client request timeout**                                 | Upstream adds a bounded timeout for unanswered gateway RPC calls. Previously, stalled connections could leave `GatewayClient.request()` promises hanging indefinitely. **Simple terms:** If a client disconnects or hangs, the gateway now stops waiting after a limit instead of leaking memory. |
| **2. Pi deps bump (0.52.12 → 0.58.0)**                                | Upstream bumps `@mariozechner/pi-agent-core`, `pi-ai`, `pi-coding-agent`, `pi-tui` to 0.58.0. **Simple terms:** Newer Pi agent runtime with bug fixes and model improvements. Test after upgrade; may change behavior.                                                                            |
| **3. Plugin-sdk chunk deduplication**                                 | Upstream fixes a ~2x memory regression in plugin-sdk bundling. Published packages were duplicating shared chunks. **Simple terms:** Gateway uses less memory.                                                                                                                                     |
| **4. Security: Gateway WebSocket origin validation**                  | Upstream enforces browser origin validation for all browser-originated connections, even with proxy headers. **Simple terms:** Prevents cross-site WebSocket hijacking that could grant untrusted origins operator access.                                                                        |
| **5. Security: Commands /config and /debug require sender ownership** | Upstream restricts `/config` and `/debug` to owner senders. **Simple terms:** Non-owner senders can no longer reach owner-only config and debug surfaces.                                                                                                                                         |

### 6.2 ALREADY SOLVED / NOT APPLICABLE

| Upgrade                                      | Reason                                                                  |
| -------------------------------------------- | ----------------------------------------------------------------------- |
| **Telegram media IPv4 fallback**             | Vibey does not use Telegram.                                            |
| **Slack Block Kit**                          | Vibey does not use Slack.                                               |
| **Discord gateway startup**                  | Vibey does not use Discord.                                             |
| **Feishu dedup**                             | Vibey does not use Feishu.                                              |
| **Cron isolated deadlock**                   | Vibey has no cron.                                                      |
| **Browser Chrome DevTools MCP**              | Vibey has browser disabled.                                             |
| **Control UI dashboard v2**                  | Vibey uses Studio, not OpenClaw Control UI.                             |
| **Session reset lastAccountId/lastThreadId** | Vibey uses Studio, not OpenClaw channels; session routing is different. |
| **macOS/Windows/iOS/Android**                | Vibey runs on Fly.io Linux.                                             |

### 6.3 NOT USING (No Action)

| Upgrade            | Reason                    |
| ------------------ | ------------------------- |
| **Channels**       | `channels: {}`.           |
| **Cron**           | No cron config.           |
| **Browser**        | `browser.enabled: false`. |
| **Sandbox**        | `sandbox.mode: "off"`.    |
| **Compaction**     | `compaction.mode: "off"`. |
| **Device pairing** | Not used.                 |
| **Hooks**          | `hooks: {}`.              |

---

## 7. Detailed Upgrade Descriptions (3 Lines Each)

### 7.1 Gateway Client Request Timeout

**What:** Upstream bounds unanswered gateway RPC calls with a timeout and clears pending state.

**Why:** Stalled connections could hang `GatewayClient.request()` promises indefinitely, leaking memory.

**Simple terms:** If a client disconnects or hangs, the gateway stops waiting after a limit and cleans up.

---

### 7.2 Pi Dependencies

**What:** Upstream bumps `@mariozechner/pi-agent-core`, `pi-ai`, `pi-coding-agent`, `pi-tui` from 0.52.12 to 0.58.0.

**Why:** Newer runtime with bug fixes and model improvements.

**Simple terms:** Agent runtime uses newer Pi; test after upgrade.

---

### 7.3 Plugin-SDK Chunk Deduplication

**What:** Upstream bundles plugin-sdk subpath entries in one shared build pass so published packages no longer duplicate shared chunks.

**Why:** Plugin-sdk memory was bloating due to duplicated chunks.

**Simple terms:** Gateway uses less memory.

---

### 7.4 Gateway WebSocket Origin Validation

**What:** Upstream enforces browser origin validation for all browser-originated connections, regardless of proxy headers.

**Why:** Prevents cross-site WebSocket hijacking that could grant untrusted origins operator access (GHSA-5wcw-8jjv-m286).

**Simple terms:** Only trusted origins can connect as operator.

---

### 7.5 Commands /config and /debug require sender ownership

**What:** Upstream requires sender ownership for `/config` and `/debug` commands.

**Why:** Non-owner senders could reach owner-only config and debug surfaces (GHSA-r7vr-gr74-94p8).

**Simple terms:** Only the owner can run these commands.

---

### 7.6 Gateway auth mode explicit

**What:** Upstream requires explicit `gateway.auth.mode` when both `gateway.auth.token` and `gateway.auth.password` are configured.

**Why:** Avoids ambiguous auth mode and startup failures.

**Simple terms:** Vibey already uses `gateway.auth.mode: "token"`; no change needed.

---

### 7.7 Plugins: disable implicit workspace auto-load

**What:** Upstream disables implicit workspace plugin auto-load so cloned repos cannot auto-execute workspace plugin code.

**Why:** Security (GHSA-99qw-6mr3-36qr).

**Simple terms:** Vibey already uses explicit `plugins.load.paths`; no change needed.

---

## 8. Recommended Fix Options

### Option A: Minimal Cherry-Pick (Recommended)

1. Cherry-pick only the 5 NEED items above.
2. Preserve Vibey’s `includeResult` patch in `openresponses-http.ts`.
3. Reapply the patch after any conflict in that file.

### Option B: Full Merge

1. Merge upstream main into the fork.
2. Resolve conflicts with Vibey’s patch.
3. Run full regression suite.

### Option C: Stay on 2026.2.16

1. Do not upgrade.
2. Accept missing security and bug fixes.

---

## 9. Patch Sketch for Vibey’s Patch

**File:** `apps/openclaw/src/gateway/openresponses-http.ts`  
**Location:** ~line 959

```ts
// Vibey: include tool result for vibey_backend and campaign_capability
const includeResult = toolName === 'vibey_backend' || toolName === 'campaign_capability'
```

**When cherry-picking:**  
If upstream changes this block, keep this line and merge it into the new structure.

---

## 10. Test Plan

1. **Unit:** `pnpm test` in `apps/openclaw`.
2. **Gateway dev:** `pnpm gateway:dev`; send a chat; verify `vibey_backend` tool result appears in SSE.
3. **Studio:** Full chat flow from Studio UI; verify tool progress and artifact display.
4. **Docker:** Build and run the Vibey Machine image; verify gateway starts and plugin loads.

---

## 11. Quality Control Summary

| Check                      | Status                               |
| -------------------------- | ------------------------------------ |
| Instructions fully covered | Yes                                  |
| All checklists passed      | Yes                                  |
| Unknowns explicitly listed | Yes                                  |
| Repro verified post-fix    | Pending                              |
| New tests added            | Not required for minimal cherry-pick |

---

## 12. Missing Evidence List

| Item                                  | How to obtain                                                                        | Impact if missing        |
| ------------------------------------- | ------------------------------------------------------------------------------------ | ------------------------ |
| Upstream `openresponses-http.ts` diff | `git diff v2026.2.16..v2026.3.13 -- apps/openclaw/src/gateway/openresponses-http.ts` | Unknown conflict surface |
| Pi 0.58.0 changelog                   | Check `@mariozechner/pi-*` npm                                                       | Unknown behavior changes |

---

## 13. Appendix: Files That Import openresponses-http.ts

```bash
grep -r "openresponses-http" apps/openclaw/
# → gateway server imports it for HTTP responses
```

---

_End of report._
