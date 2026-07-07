import { parsePresentationSections } from './artifact-patch.util'
import { validateBundleFileContent, type BundleFileInput } from './html-bundle.util'
import {
  collectPresentationLocalReferences,
  PRESENTATION_REFLOW_PATTERNS,
} from './presentation-html-contract-references.util'

export type PresentationContractIssueSeverity = 'blocking_save' | 'repair_required' | 'warning'

export interface PresentationContractIssue {
  code: string
  severity: PresentationContractIssueSeverity
  path: string
  message: string
  fix: string
}

export interface PresentationContractReport {
  valid: boolean
  issues: PresentationContractIssue[]
  blockingIssues: PresentationContractIssue[]
  repairIssues: PresentationContractIssue[]
  warnings: PresentationContractIssue[]
}

interface PresentationBundleContractInput {
  files: BundleFileInput[]
  knownPaths?: string[]
  entryFile?: string
}

function makeReport(issues: PresentationContractIssue[]): PresentationContractReport {
  const blockingIssues = issues.filter((issue) => issue.severity === 'blocking_save')
  const repairIssues = issues.filter((issue) => issue.severity === 'repair_required')
  const warnings = issues.filter((issue) => issue.severity === 'warning')
  return {
    valid: blockingIssues.length === 0 && repairIssues.length === 0,
    issues,
    blockingIssues,
    repairIssues,
    warnings,
  }
}

function issue(input: PresentationContractIssue): PresentationContractIssue {
  return input
}

function repairFromBlocking(input: PresentationContractIssue): PresentationContractIssue {
  return { ...input, severity: 'repair_required' }
}

function getEntryFile(files: BundleFileInput[], entryFile = 'index.html'): BundleFileInput | null {
  return files.find((file) => file.path === entryFile) ?? null
}

function getInlineStyleBlocks(html: string): string[] {
  return [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].map((match) => match[1] ?? '')
}

function getCssSource(files: BundleFileInput[], entryContent: string): string {
  return [
    ...files.filter((file) => file.path.endsWith('.css')).map((file) => file.content),
    ...getInlineStyleBlocks(entryContent),
  ].join('\n')
}

