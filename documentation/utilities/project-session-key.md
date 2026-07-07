# Project Session Key Utility

Last updated: 2026-06-07

## Purpose

`project-session-key.ts` derives and verifies project-bound runtime session keys from the root `VIBEY_SESSION_KEY`.

Use it when a deployed project app needs to call Vibey runtime APIs with `x-vibey-session-key`. The deployed app still receives `VIBEY_SESSION_KEY`, but the value is derived for one `projectId` and cannot authorize another project.

## When To Use

Use this utility for project app runtime authentication:

- Publishing project apps to Vercel.
- Validating `/apps/:projectId/agent-call` requests in Agent API.
- Any future project-runtime API that accepts `x-vibey-session-key`.

Do not use it for user auth, org auth, MCP OAuth tokens, public agent tokens, or internal service-to-service bearer tokens.

## API

```ts
import { deriveProjectSessionKey, verifyProjectSessionKey } from '@vibey/api-shared'

const key = deriveProjectSessionKey(projectId, process.env.VIBEY_SESSION_KEY)
const valid = verifyProjectSessionKey(projectId, incomingHeader, process.env.VIBEY_SESSION_KEY)
```

- `deriveProjectSessionKey(projectId, rootSecret)`: returns `vps_...` HMAC key, or an empty string when inputs are missing.
- `verifyProjectSessionKey(projectId, sessionKey, rootSecret)`: timing-safe comparison against the derived key.

## Parameters

| Parameter    | Type                  | Default | Notes                                      |
| ------------ | --------------------- | ------- | ------------------------------------------ |
| `projectId`  | `string`              | none    | Must be the exact project being authorized |
| `sessionKey` | `string \| undefined` | none    | Incoming `x-vibey-session-key` value       |
| `rootSecret` | `string \| undefined` | none    | Root `VIBEY_SESSION_KEY` server secret     |

## Edge Cases

- Missing `projectId` or root secret returns an empty derived key.
- The root secret itself is not accepted as a valid project key.
- A key derived for one project fails verification for another project.

## Used By

- `apps/api/src/modules/projects/services/projects.service.ts`
- `apps/agent-api/src/modules/project-runtime/project-agent-call.service.ts`

## Testing

Covered by:

- `packages/api-shared/src/services/project-session-key.test.ts`
- `apps/api/src/modules/projects/services/projects.service.test.ts`
- `apps/agent-api/src/modules/project-runtime/project-agent-call.service.test.ts`
- `apps/agent-api/src/modules/project-runtime/project-agent-call.controller.test.ts`

## Change History

- 2026-06-07: Added to prevent one global project runtime key from authorizing calls across every project.
