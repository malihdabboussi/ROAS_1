#!/usr/bin/env node

/**
 * Sync integration capabilities from Composio + legacy into the DB.
 *
 * Usage:
 *   pnpm sync:capabilities                       — sync only NEW integrations (skips already-synced)
 *   pnpm sync:capabilities --only notion          — sync specific integration(s)
 *   pnpm sync:capabilities --only notion,slack    — sync multiple specific integrations
 *   pnpm sync:capabilities --force                — full re-sync of everything
 *
 * Requires: `nest build` to have been run first (uses compiled dist/).
 */

function parseArgs(argv) {
  const args = argv.slice(2)
  const options = { only: undefined, force: false }

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--force') {
      options.force = true
    } else if (args[i] === '--only' && args[i + 1]) {
      options.only = args[++i].split(',').map((s) => s.trim().toLowerCase())
    }
  }

  return options
}

async function main() {
  const options = parseArgs(process.argv)
  const { NestFactory } = require('@nestjs/core')
  const { AppModule } = require('../dist/app.module')

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['log', 'warn', 'error'],
  })

  const composioService = app.get(
    require('../dist/modules/composio/composio.service').ComposioService,
  )

  const mode = options.only
    ? `only: ${options.only.join(', ')}`
    : options.force
      ? 'force (full re-sync)'
      : 'incremental (new only)'
  console.log(`Starting capabilities sync [${mode}]...`)

  const start = Date.now()
  const result = await composioService.syncCapabilities(undefined, options)
  const elapsed = ((Date.now() - start) / 1000).toFixed(1)

  console.log(
    `Done in ${elapsed}s — composio: ${result.composio}, legacy: ${result.legacy}, skipped: ${result.skipped}`,
  )
  await app.close()
}

main().catch((err) => {
  console.error('Sync failed:', err)
  process.exit(1)
})
