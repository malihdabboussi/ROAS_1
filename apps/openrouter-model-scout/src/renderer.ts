import type { AgentEvent } from './agent.js'
import type { DisplayConfig } from './config.js'
import type { Loader } from './loader.js'

const BOLD = '\x1b[1m'
const DIM = '\x1b[2m'
const GREEN = '\x1b[32m'
const RESET = '\x1b[0m'

const TOOL_LABELS: Record<string, string> = {
  get_openrouter_model: 'Checked model',
  openrouter_datetime: 'Checked time',
  openrouter_web_search: 'Searched web',
  search_openrouter_models: 'Searched models',
}

function summarizeArguments(argumentsValue: Record<string, unknown>): string {
  const key = Object.keys(argumentsValue)[0]
  if (!key) return ''
  const value = String(argumentsValue[key])
  return `${key}=${value.length > 60 ? `${value.slice(0, 60)}…` : value}`
}

export class Renderer {
  private started = false
  private streamedText = false

  constructor(
    private readonly display: DisplayConfig,
    private readonly loader: Loader,
  ) {}

  handle(event: AgentEvent): void {
    if (!this.started) {
      this.loader.stop()
      this.started = true
    }
    if (event.type === 'text') {
      this.streamedText = true
      process.stdout.write(event.delta)
      return
    }
    if (this.display.toolDisplay === 'hidden') return
    if (this.streamedText) {
      process.stdout.write('\n')
      this.streamedText = false
    }
    const label = TOOL_LABELS[event.name] ?? event.name
    const details = summarizeArguments(event.arguments)
    if (this.display.toolDisplay === 'minimal') {
      console.log(`${DIM}${label}${RESET}`)
    } else if (this.display.toolDisplay === 'emoji') {
      console.log(`${GREEN}⚡${RESET} ${DIM}${label}${details ? ` ${details}` : ''}${RESET}`)
    } else {
      console.log(
        `${GREEN}●${RESET} ${BOLD}${label}${RESET}${details ? ` ${DIM}${details}${RESET}` : ''}`,
      )
    }
  }

  end(): void {
    this.loader.stop()
    if (this.streamedText) process.stdout.write(`${RESET}\n`)
    this.started = false
    this.streamedText = false
  }
}
