'use client'

import dynamic from 'next/dynamic'
import { DriveFileBrowserModal } from '@/components/media/DriveFileBrowserModal'
import { DropboxFileBrowserModal } from '@/components/media/DropboxFileBrowserModal'
import { MediaPickerModal } from '@/components/media/MediaPickerModal'
import { ThemeBrandingImportDialog } from '@/features/themes/components/ThemeBrandingImportDialog'
import { ThemeFileImportDialog } from '@/features/themes/components/ThemeFileImportDialog'
import type { Theme } from '@/features/themes/types'
import type { MediaAsset } from '@/lib/services/media-api'
import type { ThemeSettingsProps } from './theme-settings.types'
import { ThemeSettingsBrandPanel } from './ThemeSettingsBrandPanel'
import { ThemeSettingsColorsPanel } from './ThemeSettingsColorsPanel'
import { ThemeSettingsDesignPanel } from './ThemeSettingsDesignPanel'
import { ThemeSettingsEmptyState } from './ThemeSettingsEmptyState'
import { ThemeSettingsFontsPanel } from './ThemeSettingsFontsPanel'
import { ThemeSettingsHeader } from './ThemeSettingsHeader'
import { ThemeSettingsImagesPanel } from './ThemeSettingsImagesPanel'
import { ThemeSettingsInlineTabBar } from './ThemeSettingsInlineTabBar'
import { ThemeSettingsLogoPanel } from './ThemeSettingsLogoPanel'
import { ThemeSettingsSocialPanel } from './ThemeSettingsSocialPanel'
import { useThemeSettingsChrome } from './use-theme-settings-chrome'
import { useThemeSettingsData } from './use-theme-settings-data'

const VibeyLoadingOrb = dynamic(
  () => import('@/components/vibey/vibey-loading-orb').then((m) => m.VibeyLoadingOrb),
  { ssr: false },
)

export type { ThemeNavTab } from './theme-settings.types'

