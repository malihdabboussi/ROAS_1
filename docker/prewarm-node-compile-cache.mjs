import fs from 'node:fs'
import module, { createRequire } from 'node:module'
import path from 'node:path'
import process from 'node:process'
import { pathToFileURL } from 'node:url'

function enableCompileCache() {
  if (!module.enableCompileCache || process.env.NODE_DISABLE_COMPILE_CACHE) {
    return
  }

  const cacheDir = process.env.NODE_COMPILE_CACHE?.trim()
  if (cacheDir) {
    module.enableCompileCache(cacheDir)
    return
  }

  module.enableCompileCache()
}

async function prewarmOpenClaw() {
  const distDir = '/app/dist'
  const entryPath = path.join(distDir, 'gateway-headless.js')
  const entrySource = fs.readFileSync(entryPath, 'utf8')
  const serverImport = [...entrySource.matchAll(/from\s+"(\.\/server-[^"]+\.js)"/g)].at(0)?.[1]

  if (!serverImport) {
    console.log('OpenClaw gateway server chunk not found; skipping compile-cache prewarm')
    return
  }

  await import(pathToFileURL(path.join(distDir, serverImport)).href)
}

function prewarmAgentApi() {
  const require = createRequire(import.meta.url)
  require('/app/agent-api/dist/apps/agent-api/src/app.module.js')
}

async function main() {
  enableCompileCache()

  const target = process.argv[2]
  if (target === 'openclaw') {
    await prewarmOpenClaw()
  } else if (target === 'agent-api') {
    prewarmAgentApi()
  } else {
    throw new Error(`Unknown prewarm target: ${target ?? '(missing)'}`)
  }

  module.flushCompileCache?.()
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
