export type ThemeNavTab = 'colors' | 'fonts' | 'logo' | 'brand' | 'social' | 'design' | 'images'

export interface ThemeSettingsProps {
  value?: string | null
  onChange?: (themeId: string | null) => void
  initialTab?: ThemeNavTab
  onTabChange?: (tab: ThemeNavTab) => void
  /** When true, sidebar sub-nav is hidden; show inline tab bar for mobile */
  showInlineTabs?: boolean
}
