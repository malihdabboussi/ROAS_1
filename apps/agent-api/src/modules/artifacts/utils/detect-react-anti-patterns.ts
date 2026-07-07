/**
 * Lightweight regex-based detection of common React anti-patterns in generated TSX.
 * These pass structural/parse validation but crash at runtime.
 */

export interface ReactAntiPattern {
  rule: string
  message: string
  severity: 'error' | 'warning'
}

const HOOK_NAMES =
  'use(?:State|Effect|Memo|Callback|Ref|Context|Reducer|LayoutEffect|ImperativeHandle|DebugValue|Id|SyncExternalStore|Transition|DeferredValue|Optimistic|ActionState|FormStatus)'

/**
 * Hooks inside if/else/switch blocks.
 * Matches patterns like: if (...) { ... useState( ... }
 */
function detectHooksInConditionals(code: string): ReactAntiPattern[] {
  const results: ReactAntiPattern[] = []
  const conditionalBlockRe =
    /\b(if|else\s+if|else|switch)\s*(?:\([^)]*\))?\s*\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/g
  let match: RegExpExecArray | null
  while ((match = conditionalBlockRe.exec(code)) !== null) {
    const body = match[2] ?? ''
    const hookRe = new RegExp(`\\b(${HOOK_NAMES})\\s*\\(`, 'g')
    let hookMatch: RegExpExecArray | null
    while ((hookMatch = hookRe.exec(body)) !== null) {
      results.push({
        rule: 'hooks-in-conditional',
        message: `${hookMatch[1]} called inside a ${match[1]} block. React hooks must be called at the top level of the component, never inside conditionals.`,
        severity: 'error',
      })
    }
  }
  return results
}

/**
 * Hooks inside for/while/do loops.
 */
function detectHooksInLoops(code: string): ReactAntiPattern[] {
  const results: ReactAntiPattern[] = []
  const loopRe = /\b(for|while|do)\s*(?:\([^)]*\))?\s*\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/g
  let match: RegExpExecArray | null
  while ((match = loopRe.exec(code)) !== null) {
    const body = match[2] ?? ''
    const hookRe = new RegExp(`\\b(${HOOK_NAMES})\\s*\\(`, 'g')
    let hookMatch: RegExpExecArray | null
    while ((hookMatch = hookRe.exec(body)) !== null) {
      results.push({
        rule: 'hooks-in-loop',
        message: `${hookMatch[1]} called inside a ${match[1]} loop. React hooks must not be called inside loops.`,
        severity: 'error',
      })
    }
  }
  return results
}

/**
 * Hooks inside nested function expressions / arrow functions (event handlers, callbacks).
 * Looks for: const handleX = () => { ... useState ... } or function handleX() { ... useState ... }
 */
function detectHooksInCallbacks(code: string): ReactAntiPattern[] {
  const results: ReactAntiPattern[] = []
  const arrowHandlerRe =
    /\b(?:const|let|var)\s+(\w+)\s*=\s*(?:\([^)]*\)|[^=])\s*=>\s*\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/g
  let match: RegExpExecArray | null
  while ((match = arrowHandlerRe.exec(code)) !== null) {
    const fnName = match[1] ?? ''
    const body = match[2] ?? ''
    if (/^[A-Z]/.test(fnName)) continue
    const hookRe = new RegExp(`\\b(${HOOK_NAMES})\\s*\\(`, 'g')
    let hookMatch: RegExpExecArray | null
    while ((hookMatch = hookRe.exec(body)) !== null) {
      results.push({
        rule: 'hooks-in-callback',
        message: `${hookMatch[1]} called inside "${fnName}" callback. Hooks can only be called at the top level of a React component function, not inside nested functions or event handlers.`,
        severity: 'error',
      })
    }
  }
  return results
}

/**
 * Direct setState / set* calls at the top level of the render body (outside useEffect).
 * Catches: const [x, setX] = useState(...) ... setX(something) at component body level.
 * This is a heuristic — looks for set* calls that aren't inside useEffect, handlers, or callbacks.
 */
function detectSetStateInRender(code: string): ReactAntiPattern[] {
  const results: ReactAntiPattern[] = []
  const setterRe = /\[\s*\w+\s*,\s*(set[A-Z]\w*)\s*\]\s*=\s*useState/g
  const setterNames: string[] = []
  let setterMatch: RegExpExecArray | null
  while ((setterMatch = setterRe.exec(code)) !== null) {
    if (setterMatch[1]) setterNames.push(setterMatch[1])
  }
  if (setterNames.length === 0) return results

  const componentBodyRe = /export\s+default\s+function\s+\w+\s*\([^)]*\)\s*\{([\s\S]*)\}\s*$/m
  const bodyMatch = componentBodyRe.exec(code)
  if (!bodyMatch?.[1]) return results
  const body = bodyMatch[1]

  for (const setter of setterNames) {
    const directCallRe = new RegExp(`(?:^|\\n)\\s*${setter}\\s*\\(`, 'gm')
    if (directCallRe.test(body)) {
      const insideEffectOrHandler = new RegExp(
        `(?:useEffect|useCallback|useMemo|=>|function\\s+\\w+)\\s*(?:\\([^)]*\\)\\s*)?\\{[^}]*${setter}\\s*\\(`,
      ).test(body)
      if (!insideEffectOrHandler) {
        results.push({
          rule: 'set-state-in-render',
          message: `${setter}() appears to be called directly in the component render body. This causes infinite re-renders. Wrap in useEffect or move to an event handler.`,
          severity: 'error',
        })
      }
    }
  }
  return results
}

/**
 * .map() calls returning JSX without a key prop.
 */
function detectMissingKeys(code: string): ReactAntiPattern[] {
  const results: ReactAntiPattern[] = []
  const mapRe =
    /\.map\s*\(\s*(?:\([^)]*\)|[^=])\s*=>\s*(?:\(\s*)?(<[A-Z]\w*|<div|<li|<span|<tr|<td|<section|<article|<button|<a\b)/g
  let match: RegExpExecArray | null
  while ((match = mapRe.exec(code)) !== null) {
    const afterTag = code.slice(match.index, match.index + 300)
    const firstTagClose = afterTag.indexOf('>')
    if (firstTagClose === -1) continue
    const tagContent = afterTag.slice(0, firstTagClose)
    if (!/\bkey\s*=/.test(tagContent)) {
      results.push({
        rule: 'missing-key-prop',
        message: `JSX element in .map() is missing a "key" prop. Add a unique key={...} to the first element returned from .map().`,
        severity: 'warning',
      })
      break
    }
  }
  return results
}

export function detectReactAntiPatterns(tsxCode: string): ReactAntiPattern[] {
  if (!tsxCode || tsxCode.length < 20) return []
  return [
    ...detectHooksInConditionals(tsxCode),
    ...detectHooksInLoops(tsxCode),
    ...detectHooksInCallbacks(tsxCode),
    ...detectSetStateInRender(tsxCode),
    ...detectMissingKeys(tsxCode),
  ]
}
