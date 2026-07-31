import { createInterface } from 'node:readline'
import type { DisplayConfig } from './config.js'

const GRAY = '\x1b[90m'
const GREEN = '\x1b[32m'
const RESET = '\x1b[0m'
const WHITE = '\x1b[97m'

function rawReadLine(drawFrame: (line: string, first: boolean) => void): Promise<string> {
  return new Promise((resolve) => {
    let line = ''
    let first = true
    const draw = () => {
      drawFrame(line, first)
      first = false
    }
    draw()

    process.stdin.setRawMode(true)
    process.stdin.resume()
    const onData = (data: Buffer) => {
      const input = data.toString('utf8')
      if (input.startsWith('\x1b')) return
      for (const character of input) {
        const code = character.charCodeAt(0)
        if (code === 13 || code === 10) {
          process.stdin.off('data', onData)
          process.stdin.setRawMode(false)
          process.stdin.pause()
          process.stdout.write(`${RESET}\n`)
          resolve(line)
          return
        }
        if (code === 127 || code === 8) {
          line = line.slice(0, -1)
          draw()
        } else if (code === 3) {
          process.stdout.write(`${RESET}\n`)
          process.exit(0)
        } else if (code >= 32) {
          line += character
          draw()
        }
      }
    }
    process.stdin.on('data', onData)
  })
}

function blockReadLine(background: string): Promise<string> {
  return rawReadLine((line, first) => {
    if (first) {
      process.stdout.write(`\n${background}\x1b[K${RESET}\n`)
      process.stdout.write(
        `${background}\x1b[K ${WHITE}›${RESET}${background}${WHITE} ${line}${RESET}\n`,
      )
      process.stdout.write(`${background}\x1b[K${RESET}\x1b[1A\r\x1b[4G`)
      return
    }
    process.stdout.write(
      `\r\x1b[2K${background}\x1b[K ${WHITE}›${RESET}${background}${WHITE} ${line}${RESET}`,
    )
  })
}

function borderedReadLine(): Promise<string> {
  const border = `${GRAY}${'─'.repeat(process.stdout.columns || 80)}${RESET}`
  return rawReadLine((line, first) => {
    if (first) {
      process.stdout.write(`\n${border}\n› ${line}\n${border}\x1b[1A\r\x1b[${3 + line.length}G`)
      return
    }
    process.stdout.write(`\r\x1b[2K› ${line}`)
  })
}

function plainReadLine(): Promise<string> {
  const readline = createInterface({ input: process.stdin, output: process.stdout })
  return new Promise((resolve) => {
    readline.question(`${GREEN}>${RESET} `, (answer) => {
      readline.close()
      resolve(answer)
    })
  })
}

export async function readInput(display: DisplayConfig, background: string): Promise<string> {
  if (!process.stdin.isTTY || display.inputStyle === 'plain') return plainReadLine()
  return display.inputStyle === 'block' ? blockReadLine(background) : borderedReadLine()
}
