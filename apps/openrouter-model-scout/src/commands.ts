export type Command =
  | { name: 'classifiers' }
  | { name: 'exit' }
  | { name: 'help' }
  | { name: 'model'; value?: string }
  | { name: 'models'; value?: string }
  | { name: 'new' }
  | { name: 'unknown'; value: string }

export function parseCommand(input: string): Command | null {
  if (!input.startsWith('/')) return null
  const [name, ...rest] = input.slice(1).trim().split(/\s+/)
  const value = rest.join(' ').trim() || undefined
  if (
    name === 'classifiers' ||
    name === 'exit' ||
    name === 'help' ||
    name === 'model' ||
    name === 'models' ||
    name === 'new'
  ) {
    return { name, ...(value ? { value } : {}) } as Command
  }
  return { name: 'unknown', value: name ?? '' }
}

export const HELP_TEXT = [
  '/models [query]   Search live model IDs and prices',
  '/model [id]       Show or switch the agent model',
  '/classifiers      Explain OpenRouter classifier options',
  '/new              Start a new persisted session',
  '/help             Show these commands',
  '/exit             Leave Model Scout',
].join('\n')

export const CLASSIFIER_TEXT = [
  'Custom classifiers tag completed generations for workspace reporting.',
  'OpenRouter currently documents admin setup through the Classifiers UI, not a public management API.',
  'Auto Beta is different: it classifies each prompt for routing and can be configured programmatically.',
  'Workspace setup: https://openrouter.ai/settings/classifiers',
].join('\n')
