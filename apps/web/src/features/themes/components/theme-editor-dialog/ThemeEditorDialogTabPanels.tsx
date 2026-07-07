'use client'

import { DesignSettingsPanel } from '../design'
import { ImagesTab } from '../ImagesTab'
import { ThemeEditorBrandPanel } from './ThemeEditorBrandPanel'
import { ThemeEditorColorsPanel } from './ThemeEditorColorsPanel'
import { ThemeEditorFontsPanel } from './ThemeEditorFontsPanel'
import { ThemeEditorLogoPanel } from './ThemeEditorLogoPanel'
import { ThemeEditorSocialPanel } from './ThemeEditorSocialPanel'
import type { ThemeEditorDialogState } from './use-theme-editor-dialog-state'

export interface ThemeEditorDialogTabPanelsProps {
  s: ThemeEditorDialogState
}

export function ThemeEditorDialogTabPanels({ s }: ThemeEditorDialogTabPanelsProps) {
  return (
    <div className="p-spacing-4 sm:p-spacing-6 md:p-spacing-8 flex-1 overflow-y-auto">
      {s.activeTab === 'colors' && (
        <ThemeEditorColorsPanel
          colors={s.colors}
          handleColorChange={s.handleColorChange}
          handleShuffle={s.handleShuffle}
          showImportDropdown={s.showImportDropdown}
          setShowImportDropdown={s.setShowImportDropdown}
          importDropdownRef={s.importDropdownRef}
          setShowWebsiteImport={s.setShowWebsiteImport}
          setShowFileImport={s.setShowFileImport}
        />
      )}
      {s.activeTab === 'fonts' && (
        <ThemeEditorFontsPanel
          fontHeading={s.fontHeading}
          setFontHeading={s.setFontHeading}
          fontHeadingWeight={s.fontHeadingWeight}
          setFontHeadingWeight={s.setFontHeadingWeight}
          fontBody={s.fontBody}
          setFontBody={s.setFontBody}
          fontBodyWeight={s.fontBodyWeight}
          setFontBodyWeight={s.setFontBodyWeight}
        />
      )}
      {s.activeTab === 'logo' && (
        <ThemeEditorLogoPanel
          logoUrl={s.logoUrl}
          logoAddMenuOpen={s.logoAddMenuOpen}
          setLogoAddMenuOpen={s.setLogoAddMenuOpen}
          logoAddMenuRef={s.logoAddMenuRef}
          logoFileInputRef={s.logoFileInputRef}
          isDraggingLogoFile={s.isDraggingLogoFile}
          setIsDraggingLogoFile={s.setIsDraggingLogoFile}
          logoDragDepth={s.logoDragDepth}
          setShowLogoLibraryPicker={s.setShowLogoLibraryPicker}
          setLogoAssetId={s.setLogoAssetId}
          setLogoUrl={s.setLogoUrl}
          uploadThemeLogoFile={s.uploadThemeLogoFile}
          openDrive={s.openDrive}
          openDropbox={s.openDropbox}
        />
      )}
      {s.activeTab === 'brand' && (
        <ThemeEditorBrandPanel
          brandVoice={s.brandVoice}
          setBrandVoice={s.setBrandVoice}
          brandValues={s.brandValues}
          setBrandValues={s.setBrandValues}
        />
      )}
      {s.activeTab === 'social' && (
        <ThemeEditorSocialPanel socialLinks={s.socialLinks} setSocialLinks={s.setSocialLinks} />
      )}
      {s.activeTab === 'design' && (
        <DesignSettingsPanel value={s.designSettings} onChange={s.setDesignSettings} />
      )}
      {s.activeTab === 'images' && (
        <ImagesTab
          imageStylePrompt={s.imageStylePrompt}
          onChangeImageStylePrompt={s.setImageStylePrompt}
          brandVoice={s.brandVoice}
          brandValues={s.brandValues}
        />
      )}
    </div>
  )
}
