'use client'

import { DriveFileBrowserModal } from '@/components/media/DriveFileBrowserModal'
import { DropboxFileBrowserModal } from '@/components/media/DropboxFileBrowserModal'
import { MediaPickerModal } from '@/components/media/MediaPickerModal'
import { ThemeBrandingImportDialog } from '../ThemeBrandingImportDialog'
import { ThemeFileImportDialog } from '../ThemeFileImportDialog'
import type { ThemeEditorDialogState } from './use-theme-editor-dialog-state'

export interface ThemeEditorDialogModalsProps {
  s: ThemeEditorDialogState
}

export function ThemeEditorDialogModals({ s }: ThemeEditorDialogModalsProps) {
  return (
    <>
      <DriveFileBrowserModal
        open={s.showDrivePicker}
        onClose={() => s.setShowDrivePicker(false)}
        context="chat"
        onSelectFileForChat={(file) => void s.uploadThemeLogoFile(file)}
      />
      <DropboxFileBrowserModal
        open={s.showDropboxPicker}
        onClose={() => s.setShowDropboxPicker(false)}
        context="chat"
        onSelectFileForChat={(file) => void s.uploadThemeLogoFile(file)}
      />
      <MediaPickerModal
        open={s.showLogoLibraryPicker}
        onClose={() => s.setShowLogoLibraryPicker(false)}
        onSelect={() => {}}
        onSelectAsset={(asset) => s.applyThemeLogoFromAsset(asset)}
      />

      <ThemeBrandingImportDialog
        open={s.showWebsiteImport}
        onClose={() => s.setShowWebsiteImport(false)}
        onImport={(data) => {
          s.setColors(data.colors)
          s.setFontHeading(data.fontHeading)
          s.setFontBody(data.fontBody)
          if (!s.name || s.name === s.theme?.name) {
            s.setName(data.suggestedName)
          }
          if (data.brandVoice) {
            s.setBrandVoice(data.brandVoice)
          }
          if (data.designSettings) {
            s.setDesignSettings(data.designSettings)
          }
          s.setShowWebsiteImport(false)
        }}
      />
      <ThemeFileImportDialog
        open={s.showFileImport}
        onClose={() => s.setShowFileImport(false)}
        onImport={(data) => {
          s.setColors(data.colors)
          s.setFontHeading(data.fontHeading)
          s.setFontBody(data.fontBody)
          if (!s.name || s.name === s.theme?.name) {
            s.setName(data.suggestedName)
          }
          s.setShowFileImport(false)
        }}
      />
    </>
  )
}
