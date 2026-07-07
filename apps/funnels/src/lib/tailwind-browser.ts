/**
 * Tailwind v4 in-browser compiler for user-generated funnel TSX (see Play CDN docs).
 * Must stay aligned with apps/funnels PostCSS Tailwind major version.
 */
export const TAILWIND_BROWSER_SCRIPT_SRC = 'https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4'

export function subscribeTailwindRuntimeReady(onReady: () => void): () => void {
  let done = false
  const finish = (scriptEl: HTMLScriptElement | null) => {
    if (done) return
    done = true
    if (scriptEl) scriptEl.setAttribute('data-vibey-tailwind-loaded', 'true')
    onReady()
  }

  const existingScript = document.querySelector(
    'script[data-vibey-tailwind-play-cdn]',
  ) as HTMLScriptElement | null

  if (existingScript) {
    if (existingScript.getAttribute('data-vibey-tailwind-loaded') === 'true') {
      finish(existingScript)
      return () => {}
    }
    const onLoadOrError = () => finish(existingScript)
    existingScript.addEventListener('load', onLoadOrError, { once: true })
    existingScript.addEventListener('error', onLoadOrError, { once: true })
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
      queueMicrotask(onLoadOrError)
    }
    return () => {
      existingScript.removeEventListener('load', onLoadOrError)
      existingScript.removeEventListener('error', onLoadOrError)
    }
  }

  const script = document.createElement('script')
  script.src = TAILWIND_BROWSER_SCRIPT_SRC
  script.async = true
  script.setAttribute('data-vibey-tailwind-play-cdn', 'true')
  const onLoadOrError = () => finish(script)
  script.addEventListener('load', onLoadOrError, { once: true })
  script.addEventListener('error', onLoadOrError, { once: true })
  document.head.appendChild(script)
  return () => {
    script.removeEventListener('load', onLoadOrError)
    script.removeEventListener('error', onLoadOrError)
  }
}
