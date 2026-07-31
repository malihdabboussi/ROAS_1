import { runAgent } from './agent.js'
import { CLASSIFIER_TEXT, HELP_TEXT, parseCommand } from './commands.js'
import { loadConfig } from './config.js'
import { ERRORS } from './errors.config.js'
import { readInput } from './input.js'
import { Loader } from './loader.js'
import { MESSAGES } from './messages.config.js'
import { fetchModel, searchModels } from './model-catalog.js'
import { Renderer } from './renderer.js'
import { withOpenRouterRetry } from './retry.js'
import { ModelScoutSession } from './session.js'
import { detectBackground } from './terminal-bg.js'

const BOLD = '\x1b[1m'
const CYAN = '\x1b[36m'
const DIM = '\x1b[2m'
const RESET = '\x1b[0m'

function formatMoney(value: number | null): string {
  return value === null ? 'n/a' : `$${value.toFixed(value < 1 ? 2 : 0)}`
}

function printBanner(model: string, resumed: boolean): void {
  const width = Math.min(process.stdout.columns || 60, 60)
  const line = `${DIM}${'─'.repeat(width)}${RESET}`
  console.log(`\n${line}`)
  console.log(`  ${BOLD}ROAS MODEL SCOUT${RESET}  ${DIM}v0.1.0${RESET}`)
  console.log(`  ${DIM}model${RESET}  ${CYAN}${model}${RESET}`)
  console.log(`  ${DIM}session${RESET}  ${resumed ? 'resumed' : 'new'} · /help for commands`)
  console.log(`${line}`)
}

async function main(): Promise<void> {
  const config = loadConfig()
  let session =
    (await ModelScoutSession.resumeLatest(config.sessionDir)) ??
    (await ModelScoutSession.create(config.sessionDir))
  const resumed = Boolean(session.previousResponseId)
  const background = config.display.inputStyle === 'block' ? await detectBackground() : ''
  printBanner(config.model, resumed)

  while (true) {
    const input = (await readInput(config.display, background)).trim()
    if (!input) continue
    const command = parseCommand(input)
    if (command?.name === 'exit') break
    if (command?.name === 'help') {
      console.log(`\n${HELP_TEXT}\n`)
      continue
    }
    if (command?.name === 'classifiers') {
      console.log(`\n${CLASSIFIER_TEXT}\n`)
      continue
    }
    if (command?.name === 'new') {
      session = await ModelScoutSession.create(config.sessionDir)
      console.log(`\n${MESSAGES.newSession}\n`)
      continue
    }
    if (command?.name === 'model') {
      if (!command.value) {
        console.log(`\nCurrent model: ${config.model}\n`)
        continue
      }
      if (command.value !== 'openrouter/auto-beta') {
        const model = await fetchModel(command.value, { apiKey: config.apiKey })
        config.model = model.id
      } else {
        config.model = command.value
      }
      console.log(`\nModel switched to ${config.model}.\n`)
      continue
    }
    if (command?.name === 'models') {
      const result = await searchModels(
        {
          limit: 10,
          query: command.value,
          requireTools: true,
          sort: 'pricing-low-to-high',
        },
        { apiKey: config.apiKey },
      )
      console.log()
      for (const model of result.models) {
        console.log(
          `${model.id} · ${formatMoney(model.promptPricePerMillion)}/${formatMoney(model.completionPricePerMillion)} per M · ${model.contextLength?.toLocaleString() ?? 'n/a'} ctx`,
        )
      }
      console.log()
      continue
    }
    if (command?.name === 'unknown') {
      console.log(`\nUnknown command: /${command.value}. Use /help.\n`)
      continue
    }

    await session.appendUser(input)
    const loader = new Loader(config.display.loader)
    const renderer = new Renderer(config.display, loader)
    loader.start()
    try {
      const result = await withOpenRouterRetry(() =>
        runAgent(config, session, input, (event) => renderer.handle(event)),
      )
      renderer.end()
      await session.appendAssistant({
        model: result.model,
        responseId: result.responseId,
        text: result.text,
      })
      const cost = result.cost === null ? 'cost unavailable' : `$${result.cost.toFixed(4)}`
      console.log(
        `${DIM}${result.model} · ${result.inputTokens.toLocaleString()} in · ${result.outputTokens.toLocaleString()} out · ${cost}${RESET}\n`,
      )
    } catch (error) {
      renderer.end()
      const message = error instanceof Error ? error.message : String(error)
      console.error(`${ERRORS.turnFailed}: ${message}\n`)
    }
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error)
  console.error(message)
  process.exitCode = 1
})
