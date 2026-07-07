/**
 * Modal Sandbox Spike — v2 (separated steps for debugging)
 *
 * Run:
 *   MODAL_TOKEN_ID=... MODAL_TOKEN_SECRET=... npx tsx scripts/modal-spike.ts
 */

import { ModalClient, Probe } from 'modal'

const SANDBOX_NAME = 'spike-test-sandbox'
const APP_NAME = 'vibey-spaces-staging'
const PORT = 3000

const MINIMAL_PACKAGE_JSON = JSON.stringify(
  {
    name: 'spike-app',
    private: true,
    dependencies: {
      next: '15.3.2',
      react: '19.1.0',
      'react-dom': '19.1.0',
    },
  },
  null,
  2,
)

const MINIMAL_PAGE = `export default function Page() {
  return (
    <main style={{ padding: 48, fontFamily: 'system-ui' }}>
      <h1>Spike: Sandbox is running</h1>
      <p>Initial load</p>
    </main>
  )
}
`

const UPDATED_PAGE = `export default function Page() {
  return (
    <main style={{ padding: 48, fontFamily: 'system-ui', background: '#111', color: '#0f0' }}>
      <h1>HMR WORKS</h1>
      <p>File was written via sandbox.open + file.write</p>
    </main>
  )
}
`

async function writeFile(sb: any, path: string, content: string) {
  const f = await sb.open(path, 'w')
  await f.write(new TextEncoder().encode(content))
  await f.close()
}

async function readFile(sb: any, path: string): Promise<string> {
  const f = await sb.open(path, 'r')
  const bytes = await f.read()
  await f.close()
  return new TextDecoder().decode(bytes)
}

async function execAndLog(sb: any, cmd: string[], label: string): Promise<number> {
  console.log(`  [exec] ${label}: ${cmd.join(' ')}`)
  const proc = await sb.exec(cmd)
  const stdout = await proc.stdout.readText()
  const stderr = await proc.stderr.readText()
  const code = await proc.wait()
  if (stdout.trim()) console.log(`  [stdout] ${stdout.trim().slice(0, 500)}`)
  if (stderr.trim()) console.log(`  [stderr] ${stderr.trim().slice(0, 500)}`)
  console.log(`  [exit] ${code}\n`)
  return code
}

