import type { DocSubpagesDisplayMode } from '../types/doc-editor.types'

export const DOC_SUBPAGES_MODE_OPTIONS: {
  id: DocSubpagesDisplayMode
  menuLabel: string
  settingsLabel: string
}[] = [
  { id: 'off', menuLabel: 'Off', settingsLabel: 'Off' },
  { id: 'grid_sm', menuLabel: 'Small', settingsLabel: 'Small' },
  { id: 'grid_md', menuLabel: 'Medium', settingsLabel: 'Medium' },
  { id: 'grid_lg', menuLabel: 'Large', settingsLabel: 'Large' },
  { id: 'table', menuLabel: 'Table', settingsLabel: 'Table' },
]
