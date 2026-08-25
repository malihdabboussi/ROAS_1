import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { spawnSync } from 'node:child_process'

const pageGraderRepo = resolve(
  process.env.PAGE_GRADER_REPO_PATH ?? '../page-grader',
)
const runner = resolve(
  pageGraderRepo,
  'scripts/e2e/roas-clickup-task-lifecycle.mjs',
)

assert.ok(
  existsSync(runner),
  `Page Grader cross-app runner was not found at ${runner}. Set PAGE_GRADER_REPO_PATH to a Page Grader checkout.`,
)

const result = spawnSync(process.execPath, [runner], {
  cwd: pageGraderRepo,
  env: process.env,
  stdio: 'inherit',
})

if (result.error) throw result.error
process.exitCode = result.status ?? 1
