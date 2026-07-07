/**
 * Load KEY=value pairs from local .env files when the seeder is run via
 * `pnpm seed:yc-demo` without manually exporting vars.
 *
 * Only single-line assignments are parsed (skips multiline PEM blocks, etc.).
 * Existing process.env values are never overwritten.
 */
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

function loadEnvFile(path: string): void {
  if (!existsSync(path)) return
  const raw = readFileSync(path, 'utf8')
  for (const line of raw.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq < 0) continue
    const key = trimmed.slice(0, eq).trim()
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue
    let val = trimmed.slice(eq + 1).trim()
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1)
    }
    if (!process.env[key]) process.env[key] = val
  }
}

export function loadLocalDotEnvFiles(): void {
  const cwd = process.cwd()
  loadEnvFile(resolve(cwd, 'apps/api/.env'))
  loadEnvFile(resolve(cwd, 'apps/agent-api/.env'))
}

export function applyEnvFallbacks(): void {
  if (!process.env.API_BASE_URL) {
    const port = process.env.PORT ?? '3001'
    process.env.API_BASE_URL =
      process.env.APPS_API_URL ?? process.env.API_URL ?? `http://localhost:${port}`
  }
}
