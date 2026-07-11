import Script from 'next/script'
import { APP_THEME_STORAGE_KEY, buildAppThemeBootScript } from '@/lib/theme/app-theme'

/** Runs before hydration to minimize theme flash — keep key in sync with RootProviders. */
export function AppThemeBootScript() {
  return (
    <Script
      id="app-theme-boot"
      strategy="beforeInteractive"
      dangerouslySetInnerHTML={{ __html: buildAppThemeBootScript(APP_THEME_STORAGE_KEY) }}
    />
  )
}
