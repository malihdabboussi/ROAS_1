import type { Theme } from '../../types'

export type ThemeEditorNavTab =
  | 'colors'
  | 'fonts'
  | 'logo'
  | 'brand'
  | 'social'
  | 'design'
  | 'images'

export interface ThemeEditorDialogProps {
  open: boolean
  onClose: () => void
  onSave: (savedTheme?: Theme) => void
  theme?: Theme
}