function hasClass(openTag: string, className: string): boolean {
  const classAttr = openTag.match(/\bclass\s*=\s*(["'])(.*?)\1/i)?.[2] ?? ''
  return classAttr.split(/\s+/).includes(className)
}

function hasDeckWrapper(html: string): boolean {
  return /<main\b[^>]*\bclass\s*=\s*(["'])[^"']*\bdeck\b[^"']*\1/i.test(html)
}

function hasThemeNativeMarker(html: string): boolean {
  return /<html\b[^>]*\bdata-vibey-theme-native\s*=\s*(["'])true\1/i.test(html)
}

function cssHasFixedSlideStage(css: string): boolean {
  const rules = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
  return rules.some((match) => {
    const selector = match[1] ?? ''
    const body = match[2] ?? ''
    return (
      /\.slide(?:\b|[:.#\s,{])/.test(selector) &&
      /width\s*:\s*1280px/i.test(body) &&
      /height\s*:\s*720px/i.test(body)
    )
  })
}

export function formatPresentationContractIssues(issues: PresentationContractIssue[]): string {
  return issues
    .map((item) => `${item.code} (${item.path}): ${item.message} Fix: ${item.fix}`)
    .join(' ')
}

export function validatePresentationFileBeforeSave(
  path: string,
  content: string,
): PresentationContractReport {
  const fileError = validateBundleFileContent(path, content)
  return makeReport(
    fileError
      ? [
          issue({
            code: 'PRESENTATION_FILE_INVALID',
            severity: 'blocking_save',
            path,
            message: fileError,
            fix: 'Send complete, valid file content before saving.',
          }),
        ]
      : [],
  )
}

export function validatePresentationFilesBeforeSave(
  files: BundleFileInput[],
  entryFile = 'index.html',
): PresentationContractReport {
  const issues: PresentationContractIssue[] = []
  const entry = getEntryFile(files, entryFile)
  if (!entry) {
    issues.push(
      issue({
        code: 'PRESENTATION_ENTRY_MISSING',
        severity: 'blocking_save',
        path: entryFile,
        message: `Presentation bundle is missing ${entryFile}.`,
        fix: `Include ${entryFile} as the complete HTML entry file.`,
      }),
    )
  }

  for (const file of files) {
    const fileReport = validatePresentationFileBeforeSave(file.path, file.content)
    issues.push(...fileReport.blockingIssues)
  }

  return makeReport(issues)
}

export function verifyPresentationHtmlBundleContract(
  input: PresentationBundleContractInput,
): PresentationContractReport {
  const entryFile = input.entryFile ?? 'index.html'
  const issues = validatePresentationFilesBeforeSave(input.files, entryFile).blockingIssues.map(
    repairFromBlocking,
  )
  const entry = getEntryFile(input.files, entryFile)
  if (!entry) return makeReport(issues)

  const css = getCssSource(input.files, entry.content)
  const knownPaths = new Set([...input.files.map((file) => file.path), ...(input.knownPaths ?? [])])

  if (!hasThemeNativeMarker(entry.content)) {
    issues.push(
      issue({
        code: 'PRESENTATION_THEME_NATIVE_MISSING',
        severity: 'repair_required',
        path: entry.path,
        message: '<html> is missing data-vibey-theme-native="true".',
        fix: 'Mark the HTML root as theme-native and use Theme tokens in CSS.',
      }),
    )
  }

  if (!hasDeckWrapper(entry.content)) {
    issues.push(
      issue({
        code: 'PRESENTATION_DECK_WRAPPER_MISSING',
        severity: 'repair_required',
        path: entry.path,
        message: 'Presentation source is missing <main class="deck">.',
        fix: 'Wrap all slide sections in <main class="deck">.',
      }),
    )
  }

  if (!cssHasFixedSlideStage(css)) {
    issues.push(
      issue({
        code: 'PRESENTATION_FIXED_STAGE_MISSING',
        severity: 'repair_required',
        path: 'styles.css',
        message: 'CSS does not prove .slide has fixed width: 1280px and height: 720px.',
        fix: 'Define .slide with width: 1280px; height: 720px; overflow: hidden.',
      }),
    )
  }

  for (const reflow of PRESENTATION_REFLOW_PATTERNS) {
    if (!reflow.pattern.test(css)) continue
    issues.push(
      issue({
        code: 'PRESENTATION_REFLOW_PATTERN',
        severity: 'repair_required',
        path: 'styles.css',
        message: reflow.message,
        fix: reflow.fix,
      }),
    )
  }

  const parsed = parsePresentationSections(entry.content)
  if (!parsed) {
    issues.push(
      issue({
        code: 'PRESENTATION_SLIDES_MISSING',
        severity: 'repair_required',
        path: entry.path,
        message: 'No slide <section> blocks were found.',
        fix: 'Create one top-level <section class="slide"> per slide.',
      }),
    )
  } else {
    parsed.sections.forEach((section, index) => {
      const openTag = section.match(/^<section\b[^>]*>/i)?.[0] ?? ''
      if (!hasClass(openTag, 'slide')) {
        issues.push(
          issue({
            code: 'PRESENTATION_SLIDE_CLASS_MISSING',
            severity: 'repair_required',
            path: `${entry.path}#slide-${index + 1}`,
            message: `Slide ${index + 1} is missing class="slide".`,
            fix: 'Add slide to the section class list.',
          }),
        )
      }
      if (!/\bdata-comment-anchor\s*=/i.test(openTag)) {
        issues.push(
          issue({
            code: 'PRESENTATION_SLIDE_ANCHOR_MISSING',
            severity: 'repair_required',
            path: `${entry.path}#slide-${index + 1}`,
            message: `Slide ${index + 1} is missing a data-comment-anchor.`,
            fix: 'Add a stable data-comment-anchor to the slide section.',
          }),
        )
      }
    })
  }

  for (const ref of collectPresentationLocalReferences(entry.content, css)) {
    if (knownPaths.has(ref.path)) continue
    issues.push(
      issue({
        code: 'PRESENTATION_LOCAL_REF_MISSING',
        severity: 'repair_required',
        path: entry.path,
        message: `Bundle references "${ref.source}" but that path is not saved or attached.`,
        fix: `Write or attach ${ref.path}, or update the reference to an existing bundle path.`,
      }),
    )
  }

  return makeReport(issues)
}
