# ROAS post-release cleanup audit — August 12, 2026

Baseline: production `main` at `259b9da06e2d7008dcebbb876c32111ca1e244f7` after PR #136.

Generated `dist` output, `tsbuildinfo`, changelog duplication, and implementations already shipped by #136 were excluded from the comparison.

## Remaining pull requests

| PR | Classification | Semantic result |
| --- | --- | --- |
| #123 | SUPERSEDED/CLOSE | 184 of 200 meaningful files are byte-identical to main. The remaining production files contain newer canonical meeting, shell, sidebar, and draft-card integration. The only absent file is a stale root Claude import shim, not user-facing behavior. |
| #126 | SUPERSEDED/CLOSE | 187 of 210 meaningful files are byte-identical to main; all differences are newer #136 reconciliation. No missing user-facing behavior remains. |
| #129 | SUPERSEDED/CLOSE | 51 of 63 meaningful files are byte-identical to main. The remaining action/policy/documentation surfaces were extended by #136. Canvas migrations and behavior are already shipped. |
| #130 | SUPERSEDED/CLOSE | 62 of 73 meaningful files are byte-identical to main. Current agenda, shell, sidebar, and draft-card implementations supersede the snapshot. |
| #98 | GENUINE WIP | A client-operations-desk plan and eight reference screenshots remain absent from main. This is planning/reference material, not production-ready behavior or tested implementation. |
| #78 | GENUINE WIP | Cursor Cloud setup notes remain unshipped, but their pinned test counts and environment assumptions require refresh before documentation can merge. No user-facing production behavior is present. |

## Selective remote branches

| Branch | Classification | Semantic result |
| --- | --- | --- |
| `claude/intelligent-jemison-05c0f3` at `ac354ce6` | PORT MISSING DELTAS | Completed shared work-item list/mapping behavior and shared Space field-cell ownership were absent from main. Ported selectively while preserving #136 meeting behavior. |
| `claude/session-wip-stash-integrations` at `0e34341b` | SUPERSEDED | Six of seven meaningful files are already identical. Main's Agenda card is newer and includes instant-meeting state/host behavior. |
| `fix/agenda-restore-row-test` at `d78a3486` | SUPERSEDED | Main already contains the restore-row regression test plus a stricter missing-row assertion. |
| `claude/session-wip-rescue` at `14206c2` | DO NOT MERGE | Mixed rescue snapshot with generated output and unrelated changes. |
| `claude/session-wip-stash-api` at `1961cd4` | DO NOT MERGE | Mixed recovery snapshot with generated output and unrelated changes. |

## Validation notes

- Baseline Home meeting/task tests passed before the port: 3/3.
- Port-focused tests passed after reconciliation: 12/12.
- Direct full Web TypeScript check passed.
- Changed-file ESLint passed. Full Web lint remains red on 338 pre-existing repository violations outside this port.
- The architecture checker is blocked before analysis by the tracked dangling OpenClaw test symlink `apps/openclaw/src/canvas-host/a2ui/test-link-1782116645255-348bba5dc9fbd.txt`.
- No product build was run.

## Production configuration gate

`roas-api` still lacks approved `OPENROUTER_BACKGROUND_API_KEY` and `OPENROUTER_MEDIA_API_KEY` values. The legacy general key was not duplicated into scoped roles because the repository requires separate routing/billing credentials. API redeploy and the required all-green smoke run remain gated on those approved values.
