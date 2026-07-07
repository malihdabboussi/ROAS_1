# End-to-End Trace: "fetch failed" in Mission Activity

## UI → Data Flow

1. **Activity display** (`TaskDetailModal.tsx`): `LogPayloadDetails` renders `payload.error` from each mission log entry
2. **Logs source**: `fetchMissionLogs(missionId)` → `GET /api/missions/:id/logs` → API reads `missions_logs` table
3. **missions_logs.payload.error** is written by **mission-worker** in `handlePhaseError` → `insertLog(..., { error: errorMessage })`

So "fetch failed" in the UI = `missions_logs.payload.error` = error message caught by mission-worker and passed to `handlePhaseError`.

---

## All Fetches on Mission Launch Path

### 1. Web (user creates mission)

- `createMission()` → `backendPost('/api/missions')` → `fetch(/api/proxy/missions)`
- Proxy → `fetch(BACKEND_URL/api/missions)` (localhost:3001)
- **If this fails**: createMission throws; user sees error. Does NOT write to missions_logs.

### 2. API (mission create)

- Receives POST, creates mission, inserts `mission.created` log, enqueues outbox
- Uses Supabase (REST) for DB — can throw "fetch failed" if Supabase unreachable
- **If this fails**: API returns 500; mission not created. No mission.failed log.

### 3. Mission-worker (processes job from queue)

| Step                                  | Fetch                           | Can throw "fetch failed"? |
| ------------------------------------- | ------------------------------- | ------------------------- |
| getMission                            | Supabase REST (resilient fetch) | Yes                       |
| resolveManagerKey                     | Supabase REST                   | Yes                       |
| updateMissionState                    | Supabase REST                   | Yes                       |
| updateAgentStatus                     | Supabase REST                   | Yes                       |
| insertLog                             | Supabase REST                   | Yes                       |
| resolveAgentApiTargetForUser          | Supabase REST (profiles)        | Yes                       |
| **callOpenClawRaw**                   | **fetch(localhost:3003)**       | **Yes (ECONNREFUSED)**    |
| plan callback                         | **fetch(localhost:3001)**       | **Yes (ECONNREFUSED)**    |
| handlePhaseError → updateMissionState | Supabase REST                   | Yes                       |
| handlePhaseError → insertLog          | Supabase REST                   | Yes                       |

### 4. Agent-api (when mission-worker calls it)

- `proxyOpenClawChatCompletions` → `fetch(gatewayUrl/v1/chat/completions)` (localhost:18789)
- **If this fails**: agent-api returns 502; mission-worker sees HTTP 502, not "fetch failed"

### 5. Web (polls for logs)

- `fetchMissionLogs()` → `GET /api/missions/:id/logs`
- **If this fails**: logs don't load; user might see "Failed to fetch" elsewhere, NOT in activity payload

---

## Root Cause Candidates

1. **Mission-worker fetch to localhost:3003** (agent-api down) → ECONNREFUSED → "fetch failed"
2. **Mission-worker fetch to localhost:3001** (API down) → ECONNREFUSED → "fetch failed"
3. **Mission-worker Supabase REST** → network/DNS/TLS → "fetch failed"
4. **Docker/remote mission-worker**: `localhost` in worker points to container, not host → ECONNREFUSED

---

## Instrumentation Added

- **BULL_PROCESSOR_CATCH**: Sync write when any job fails (captures error before any async)
- **PLAN_CATCH**, **HANDLE_ERR**: Plan phase and handlePhaseError
- **OPENCLAW_FETCH_ERR**: callOpenClawRaw fetch threw
- **PLAN_CALLBACK**: Plan callback fetch threw
- **SUPABASE_FETCH**: Supabase resilient fetch threw

All use `appendFileSync` to `.cursor/debug-64f0ad.log` so capture works even when network is broken.