export function ThemeSettings({
  value,
  onChange,
  initialTab,
  onTabChange,
  showInlineTabs = false,
}: ThemeSettingsProps) {
  const data = useThemeSettingsData({ value, onChange })
  const chrome = useThemeSettingsChrome({ initialTab, onTabChange, showInlineTabs }, data)

  const handleCreateTheme = async () => {
    await data.handleCreateTheme()
    chrome.setShowSelector(false)
  }

  const handleSelectTheme = (theme: Theme) => {
    data.handleSelectTheme(theme)
    chrome.setShowSelector(false)
  }

  const applyThemeLogoFromAsset = (asset: MediaAsset) => {
    data.applyThemeLogoFromAsset(asset)
    chrome.setLogoAddMenuOpen(false)
    chrome.setShowLogoLibraryPicker(false)
  }

  const uploadThemeLogoFile = async (file: File) => {
    await data.uploadThemeLogoFile(file)
    chrome.setLogoAddMenuOpen(false)
  }

  if (data.isLoading || data.isLoadingTheme) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <VibeyLoadingOrb text="Loading your theme..." state="processing" size="md" />
      </div>
    )
  }

  if (!data.selectedTheme) {
    return (
      <ThemeSettingsEmptyState
        themes={data.themes}
        showSelector={chrome.showSelector}
        setShowSelector={chrome.setShowSelector}
        selectorRef={chrome.selectorRef}
        selectThemeButtonRef={chrome.selectThemeButtonRef}
        dropdownPos={chrome.dropdownPos}
        onCreateTheme={handleCreateTheme}
        onSelectTheme={handleSelectTheme}
      />
    )
  }

  const selected = data.selectedTheme

  return (
    <div className="@container space-y-spacing-4">
      <ThemeSettingsHeader
        colors={data.colors}
        name={data.name}
        setName={data.setName}
        selectedTheme={selected}
        isSaving={data.isSaving}
        isEditingThemeName={chrome.isEditingThemeName}
        setIsEditingThemeName={chrome.setIsEditingThemeName}
        themeNameInputRef={chrome.themeNameInputRef}
        themes={data.themes}
        showSelector={chrome.showSelector}
        setShowSelector={chrome.setShowSelector}
        selectorRef={chrome.selectorRef}
        changeButtonRef={chrome.changeButtonRef}
        dropdownPos={chrome.dropdownPos}
        onCreateTheme={handleCreateTheme}
        onSelectTheme={handleSelectTheme}
      />

      {selected.is_system && (
        <div className="p-spacing-3 rounded-spacing-2 bg-[var(--color-muted)]/50 border border-[var(--color-border)]">
          <p className="body-3 text-[var(--color-muted-foreground)]">
            System themes are read-only. Duplicate to customize.
          </p>
        </div>
      )}

      {showInlineTabs && (
        <ThemeSettingsInlineTabBar activeTab={chrome.activeTab} onTabChange={onTabChange} />
      )}

      <div className="pt-spacing-2">
        {chrome.activeTab === 'colors' && (
          <ThemeSettingsColorsPanel
            colors={data.colors}
            handleColorChange={data.handleColorChange}
            handleShuffle={data.handleShuffle}
            showImportDropdown={chrome.showImportDropdown}
            setShowImportDropdown={chrome.setShowImportDropdown}
            importDropdownRef={chrome.importDropdownRef}
            setShowWebsiteImport={chrome.setShowWebsiteImport}
            setShowFileImport={chrome.setShowFileImport}
          />
        )}

        {chrome.activeTab === 'fonts' && (
          <ThemeSettingsFontsPanel
            fontHeading={data.fontHeading}
            setFontHeading={data.setFontHeading}
            fontHeadingWeight={data.fontHeadingWeight}
            setFontHeadingWeight={data.setFontHeadingWeight}
            fontBody={data.fontBody}
            setFontBody={data.setFontBody}
            fontBodyWeight={data.fontBodyWeight}
            setFontBodyWeight={data.setFontBodyWeight}
          />
        )}

        {chrome.activeTab === 'logo' && (
          <ThemeSettingsLogoPanel
            selectedTheme={selected}
            logoUrl={data.logoUrl}
            logoAddMenuOpen={chrome.logoAddMenuOpen}
            setLogoAddMenuOpen={chrome.setLogoAddMenuOpen}
            logoAddMenuRef={chrome.logoAddMenuRef}
            logoFileInputRef={chrome.logoFileInputRef}
            logoDragDepth={chrome.logoDragDepth}
            isDraggingLogoFile={chrome.isDraggingLogoFile}
            setIsDraggingLogoFile={chrome.setIsDraggingLogoFile}
            setShowLogoLibraryPicker={chrome.setShowLogoLibraryPicker}
            setLogoAssetId={data.setLogoAssetId}
            setLogoUrl={data.setLogoUrl}
            uploadThemeLogoFile={uploadThemeLogoFile}
            openDrive={chrome.openDrive}
            openDropbox={chrome.openDropbox}
          />
        )}

        {chrome.activeTab === 'brand' && (
          <ThemeSettingsBrandPanel
            brandVoice={data.brandVoice}
            setBrandVoice={data.setBrandVoice}
            brandValues={data.brandValues}
            setBrandValues={data.setBrandValues}
          />
        )}

        {chrome.activeTab === 'social' && (
          <ThemeSettingsSocialPanel
            socialLinks={data.socialLinks}
            setSocialLinks={data.setSocialLinks}
          />
        )}

        {chrome.activeTab === 'design' && (
          <ThemeSettingsDesignPanel
            designSettings={data.designSettings}
            setDesignSettings={data.setDesignSettings}
          />
        )}

        {chrome.activeTab === 'images' && (
          <ThemeSettingsImagesPanel
            selectedTheme={selected}
            imageStylePrompt={data.imageStylePrompt}
            setImageStylePrompt={data.setImageStylePrompt}
            brandVoice={data.brandVoice}
            brandValues={data.brandValues}
            headshotImages={data.headshotImages}
            onUploadHeadshot={data.handleUploadHeadshot}
            onRemoveHeadshot={data.handleRemoveHeadshot}
            onUpdateHeadshot={data.handleUpdateHeadshot}
            productImages={data.productImages}
            onUploadProductImage={data.handleUploadProductImage}
            onRemoveProductImage={data.handleRemoveProductImage}
            onUpdateProductImage={data.handleUpdateProductImage}
          />
        )}
      </div>

      <DriveFileBrowserModal
        open={chrome.showDrivePicker}
        onClose={() => chrome.setShowDrivePicker(false)}
        context="chat"
        onSelectFileForChat={(file) => void uploadThemeLogoFile(file)}
      />
      <DropboxFileBrowserModal
        open={chrome.showDropboxPicker}
        onClose={() => chrome.setShowDropboxPicker(false)}
        context="chat"
        onSelectFileForChat={(file) => void uploadThemeLogoFile(file)}
      />
      <MediaPickerModal
        open={chrome.showLogoLibraryPicker}
        onClose={() => chrome.setShowLogoLibraryPicker(false)}
        onSelect={() => {}}
        onSelectAsset={(asset) => applyThemeLogoFromAsset(asset)}
      />

      <ThemeBrandingImportDialog
        open={chrome.showWebsiteImport}
        onClose={() => chrome.setShowWebsiteImport(false)}
        onImport={(imp) => {
          data.setColors(imp.colors)
          data.setFontHeading(imp.fontHeading)
          data.setFontBody(imp.fontBody)
          if (!data.name || data.name === selected?.name) {
            data.setName(imp.suggestedName)
          }
          if (imp.brandVoice) {
            data.setBrandVoice(imp.brandVoice)
          }
          if (imp.designSettings) {
            data.setDesignSettings(imp.designSettings)
          }
          chrome.setShowWebsiteImport(false)
        }}
      />
      <ThemeFileImportDialog
        open={chrome.showFileImport}
        onClose={() => chrome.setShowFileImport(false)}
        onImport={(imp) => {
          data.setColors(imp.colors)
          data.setFontHeading(imp.fontHeading)
          data.setFontBody(imp.fontBody)
          if (!data.name || data.name === selected?.name) {
            data.setName(imp.suggestedName)
          }
          chrome.setShowFileImport(false)
        }}
      />
    </div>
  )
}
