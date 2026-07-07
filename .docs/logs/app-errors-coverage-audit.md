# app_errors coverage audit

Baseline: 2026-05-02. See changelog entry for this work.

## How errors reach `app_errors`

| Path | Mechanism |
|------|-----------|
| HTTP 5xx (unhandled) | `GlobalExceptionFilter` → `ErrorReporter.report` ([`packages/api-shared/src/filters/global-exception.filter.ts`](../../packages/api-shared/src/filters/global-exception.filter.ts)) |
| Explicit server | `errorReporter.report({ app, feature, ... })` |
| `LoggerService.logError` | **Now** also calls `ErrorReporter.report` ([`packages/api-shared/src/services/logger.service.ts`](../../packages/api-shared/src/services/logger.service.ts)) |
| Workers | `QueueLoggerService.logError` → worker `ErrorReporter` |
| Web UI (client) | `reportClientError()` → `POST /api/log/client-error` ([`apps/web/src/lib/log-client-error.ts`](../../apps/web/src/lib/log-client-error.ts)) → [`ClientErrorsController`](../../apps/api/src/modules/client-errors/client-errors.controller.ts) |

## Ripgrep inventory (canonical repo paths)

### `errorReporter.report(` / optional `this.errorReporter?.report(`

- `packages/api-shared/src/filters/global-exception.filter.ts`
- `apps/agent-api/src/modules/chat/services/openclaw-proxy.service.ts`
- `apps/agent-api/src/modules/artifacts/services/artifacts.service.ts`
- `apps/agent-api/src/modules/artifacts/legacy/artifacts-legacy.service.ts`
- `apps/api/src/modules/machines/services/machines.service.ts`
- `apps/api/src/modules/sandboxes/services/sandbox.service.ts`
- `apps/queue-worker/src/modules/logger/logger.service.ts`
- `apps/mission-worker/src/modules/logger/logger.service.ts`

### `from('app_errors').insert`

- `packages/api-shared/src/services/error-reporter.service.ts`
- `apps/queue-worker/src/modules/logger/error-reporter.ts`
- `apps/mission-worker/src/modules/logger/error-reporter.ts`

### `apps/api` `LoggerService` + `.logError(` (now persisted via shared `LoggerService`)

- `channels.service.ts`, `conversations.service.ts`, `org-invitation.service.ts`, `org.service.ts`, `team-roster.service.ts`, `mission-human-subtask.service.ts`, `team-roster-slack-learner.service.ts` (`errorLogger: LoggerService`)

## 30-day SQL (run in Supabase SQL editor)

```sql
SELECT app, feature, category, COUNT(*)::int AS cnt
FROM public.app_errors
WHERE created_at > now() - interval '30 days'
GROUP BY 1, 2, 3
ORDER BY cnt DESC
LIMIT 100;
```

Re-run after deploy to compare volume by `feature` / `category` (`web` + `ui` for client reports).

## Module coverage matrix (apps/api top-level)

| Module / area | Explicit `errorReporter` | `LoggerService.logError` | Global 5xx | Client `reportClientError` | Notes |
|---------------|-------------------------|----------------------------|------------|------------------------------|-------|
| brain / PDF OCR | Yes (`DocumentExtractionService`) | — | Yes | — | Marks `__appErrorReported` on rethrow to avoid duplicate |
| media / indexer | Yes (`MediaIndexerService`) | — | — | — | DB update + chunk failures reported |
| integrations / google-drive sync | Yes (`DriveSyncService`) | — | Partial | Yes (browser) | Root `getFile` silent catch now reported |
| billing / credits | Yes (`CreditsService` auto-recharge catch) | — | — | — | |
| channels, conversations, org, missions, team-roster | — | Yes | — | — | Now persisted via `LoggerService` |
| web dashboard | — | — | — | Yes | Drive modal, A4 preview, mission list, doc cover |

## Prioritized follow-ups (not done in this pass)

- Expand `reportClientError` to Dropbox browser, `backendUpload` failures, and other silent `catch` blocks as you touch those files.
- Optionally lower noise from `LoggerService.logError` with sampling (product decision).
