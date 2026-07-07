/**
 * Phase logger for the YC demo seeder.
 *
 * Prints phase headers, row counts per table, and timings. TTY-aware color
 * for local runs; plain text when piped.
 */

const RESET = '\x1b[0m'
const BOLD = '\x1b[1m'
const DIM = '\x1b[2m'
const CYAN = '\x1b[36m'
const GREEN = '\x1b[32m'
const YELLOW = '\x1b[33m'
const RED = '\x1b[31m'

const useColor = process.stdout.isTTY

function paint(code: string, text: string): string {
  if (!useColor) return text
  return `${code}${text}${RESET}`
}

export interface Logger {
  phase(name: string, description: string): void
  step(message: string): void
  rowCount(table: string, count: number): void
  warn(message: string): void
  error(message: string, err?: unknown): void
  done(name: string, durationMs: number): void
  raw(message: string): void
}

export function createLogger(): Logger {
  return {
    phase(name, description) {
      const bar = '━'.repeat(64)
      console.log('')
      console.log(paint(CYAN, bar))
      console.log(paint(`${BOLD}${CYAN}`, `▶ ${name}`))
      console.log(paint(DIM, `  ${description}`))
      console.log(paint(CYAN, bar))
    },
    step(message) {
      console.log(`  ${paint(DIM, '·')} ${message}`)
    },
    rowCount(table, count) {
      const pad = table.padEnd(40, ' ')
      console.log(`  ${paint(GREEN, '✓')} ${paint(DIM, pad)} ${paint(BOLD, String(count))}`)
    },
    warn(message) {
      console.log(`  ${paint(YELLOW, '⚠')} ${message}`)
    },
    error(message, err) {
      console.error(`  ${paint(RED, '✗')} ${message}`)
      if (err !== undefined) console.error(err)
    },
    done(name, durationMs) {
      const seconds = (durationMs / 1000).toFixed(1)
      console.log(paint(GREEN, `  ✓ ${name} (${seconds}s)`))
    },
    raw(message) {
      console.log(message)
    },
  }
}
