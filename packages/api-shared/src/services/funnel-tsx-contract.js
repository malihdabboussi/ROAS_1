'use strict'
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod }
  }
Object.defineProperty(exports, '__esModule', { value: true })
exports.buildSafeFallbackFunnelTsx = buildSafeFallbackFunnelTsx
exports.normalizeFunnelPageSource = normalizeFunnelPageSource
exports.validateFunnelTsxContract = validateFunnelTsxContract
exports.recoverFunnelTsx = recoverFunnelTsx
exports.prepareFunnelPageForWrite = prepareFunnelPageForWrite
const typescript_1 = __importDefault(require('typescript'))
function buildSafeFallbackFunnelTsx(pageName) {
  const safeName = toSafeComponentName(pageName)
  return [
    `const ${safeName} = () => {`,
    '  return (',
    "    <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: '24px', fontFamily: 'Inter, system-ui, sans-serif', background: '#0f1116', color: '#e5e7eb' }}>",
    "      <section style={{ maxWidth: '720px', width: '100%', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '16px', padding: '20px', background: 'rgba(255,255,255,0.04)' }}>",
    "        <h1 style={{ margin: '0 0 8px', fontSize: '24px', fontWeight: 700 }}>Page was auto-recovered</h1>",
    '        <p style={{ margin: 0, opacity: 0.86 }}>Generated source was invalid, so a safe fallback was saved.</p>',
    '      </section>',
    '    </main>',
    '  )',
    '}',
    '',
    `export default ${safeName}`,
  ].join('\n')
}
function decodeHtmlEntities(text) {
  return text
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)))
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
}
function normalizeFunnelPageSource(input) {
  const normalizationApplied = []
  let html = String(input.generatedHtmlRaw ?? '')
  let css = String(input.generatedCssRaw ?? '').trim()
  if (/^\uFEFF/.test(html)) {
    html = html.replace(/^\uFEFF/, '')
    normalizationApplied.push('strip_bom')
  }
  if (/&#x27;|&#39;|&apos;|&#\d+;|&#x[0-9a-fA-F]+;|&amp;|&lt;|&gt;|&quot;|&nbsp;/.test(html)) {
    html = decodeHtmlEntities(html)
    normalizationApplied.push('decode_html_entities')
  }
  if (/<!--[\s\S]*?-->/.test(html)) {
    html = html.replace(/<!--[\s\S]*?-->/g, '')
    normalizationApplied.push('strip_html_comments')
  }
  if (/^\s*```(?:tsx|ts|jsx|js)?\s*\n?/i.test(html)) {
    html = html.replace(/^\s*```(?:tsx|ts|jsx|js)?\s*\n?/i, '')
    normalizationApplied.push('strip_code_fence_start')
  }
  if (/\n?\s*```\s*$/i.test(html)) {
    html = html.replace(/\n?\s*```\s*$/i, '')
    normalizationApplied.push('strip_code_fence_end')
  }
  const extracted = extractInlineStyleBlocks(html)
  if (extracted.css) {
    css = [css, extracted.css].filter(Boolean).join('\n\n')
    normalizationApplied.push('extract_inline_style_blocks')
  }
  html = extracted.html
  const normalizedAttrs = html.replace(/\bclass=/g, 'className=').replace(/\bfor=/g, 'htmlFor=')
  if (normalizedAttrs !== html) {
    html = normalizedAttrs
    normalizationApplied.push('normalize_jsx_attrs')
  }
  html = html.trim()
  return { generatedHtml: html, generatedCss: css, normalizationApplied }
}
function validateFunnelTsxContract(raw) {
  if (!raw.trim()) return { valid: false, code: 'EMPTY', message: 'generated_html cannot be empty' }
  if (/<!--|-->/.test(raw)) {
    return {
      valid: false,
      code: 'HTML_COMMENTS',
      message: 'generated_html cannot contain HTML comments (`<!-- -->`)',
    }
  }
  if (/^\s*```/.test(raw) || /```\s*$/.test(raw)) {
    return {
      valid: false,
      code: 'MARKDOWN_FENCE',
      message: 'generated_html cannot contain markdown code fences',
    }
  }
  if (isLikelyStylesheetContent(raw)) {
    return {
      valid: false,
      code: 'STYLESHEET_CONTENT',
      message: 'generated_html looks like CSS/stylesheet content, not TSX',
    }
  }
  if (!isComponentShapedTsx(raw)) {
    return {
      valid: false,
      code: 'NOT_COMPONENT',
      message: 'generated_html must contain a self-contained React component with default export',
    }
  }
  const tsxSyntaxError = getTsxSyntaxError(raw)
  if (tsxSyntaxError) {
    return {
      valid: false,
      code: 'TSX_PARSE_ERROR',
      message: tsxSyntaxError,
    }
  }
  return { valid: true }
}
function recoverFunnelTsx(input) {
  let html = input.generatedHtml.trim()
  let css = input.generatedCss.trim()
  const recoveryApplied = []
  if (isLikelyStylesheetContent(html)) {
    css = [css, html].filter(Boolean).join('\n\n')
    html = buildSafeFallbackFunnelTsx(input.pageName)
    recoveryApplied.push('move_stylesheet_content_to_css')
    recoveryApplied.push('inject_safe_fallback')
    return {
      generatedHtml: html,
      generatedCss: css,
      recoveryApplied,
      validation: validateFunnelTsxContract(html),
    }
  }
  const wrapped = wrapBareJsxAsComponent(html, input.pageName)
  if (wrapped) {
    html = wrapped
    recoveryApplied.push('wrap_bare_jsx_component')
  }
  const withDefaultExport = ensureDefaultExport(html)
  if (withDefaultExport !== html) {
    html = withDefaultExport
    recoveryApplied.push('ensure_default_export')
  }
  const validation = validateFunnelTsxContract(html)
  return { generatedHtml: html, generatedCss: css, recoveryApplied, validation }
}
function prepareFunnelPageForWrite(input) {
  const normalized = normalizeFunnelPageSource({
    generatedHtmlRaw: input.generatedHtmlRaw,
    generatedCssRaw: input.generatedCssRaw ?? '',
  })
  const initialValidation = validateFunnelTsxContract(normalized.generatedHtml)
  if (initialValidation.valid) {
    return {
      generatedHtml: normalized.generatedHtml,
      generatedCss: normalized.generatedCss,
      normalizationApplied: normalized.normalizationApplied,
      recoveryApplied: [],
      usedFallback: false,
      usedPreviousValid: false,
      initialValidation,
      finalValidation: initialValidation,
    }
  }
  const recovered = recoverFunnelTsx({
    generatedHtml: normalized.generatedHtml,
    generatedCss: normalized.generatedCss,
    pageName: input.pageName,
  })
  if (recovered.validation.valid) {
    const usedFallback = recovered.recoveryApplied.includes('inject_safe_fallback')
    return {
      generatedHtml: recovered.generatedHtml,
      generatedCss: recovered.generatedCss,
      normalizationApplied: normalized.normalizationApplied,
      recoveryApplied: recovered.recoveryApplied,
      usedFallback,
      usedPreviousValid: false,
      initialValidation,
      finalValidation: recovered.validation,
    }
  }
  const previousValidation = input.previousValidHtml
    ? validateFunnelTsxContract(input.previousValidHtml)
    : { valid: false }
  if (input.mode === 'update' && previousValidation.valid) {
    return {
      generatedHtml: input.previousValidHtml,
      generatedCss: recovered.generatedCss,
      normalizationApplied: normalized.normalizationApplied,
      recoveryApplied: [...recovered.recoveryApplied, 'preserve_previous_valid_html'],
      usedFallback: false,
      usedPreviousValid: true,
      initialValidation,
      finalValidation: previousValidation,
    }
  }
  const fallback = buildSafeFallbackFunnelTsx(input.pageName)
  return {
    generatedHtml: fallback,
    generatedCss: recovered.generatedCss,
    normalizationApplied: normalized.normalizationApplied,
    recoveryApplied: [...recovered.recoveryApplied, 'inject_safe_fallback'],
    usedFallback: true,
    usedPreviousValid: false,
    initialValidation,
    finalValidation: validateFunnelTsxContract(fallback),
  }
}
function extractInlineStyleBlocks(raw) {
  let css = ''
  const html = raw.replace(/<style[\s>][\s\S]*?<\/style\s*>/gi, (block) => {
    const match = block.match(/<style[\s>]*>([\s\S]*?)<\/style\s*>/i)
    const styleBody = String(match?.[1] ?? '').trim()
    if (styleBody) css = css ? `${css}\n\n${styleBody}` : styleBody
    return ''
  })
  return { html: html.trim(), css }
}
function toSafeComponentName(pageName) {
  const safeName = pageName.replace(/[^A-Za-z0-9_]/g, '')
  if (!safeName) return 'FunnelPage'
  if (/^[A-Z]/.test(safeName)) return safeName
  return `${safeName.slice(0, 1).toUpperCase()}${safeName.slice(1)}`
}
function isLikelyStylesheetContent(raw) {
  const source = raw.trim()
  if (!source) return false
  if (/^@import\s+url\(/i.test(source)) return true
  if (/^(?::root|html|body|\.[\w-]+|#[\w-]+)\s*\{/.test(source)) return true
  if (/<style[\s>]/i.test(source)) return true
  if (
    /--[\w-]+\s*:\s*[^;]+;/.test(source) &&
    !/(?:export\s+default|function\s+[A-Z]|const\s+[A-Z][\w]*\s*=)/.test(source)
  ) {
    return true
  }
  return false
}
function isComponentShapedTsx(raw) {
  return (
    /\bexport\s+default\b/.test(raw) &&
    (/\bfunction\s+[A-Z][A-Za-z0-9_]*\s*\(/.test(raw) ||
      /\bconst\s+[A-Z][A-Za-z0-9_]*\s*=/.test(raw) ||
      /\bclass\s+[A-Z][A-Za-z0-9_]*\s+extends\s+/.test(raw))
  )
}
function wrapBareJsxAsComponent(raw, pageName) {
  const source = raw.trim()
  if (!source || !source.startsWith('<')) return null
  if (/\bexport\s+default\b|\bfunction\s+[A-Z]\w*|\bconst\s+[A-Z]\w*\s*=/.test(source)) return null
  const safeName = toSafeComponentName(pageName)
  return [
    `const ${safeName} = () => {`,
    '  return (',
    '    <>',
    source,
    '    </>',
    '  )',
    '}',
    '',
    `export default ${safeName}`,
  ].join('\n')
}
function ensureDefaultExport(raw) {
  if (/\bexport\s+default\b/.test(raw)) return raw
  const constMatch = raw.match(/\bconst\s+([A-Z][A-Za-z0-9_]*)\s*=/)
  if (constMatch?.[1]) return `${raw}\n\nexport default ${constMatch[1]}`
  const fnMatch = raw.match(/\bfunction\s+([A-Z][A-Za-z0-9_]*)\s*\(/)
  if (fnMatch?.[1]) return `${raw}\n\nexport default ${fnMatch[1]}`
  return raw
}
function getTsxSyntaxError(raw) {
  const diagnostics = typescript_1.default.transpileModule(raw, {
    fileName: 'FunnelPage.tsx',
    reportDiagnostics: true,
    compilerOptions: {
      jsx: typescript_1.default.JsxEmit.ReactJSX,
      module: typescript_1.default.ModuleKind.ESNext,
      target: typescript_1.default.ScriptTarget.ES2020,
      allowJs: true,
    },
  }).diagnostics
  const firstError = diagnostics?.find(
    (diag) => diag.category === typescript_1.default.DiagnosticCategory.Error,
  )
  if (!firstError) return null
  const message = typescript_1.default
    .flattenDiagnosticMessageText(firstError.messageText, ' ')
    .trim()
  if (!firstError.file || firstError.start === undefined) return message
  const pos = firstError.file.getLineAndCharacterOfPosition(firstError.start)
  return `TSX parse error at line ${pos.line + 1}, column ${pos.character + 1}: ${message}`
}
//# sourceMappingURL=funnel-tsx-contract.js.map
