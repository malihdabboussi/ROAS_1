import { getTheme } from '@/lib/themes/themes-api'
import type { PresentationBundle } from '@/lib/artifacts/artifact-types'
import { buildPresentationThemePaintScript } from './presentation-theme-paint-script.util'
import { buildPresentationTweakCss, normalizePresentationTweaks } from './presentation-theme-tweaks'

export interface PresentationResolvedRenderTheme {
  css: string
  fontsUrl: string | null
  themeId: string | null
  themeName: string | null
}

export async function resolvePresentationRenderTheme(
  bundle: PresentationBundle,
): Promise<PresentationResolvedRenderTheme> {
  const tweaks = normalizePresentationTweaks(
    (bundle.presentation.metadata as Record<string, unknown> | null | undefined)?.tweaks,
  )
  const themeId = tweaks.themeId ?? bundle.presentation.theme_id ?? null
  const theme = themeId ? await getTheme(themeId).catch(() => null) : null
  const { css, fontsUrl } = buildPresentationTweakCss({ ...tweaks, themeId }, theme, {
    applySlideChrome: false,
  })

  return {
    css,
    fontsUrl,
    themeId,
    themeName: theme?.name ?? null,
  }
}

export function injectPresentationRenderTheme(
  srcDoc: string,
  theme: Pick<PresentationResolvedRenderTheme, 'css' | 'fontsUrl'> | null,
): string {
  if (!theme?.css) return srcDoc

  const headInjection = [
    `<style id="vibey-tweaks-initial">${theme.css}</style>`,
    theme.fontsUrl
      ? `<link id="vibey-tweaks-fonts-initial" rel="stylesheet" href="${theme.fontsUrl}" />`
      : '',
  ]
    .filter(Boolean)
    .join('')

  const withHead = srcDoc.includes('</head>')
    ? srcDoc.replace('</head>', `${headInjection}</head>`)
    : `${headInjection}${srcDoc}`

  const paintScript = buildPresentationThemePaintScript()
  if (withHead.includes('</body>')) return withHead.replace('</body>', `${paintScript}</body>`)
  return `${withHead}${paintScript}`
}
