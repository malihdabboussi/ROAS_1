import type { PresentationBundle, PresentationElementTrace } from '../types'

export type PresentationDirectEditPatch =
  | { type: 'text'; value: string }
  | { type: 'style'; property: string; value: string }
  | { type: 'class'; value: string }

export type PresentationDirectEditResult =
  | { success: true; path: string; content: string }
  | { success: false; error: string }

function findSourceFile(bundle: PresentationBundle, trace: PresentationElementTrace | null) {
  const hinted = trace?.source_file
    ? bundle.files.find((file) => file.path === trace.source_file)
    : null
  return hinted ?? bundle.files.find((file) => file.path === bundle.entry_file) ?? null
}

function replaceExactlyOnce(source: string, find: string, replace: string): string | null {
  if (!find) return null
  const matches = source.split(find).length - 1
  if (matches !== 1) return null
  return source.replace(find, replace)
}

function replaceAttribute(source: string, attr: 'class' | 'style', value: string): string | null {
  const pattern = new RegExp(`\\s${attr}=["'][^"']*["']`)
  const matches = source.match(new RegExp(pattern.source, 'g'))?.length ?? 0
  if (matches !== 1) return null
  return source.replace(pattern, ` ${attr}="${value}"`)
}

function replaceSourceHint(
  source: string,
  trace: PresentationElementTrace | null,
  update: (sourceHint: string) => string | null,
): string | null {
  const sourceHint = trace?.source_hint
  if (!sourceHint) return null
  const matches = source.split(sourceHint).length - 1
  if (matches !== 1) return null
  const nextHint = update(sourceHint)
  return nextHint ? source.replace(sourceHint, nextHint) : null
}

function updateStyleAttribute(sourceHint: string, property: string, value: string): string {
  // !important so the persisted edit beats the theme mapping CSS (!important)
  // and is recognized as user-owned by the theme paint scripts.
  const nextDeclaration = `${property}: ${value} !important;`
  const stylePattern = /\sstyle=["']([^"']*)["']/
  const match = sourceHint.match(stylePattern)
  if (!match) {
    return sourceHint.replace(/^<([a-zA-Z0-9-]+)([^>]*)>/, `<$1$2 style="${nextDeclaration}">`)
  }

  const declarations = match[1]!
    .split(';')
    .map((item) => item.trim())
    .filter(Boolean)
    .filter((item) => item.split(':')[0]?.trim().toLowerCase() !== property.toLowerCase())
  declarations.push(nextDeclaration.replace(/;$/, ''))
  return sourceHint.replace(stylePattern, ` style="${declarations.join('; ')};"`)
}

export function applyPresentationDirectEdit(
  bundle: PresentationBundle,
  trace: PresentationElementTrace | null,
  patch: PresentationDirectEditPatch,
): PresentationDirectEditResult {
  const file = findSourceFile(bundle, trace)
  if (!file) return { success: false, error: 'Presentation source file not found' }

  let nextContent: string | null = null
  const textSnapshot = trace?.text_snapshot?.trim()

  if (patch.type === 'text') {
    if (!textSnapshot) return { success: false, error: 'Selected element has no text to replace' }
    nextContent =
      replaceSourceHint(file.content, trace, (sourceHint) =>
        replaceExactlyOnce(sourceHint, textSnapshot, patch.value),
      ) ?? replaceExactlyOnce(file.content, textSnapshot, patch.value)
  } else if (patch.type === 'class') {
    nextContent =
      replaceSourceHint(file.content, trace, (sourceHint) =>
        replaceAttribute(sourceHint, 'class', patch.value),
      ) ?? replaceAttribute(file.content, 'class', patch.value)
  } else {
    nextContent =
      replaceSourceHint(file.content, trace, (sourceHint) =>
        updateStyleAttribute(sourceHint, patch.property, patch.value),
      ) ?? replaceAttribute(file.content, 'style', `${patch.property}: ${patch.value} !important;`)
  }

  if (nextContent === null) {
    return {
      success: false,
      error: 'Could not map this edit to a unique source location',
    }
  }

  return { success: true, path: file.path, content: nextContent }
}
