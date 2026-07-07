/**
 * Build a Modal directory snapshot for Spaces project cold start.
 *
 * Prerequisites: MODAL_TOKEN_ID, MODAL_TOKEN_SECRET (same as API).
 * Optional: MODAL_APP_NAME (default vibey-spaces-staging).
 *
 * Run from repo root:
 *   MODAL_TOKEN_ID=... MODAL_TOKEN_SECRET=... npx tsx scripts/modal-build-project-template.ts
 *
 * Output: prints the image id to set as MODAL_SPACES_PROJECT_TEMPLATE_IMAGE_ID in API env.
 * Re-run when apps/api starter (next-spaces-starter + pnpm-lock) changes; bump STARTER_VERSION in code.
 */

import { ModalClient } from 'modal'
import {
  getNextSpacesStarterFiles,
  STARTER_VERSION,
} from '../apps/api/src/modules/projects/starter/next-spaces-starter'

const APP_NAME = process.env.MODAL_APP_NAME || 'vibey-spaces-staging'
const SANDBOX_NAME = `spaces-project-template-${STARTER_VERSION}`.slice(0, 63)

async function writeFile(
  sb: {
    open: (
      p: string,
      m: string,
    ) => Promise<{ write: (b: Uint8Array) => Promise<void>; close: () => Promise<void> }>
  },
  filePath: string,
  content: string,
) {
  const f = await sb.open(filePath, 'w')
  await f.write(new TextEncoder().encode(content))
  await f.close()
}

async function execAndLog(
  sb: {
    exec: (
      cmd: string[],
    ) => Promise<{
      stdout: { readText: () => Promise<string> }
      stderr: { readText: () => Promise<string> }
      wait: () => Promise<number>
    }>
  },
  cmd: string[],
  label: string,
): Promise<number> {
  console.log(`  [exec] ${label}: ${cmd.join(' ')}`)
  const proc = await sb.exec(cmd)
  const stdout = await proc.stdout.readText()
  const stderr = await proc.stderr.readText()
  const code = await proc.wait()
  if (stdout.trim()) console.log(`  [stdout] ${stdout.trim().slice(0, 800)}`)
  if (stderr.trim()) console.log(`  [stderr] ${stderr.trim().slice(0, 800)}`)
  console.log(`  [exit] ${code}\n`)
  return code
}

async function main() {
  if (!process.env.MODAL_TOKEN_ID || !process.env.MODAL_TOKEN_SECRET) {
    console.error('Set MODAL_TOKEN_ID and MODAL_TOKEN_SECRET.')
    process.exit(1)
  }

  console.log(`=== Modal Spaces project template (${STARTER_VERSION}) ===\n`)

  const modal = new ModalClient()
  const app = await modal.apps.fromName(APP_NAME, { createIfMissing: true })
  console.log(`App: ${app.appId}`)

  const image = modal.images
    .fromRegistry('node:22-slim')
    .dockerfileCommands([
      'RUN npm install -g pnpm@9',
      'RUN apt-get update && apt-get install -y netcat-openbsd procps && rm -rf /var/lib/apt/lists/*',
    ])

  try {
    const existing = await modal.sandboxes.fromName(APP_NAME, SANDBOX_NAME)
    console.log('Terminating existing template sandbox...')
    await existing.terminate()
  } catch {
    /* none */
  }

  const sb = await modal.sandboxes.create(app, image, {
    name: SANDBOX_NAME,
    encryptedPorts: [3000],
    timeoutMs: 30 * 60 * 1000,
    cpu: 2,
    memoryMiB: 2048,
    workdir: '/project',
  })
  console.log(`Sandbox: ${sb.sandboxId}`)

  const files = getNextSpacesStarterFiles()
  for (const file of files) {
    const rel = file.path.replace(/^\/+/, '')
    const dir = rel.includes('/') ? rel.slice(0, rel.lastIndexOf('/')) : null
    if (dir) {
      await execAndLog(sb, ['mkdir', '-p', `/project/${dir}`], `mkdir ${dir}`)
    }
    await writeFile(sb, `/project/${rel}`, file.content)
    console.log(`  wrote /project/${rel}`)
  }

  console.log('\nRunning pnpm install...')
  const installStart = Date.now()
  await execAndLog(
    sb,
    ['bash', '-lc', 'cd /project && pnpm install --frozen-lockfile 2>&1'],
    'pnpm install',
  )
  console.log(`Install finished in ${Date.now() - installStart}ms\n`)

  console.log('Snapshotting /project...')
  const snapshot = await sb.snapshotDirectory('/project')
  const imageId =
    typeof snapshot === 'object' && snapshot !== null && 'imageId' in snapshot
      ? String((snapshot as { imageId: string }).imageId)
      : typeof snapshot === 'object' && snapshot !== null && 'id' in snapshot
        ? String((snapshot as { id: string }).id)
        : String(snapshot)

  await sb.terminate()

  console.log('\n=== Done ===')
  console.log(`Set in API environment:\n  MODAL_SPACES_PROJECT_TEMPLATE_IMAGE_ID=${imageId}\n`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
