# Architecture Behavior Lock

Last updated: 2026-06-08

## Purpose

The architecture behavior lock captures current backend route and HTTP behavior before architecture refactors. It makes route changes and response deltas fail in tests instead of relying on manual review.

## When To Use

Use this tooling before refactoring controllers, services, repositories, or large route-owning modules in `apps/api` or `apps/agent-api`.

Use route inventory tests for whole-app method/path drift. Use HTTP contract capture and parity diff for module-level request/response characterization before and after a refactor.

## API

```bash
pnpm architecture:self-test
pnpm architecture:contracts -- --base-url http://127.0.0.1:3001 --requests ./requests.json --out ./before.json
pnpm architecture:parity -- --before-url http://127.0.0.1:3001 --after-url http://127.0.0.1:3002 --requests ./requests.json
```

Request files use this shape:

```json
{
  "requests": [
    {
      "name": "billing status",
      "method": "GET",
      "path": "/api/billing/status"
    }
  ],
  "normalizers": {
    "ignoreJsonPaths": ["response.body.timestamp"]
  }
}
```

## Parameters

| Parameter      | Type     | Default | Notes                                       |
| -------------- | -------- | ------- | ------------------------------------------- |
| `--base-url`   | `string` | none    | Server URL used by `architecture:contracts` |
| `--before-url` | `string` | none    | Pre-refactor server URL for parity          |
| `--after-url`  | `string` | none    | Post-refactor server URL for parity         |
| `--requests`   | `string` | none    | JSON request set to replay                  |
| `--out`        | `string` | none    | Output file for captured contracts          |

## Edge Cases

- Non-deterministic response fields must be listed in `normalizers.ignoreJsonPaths`.
- Streaming endpoints should be represented by deterministic final/event-shape endpoints before parity comparison.
- Write endpoints need an isolated test data branch or reset command outside the live production database.

## Used By

- `apps/api/src/test/contract/route-inventory.test.ts`
- `apps/agent-api/src/test/contract/route-inventory.test.ts`
- `scripts/arch/route-inventory.mjs`
- `scripts/arch/http-contract-harness.mjs`
- `scripts/arch/parity-diff.mjs`

## Testing

Covered by:

- `scripts/arch/check-loc.test.mjs`
- `scripts/arch/parity-diff.test.mjs`
- `apps/api/src/test/contract/route-inventory.test.ts`
- `apps/agent-api/src/test/contract/route-inventory.test.ts`

## Change History

- 2026-06-08: Added Phase 0.5 route inventory snapshots, HTTP contract capture, parity diff runner, and architecture self-tests.
