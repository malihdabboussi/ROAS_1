import type { LoaderConfig } from './config.js'

const DIM = '\x1b[2m'
const RESET = '\x1b[0m'
const SPINNER_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']
const GRADIENT_COLORS = [
  '\x1b[38;5;240m',
  '\x1b[38;5;245m',
  '\x1b[38;5;250m',
  '\x1b[38;5;255m',
  '\x1b[38;5;250m',
  '\x1b[38;5;245m',
]

export class Loader {
  private frame = 0
  private interval: ReturnType<typeof setInterval> | null = null

  constructor(private readonly config: LoaderConfig) {}

  start(): void {
    this.frame = 0
    const delay =
      this.config.style === 'gradient' ? 150 : this.config.style === 'spinner' ? 80 : 300
    this.interval = setInterval(() => this.draw(), delay)
  }

  stop(): void {
    if (!this.interval) return
    clearInterval(this.interval)
    this.interval = null
    process.stdout.write('\r\x1b[K')
  }

  private draw(): void {
    const { style, text } = this.config
    this.frame += 1
    if (style === 'minimal') {
      const dots = ['·', '··', '···']
      process.stdout.write(`\r${DIM}${text}${dots[this.frame % dots.length]}${RESET}`)
      return
    }
    if (style === 'spinner') {
      process.stdout.write(
        `\r${DIM}${SPINNER_FRAMES[this.frame % SPINNER_FRAMES.length]} ${text}${RESET}`,
      )
      return
    }
    const gradient = [...text]
      .map(
        (character, index) =>
          `${GRADIENT_COLORS[(this.frame + index) % GRADIENT_COLORS.length]}${character}`,
      )
      .join('')
    process.stdout.write(`\r${gradient}${RESET}`)
  }
}
