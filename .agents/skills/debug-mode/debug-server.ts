/**
 * Debug Log Server
 *
 * Receives debug logs from frontend/browser code and writes to debug.log
 *
 * Usage:
 *   npx ts-node .claude/skills/debug-mode/debug-server.ts
 *
 * Or with node directly:
 *   npx tsx .claude/skills/debug-mode/debug-server.ts
 */

import fs from 'fs'
import http from 'http'
import path from 'path'

const PORT = 7242
const LOG_FILE = path.join(process.cwd(), 'debug.log')

// ANSI colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
}

const hypothesisColors: Record<string, string> = {
  H1: colors.red,
  H2: colors.yellow,
  H3: colors.blue,
  H4: colors.magenta,
  H5: colors.cyan,
}

// Clear log file on start
fs.writeFileSync(LOG_FILE, `# Debug Session Started: ${new Date().toISOString()}\n\n`)

const server = http.createServer((req, res) => {
  // CORS headers for browser requests
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    res.writeHead(200)
    res.end()
    return
  }

  if (req.method === 'POST') {
    let body = ''

    req.on('data', (chunk) => {
      body += chunk.toString()
    })

    req.on('end', () => {
      try {
        const log = JSON.parse(body)
        const timestamp = new Date(log.timestamp || Date.now()).toISOString()
        const hypothesis = log.hypothesis || 'LOG'
        const color = hypothesisColors[hypothesis] || colors.green

        // Format for terminal
        const terminalOutput = [
          `${color}${colors.bright}[${hypothesis}]${colors.reset}`,
          `${colors.dim}${timestamp}${colors.reset}`,
          `${colors.cyan}${log.location}${colors.reset}`,
          log.message,
          log.data ? `\n${colors.dim}${JSON.stringify(log.data, null, 2)}${colors.reset}` : '',
        ].join(' ')

        // Format for file
        const fileOutput = [
          `[${hypothesis}] ${timestamp}`,
          `Location: ${log.location}`,
          `Message: ${log.message}`,
          log.data ? `Data: ${JSON.stringify(log.data, null, 2)}` : '',
          '---',
        ].join('\n')

        // Output to terminal
        console.log(terminalOutput)

        // Append to file
        fs.appendFileSync(LOG_FILE, fileOutput + '\n')

        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ status: 'ok' }))
      } catch (error) {
        // Handle plain text logs
        const timestamp = new Date().toISOString()
        console.log(`${colors.dim}${timestamp}${colors.reset} ${body}`)
        fs.appendFileSync(LOG_FILE, `[RAW] ${timestamp}\n${body}\n---\n`)

        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ status: 'ok' }))
      }
    })
  } else {
    // GET request - show current logs
    if (fs.existsSync(LOG_FILE)) {
      res.writeHead(200, { 'Content-Type': 'text/plain' })
      res.end(fs.readFileSync(LOG_FILE, 'utf-8'))
    } else {
      res.writeHead(200, { 'Content-Type': 'text/plain' })
      res.end('No logs yet.')
    }
  }
})

server.listen(PORT, () => {
  console.log(`
${colors.green}${colors.bright}Debug Log Server Running${colors.reset}
${colors.dim}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}

${colors.cyan}Receiving logs on:${colors.reset} http://127.0.0.1:${PORT}/log
${colors.cyan}View logs:${colors.reset}        http://127.0.0.1:${PORT}
${colors.cyan}Log file:${colors.reset}         ${LOG_FILE}

${colors.dim}Press Ctrl+C to stop${colors.reset}

${colors.yellow}Waiting for logs...${colors.reset}
`)
})

// Graceful shutdown
process.on('SIGINT', () => {
  console.log(`\n${colors.dim}Debug session ended. Logs saved to ${LOG_FILE}${colors.reset}`)
  process.exit(0)
})
