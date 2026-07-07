/**
 * Caret viewport rect for a <textarea> — mirror div aligned to the field, synced scroll,
 * then measure the span at the caret. Used to anchor floating UI (e.g. slash menu) to the active line.
 */

import type { RefObject } from 'react'
import type { VirtualElement } from '@floating-ui/react-dom'

/** Active `/query` token at caret: `/` at line/word start (after whitespace or BOF), no spaces before cursor. */
export function getSlashTokenAtCursor(
  text: string,
  cursor: number,
): { from: number; query: string } | null {
  const c = Math.min(Math.max(0, cursor), text.length)
  let start = c
  while (start > 0 && !/\s/.test(text[start - 1]!)) {
    start -= 1
  }
  const segment = text.slice(start, c)
  if (!segment.startsWith('/')) return null
  return { from: start, query: segment.slice(1) }
}

/** Active `@query` token at caret: `@` at line/word start (after whitespace or BOF), no spaces before cursor. */
export function getAtTokenAtCursor(
  text: string,
  cursor: number,
): { from: number; query: string } | null {
  const c = Math.min(Math.max(0, cursor), text.length)
  let start = c
  while (start > 0 && !/\s/.test(text[start - 1]!)) {
    start -= 1
  }
  const segment = text.slice(start, c)
  if (!segment.startsWith('@')) return null
  return { from: start, query: segment.slice(1) }
}

const MIRROR_STYLE_PROPS = [
  'direction',
  'boxSizing',
  'overflowX',
  'overflowY',
  'borderTopWidth',
  'borderRightWidth',
  'borderBottomWidth',
  'borderLeftWidth',
  'borderStyle',
  'paddingTop',
  'paddingRight',
  'paddingBottom',
  'paddingLeft',
  'fontStyle',
  'fontVariant',
  'fontWeight',
  'fontStretch',
  'fontSize',
  'fontSizeAdjust',
  'lineHeight',
  'fontFamily',
  'textAlign',
  'textTransform',
  'textIndent',
  'textDecoration',
  'letterSpacing',
  'wordSpacing',
  'wordBreak',
  'overflowWrap',
  'tabSize',
] as const

function parsePx(value: string): number {
  const n = parseInt(value, 10)
  return Number.isFinite(n) ? n : 0
}

export function getTextareaCaretViewportRect(
  element: HTMLTextAreaElement,
  position: number,
): { top: number; left: number; width: number; height: number } | null {
  if (typeof window === 'undefined') return null

  const pos = Math.min(Math.max(0, position), element.value.length)
  const taRect = element.getBoundingClientRect()
  const computed = window.getComputedStyle(element)
  const div = document.createElement('div')
  const s = div.style

  s.position = 'fixed'
  s.top = `${taRect.top}px`
  s.left = `${taRect.left}px`
  s.width = `${element.clientWidth}px`
  // Must fit full wrapped content; matching only clientHeight clips lines below the fold and
  // yields wrong or collapsed getBoundingClientRect() for the caret span (menu jumps to y≈0).
  const mirrorContentHeight = Math.max(element.clientHeight, element.scrollHeight)
  s.height = `${mirrorContentHeight}px`
  s.overflow = 'hidden'
  s.whiteSpace = 'pre-wrap'
  s.wordWrap = 'break-word'
  s.visibility = 'hidden'
  s.pointerEvents = 'none'
  s.zIndex = '-1'

  for (const prop of MIRROR_STYLE_PROPS) {
    const k = prop as keyof CSSStyleDeclaration
    ;(s as unknown as Record<string, string>)[prop] = String(computed[k] ?? '')
  }

  const isFirefox = 'mozInnerScreenX' in window
  if (isFirefox && element.scrollHeight > parseInt(computed.height, 10)) {
    s.overflowY = 'scroll'
  }

  div.textContent = element.value.slice(0, pos)
  const span = document.createElement('span')
  span.textContent = element.value.slice(pos) || '.'
  div.appendChild(span)
  document.body.appendChild(div)

  div.scrollTop = element.scrollTop
  div.scrollLeft = element.scrollLeft

  const br = span.getBoundingClientRect()
  document.body.removeChild(div)

  if (!Number.isFinite(br.top) || !Number.isFinite(br.left)) return null
  // Reject measurements that clearly left the textarea’s on-screen box (mirror/layout glitches).
  if (br.top + br.height < taRect.top - 4 || br.top > taRect.bottom + 4) return null

  const lineHeight = parsePx(computed.lineHeight) || br.height || 20

  return {
    top: br.top,
    left: br.left,
    width: 0,
    height: Math.max(lineHeight, br.height || 0),
  }
}

/** Floating UI virtual reference: caret line for `/token` slash menus; `contextElement` = textarea for scroll/update. */
export function createTextareaSlashCaretVirtualElement(
  textareaRef: RefObject<HTMLTextAreaElement | null>,
): VirtualElement {
  return {
    get contextElement() {
      return textareaRef.current ?? undefined
    },
    getBoundingClientRect() {
      const ta = textareaRef.current
      if (!ta) {
        return new DOMRect(0, 0, 0, 0)
      }
      const cursor = ta.selectionStart
      const tok = getSlashTokenAtCursor(ta.value, cursor)
      const isSlashToken = tok !== null
      const anchorPos = isSlashToken ? tok.from : cursor
      let caret = getTextareaCaretViewportRect(ta, anchorPos)
      if (!caret && isSlashToken) {
        caret = getTextareaCaretViewportRect(ta, cursor)
      }
      if (caret) {
        const h = Math.max(caret.height, 1)
        return new DOMRect(caret.left, caret.top, 0, h)
      }
      const rect = ta.getBoundingClientRect()
      return new DOMRect(rect.left, rect.bottom, rect.width, 0)
    },
  }
}

/** Floating UI virtual reference: caret line for `@token` at-mention menus. */
export function createTextareaAtCaretVirtualElement(
  textareaRef: RefObject<HTMLTextAreaElement | null>,
): VirtualElement {
  return {
    get contextElement() {
      return textareaRef.current ?? undefined
    },
    getBoundingClientRect() {
      const ta = textareaRef.current
      if (!ta) {
        return new DOMRect(0, 0, 0, 0)
      }
      const cursor = ta.selectionStart
      const tok = getAtTokenAtCursor(ta.value, cursor)
      const isAtToken = tok !== null
      const anchorPos = isAtToken ? tok.from : cursor
      let caret = getTextareaCaretViewportRect(ta, anchorPos)
      if (!caret && isAtToken) {
        caret = getTextareaCaretViewportRect(ta, cursor)
      }
      if (caret) {
        const h = Math.max(caret.height, 1)
        return new DOMRect(caret.left, caret.top, 0, h)
      }
      const rect = ta.getBoundingClientRect()
      return new DOMRect(rect.left, rect.bottom, rect.width, 0)
    },
  }
}
