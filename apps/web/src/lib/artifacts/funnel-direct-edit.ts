import type { FunnelElementTrace } from './comment-artifact-types'
import type { FunnelPageBundle } from './funnel-artifact-types'

export type FunnelDirectEditPatch =
  | { type: 'text'; value: string }
  | { type: 'style'; property: string; value: string }
  | { type: 'class'; value: string }
  | { type: 'attribute'; name: 'src' | 'alt'; value: string }

export type FunnelDirectEditResult =
  | {
      success: true
      path: string
      content: string
      funnelPageId: string | null
      sourceHint: string | null
    }
  | { success: false; error: string }

function findSourceFile(bundle: FunnelPageBundle, trace: FunnelElementTrace | null) {
  const allFiles = [...bundle.files, ...bundle.shared_files]
  const hinted = trace?.source_file
    ? allFiles.find((file) => file.path === trace.source_file)
    : null
  return (
    hinted ??
    bundle.files.find((file) => file.path === bundle.entry_file) ??
    bundle.files[0] ??
    null
  )
}

function replaceExactlyOnce(source: string, find: string, replace: string): string | null {
  if (!find) return null
  const matches = source.split(find).length - 1
  if (matches !== 1) return null
  return source.replace(find, replace)
}

function escapeHtmlText(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
}

function escapeHtmlAttribute(value: string): string {
  return escapeHtmlText(value).replaceAll('"', '&quot;')
}

function replaceAttribute(source: string, attr: 'class' | 'style', value: string): string | null {
  const pattern = new RegExp(`\\s${attr}=["'][^"']*["']`)
  const matches = source.match(new RegExp(pattern.source, 'g'))?.length ?? 0
  if (matches !== 1) return null
  return source.replace(pattern, ` ${attr}="${value}"`)
}

function updateElementAttribute(
  sourceHint: string,
  name: 'src' | 'alt',
  value: string,
): string | null {
  const escapedValue = escapeHtmlAttribute(value)
  const attributePattern = new RegExp(`\\s${name}=(["'])[^"']*\\1`, 'i')
  if (attributePattern.test(sourceHint)) {
    return sourceHint.replace(attributePattern, ` ${name}="${escapedValue}"`)
  }
  if (!/^<[a-zA-Z0-9-]+\b/.test(sourceHint)) return null
  return sourceHint.replace(/^<([a-zA-Z0-9-]+)([^>]*)>/, `<$1$2 ${name}="${escapedValue}">`)
}

function replaceSourceHint(
  source: string,
  trace: FunnelElementTrace | null,
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
  // !important so the persisted edit beats theme CSS and matches the bridge's
  // live apply-style behavior (which sets inline !important).
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

function applyPatchToSourceHint(
  trace: FunnelElementTrace | null,
  patch: FunnelDirectEditPatch,
): string | null {
  const sourceHint = trace?.source_hint
  if (!sourceHint) return null
  if (patch.type === 'text') {
    const textSnapshot = trace.text_snapshot?.trim()
    return textSnapshot
      ? replaceExactlyOnce(sourceHint, textSnapshot, escapeHtmlText(patch.value))
      : null
  }
  if (patch.type === 'attribute') {
    return updateElementAttribute(sourceHint, patch.name, patch.value)
  }
  if (patch.type === 'class') {
    return replaceAttribute(sourceHint, 'class', patch.value)
  }
  return updateStyleAttribute(sourceHint, patch.property, patch.value)
}

export function applyFunnelDirectEdit(
  bundle: FunnelPageBundle,
  trace: FunnelElementTrace | null,
  patch: FunnelDirectEditPatch,
): FunnelDirectEditResult {
  const file = findSourceFile(bundle, trace)
  if (!file) return { success: false, error: 'Funnel source file not found' }

  let nextContent: string | null = null
  const textSnapshot = trace?.text_snapshot?.trim()
  const nextSourceHint = applyPatchToSourceHint(trace, patch)

  if (patch.type === 'text') {
    if (!textSnapshot) return { success: false, error: 'Selected element has no text to replace' }
    nextContent =
      replaceSourceHint(file.content, trace, () => nextSourceHint) ??
      replaceExactlyOnce(file.content, textSnapshot, escapeHtmlText(patch.value))
  } else if (patch.type === 'class') {
    nextContent =
      replaceSourceHint(file.content, trace, () => nextSourceHint) ??
      replaceAttribute(file.content, 'class', patch.value)
  } else if (patch.type === 'attribute') {
    nextContent = replaceSourceHint(file.content, trace, () => nextSourceHint)
  } else {
    nextContent =
      replaceSourceHint(file.content, trace, () => nextSourceHint) ??
      replaceAttribute(file.content, 'style', `${patch.property}: ${patch.value} !important;`)
  }

  if (nextContent === null) {
    return {
      success: false,
      error: 'Could not map this edit to a unique source location',
    }
  }

  return {
    success: true,
    path: file.path,
    content: nextContent,
    funnelPageId: file.funnel_page_id,
    sourceHint: nextSourceHint,
  }
}