async function main() {
  console.log('=== Modal Sandbox Spike v2 ===\n')

  if (!process.env.MODAL_TOKEN_ID || !process.env.MODAL_TOKEN_SECRET) {
    console.error('Set MODAL_TOKEN_ID and MODAL_TOKEN_SECRET env vars first.')
    process.exit(1)
  }

  const modal = new ModalClient()

  // Step 1: App
  console.log(`[1/7] Looking up Modal App "${APP_NAME}"...`)
  const app = await modal.apps.fromName(APP_NAME, { createIfMissing: true })
  console.log(`  App: ${app.appId}\n`)

  // Step 2: Image
  console.log('[2/7] Defining image...')
  const image = modal.images
    .fromRegistry('node:22-slim')
    .dockerfileCommands([
      'RUN npm install -g pnpm@9',
      'RUN apt-get update && apt-get install -y netcat-openbsd procps && rm -rf /var/lib/apt/lists/*',
    ])
  console.log('  Done.\n')

  // Step 3: Create sandbox (no readiness probe — we'll poll manually)
  console.log(`[3/7] Creating sandbox "${SANDBOX_NAME}"...`)
  try {
    const existing = await modal.sandboxes.fromName(APP_NAME, SANDBOX_NAME)
    console.log('  Terminating existing...')
    await existing.terminate()
  } catch {}

  const sb = await modal.sandboxes.create(app, image, {
    name: SANDBOX_NAME,
    encryptedPorts: [PORT],
    timeoutMs: 10 * 60 * 1000,
    cpu: 1,
    memoryMiB: 1024,
    workdir: '/project',
  })
  console.log(`  Sandbox: ${sb.sandboxId}\n`)

  // Step 4: Write files
  console.log('[4/7] Writing project files...')
  await execAndLog(sb, ['mkdir', '-p', '/project/app'], 'mkdir')
  await writeFile(sb, '/project/package.json', MINIMAL_PACKAGE_JSON)
  console.log('  Wrote package.json')
  await writeFile(sb, '/project/app/page.tsx', MINIMAL_PAGE)
  console.log('  Wrote app/page.tsx\n')

  // Step 4b: Install deps
  console.log('  Installing dependencies (this takes ~60-90s on cold start)...')
  const installStart = Date.now()
  await execAndLog(sb, ['bash', '-c', 'cd /project && pnpm install 2>&1'], 'pnpm install')
  console.log(`  Install took ${Date.now() - installStart}ms\n`)

  // Step 4c: Start next dev in background
  console.log('  Starting next dev in background...')
  const _devProc = await sb.exec([
    'bash',
    '-c',
    `cd /project && npx next dev --hostname 0.0.0.0 -p ${PORT} 2>&1 &`,
  ])

  // Step 4d: Poll for port
  console.log('  Polling for port readiness...')
  const pollStart = Date.now()
  let ready = false
  for (let i = 0; i < 60; i++) {
    await new Promise((r) => setTimeout(r, 2000))
    const checkProc = await sb.exec([
      'bash',
      '-c',
      `nc -z 127.0.0.1 ${PORT} && echo READY || echo WAITING`,
    ])
    const out = await checkProc.stdout.readText()
    if (out.trim() === 'READY') {
      ready = true
      console.log(`  Port ${PORT} is ready! (${Date.now() - pollStart}ms)`)
      break
    }
    if (i % 5 === 0) console.log(`  Still waiting... (${Date.now() - pollStart}ms)`)
  }

  if (!ready) {
    console.error("  Port never became ready. Checking what's running...")
    await execAndLog(sb, ['ps', 'aux'], 'ps')
    await execAndLog(sb, ['bash', '-c', 'ls -la /project/'], 'ls project')
    await sb.terminate()
    process.exit(1)
  }

  // Step 5: Get tunnel URL
  console.log('\n[5/7] Getting tunnel URL...')
  const tunnels = await sb.tunnels()
  const tunnel = tunnels[PORT]
  if (!tunnel?.url) {
    console.error('  No tunnel URL! Tunnels:', JSON.stringify(tunnels))
    await sb.terminate()
    process.exit(1)
  }
  console.log(`\n  *** PREVIEW URL: ${tunnel.url} ***`)
  console.log('  Open this in your browser.\n')

  // Step 6: Test HMR
  console.log('[6/7] Testing HMR — writing updated page in 5s...')
  await new Promise((r) => setTimeout(r, 5000))
  await writeFile(sb, '/project/app/page.tsx', UPDATED_PAGE)
  console.log('  File written. Check browser for HMR update.\n')
  console.log('  Waiting 15s for verification...\n')
  await new Promise((r) => setTimeout(r, 15000))

  // Step 7: Snapshot
  console.log('[7/7] Testing snapshot...')
  console.log('  Snapshotting /project...')
  const snapshot = await sb.snapshotDirectory('/project')
  console.log('  Snapshot saved.')
  console.log('  Terminating...')
  await sb.terminate()
  console.log('  Done.\n')

  // Restore from snapshot
  const restoreName = SANDBOX_NAME + '-restore'
  try {
    const ex = await modal.sandboxes.fromName(APP_NAME, restoreName)
    await ex.terminate()
  } catch {}

  console.log('  Creating new sandbox from snapshot...')
  const restoreStart = Date.now()
  const sb2 = await modal.sandboxes.create(app, image, {
    name: restoreName,
    encryptedPorts: [PORT],
    timeoutMs: 5 * 60 * 1000,
    cpu: 1,
    memoryMiB: 1024,
    workdir: '/project',
  })

  await sb2.mountImage('/project', snapshot)

  const pageContent = await readFile(sb2, '/project/app/page.tsx')
  const hasHMR = pageContent.includes('HMR WORKS')
  console.log(`  Snapshot content verified: "HMR WORKS" found = ${hasHMR}`)

  // Start next dev from snapshot (no install!)
  const _restoreDevProc = await sb2.exec([
    'bash',
    '-c',
    `cd /project && npx next dev --hostname 0.0.0.0 -p ${PORT} 2>&1 &`,
  ])

  let restored = false
  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 2000))
    const checkProc = await sb2.exec([
      'bash',
      '-c',
      `nc -z 127.0.0.1 ${PORT} && echo READY || echo WAITING`,
    ])
    const out = await checkProc.stdout.readText()
    if (out.trim() === 'READY') {
      restored = true
      break
    }
  }
  const restoreTime = Date.now() - restoreStart
  console.log(`  Restore + ready in ${restoreTime}ms`)

  const tunnels2 = await sb2.tunnels()
  const tunnel2 = tunnels2[PORT]
  console.log(`  Restored URL: ${tunnel2?.url}\n`)

  await sb2.terminate()

  console.log('=== SPIKE RESULTS ===')
  console.log(`  Tunnel URL:        ${tunnel.url}`)
  console.log(`  HMR:               manual verification`)
  console.log(`  Snapshot verified:  ${hasHMR}`)
  console.log(`  Restore time:      ${restoreTime}ms`)
  console.log(`  Restored URL:      ${tunnel2?.url}`)
}

main().catch((err) => {
  console.error('Spike failed:', err)
  process.exit(1)
})
