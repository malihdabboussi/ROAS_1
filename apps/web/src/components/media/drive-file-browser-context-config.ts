import type {
  DriveFileBrowserContext,
  DriveFileBrowserContextConfig,
} from '@/components/media/drive-file-browser-modal.types'

export function getDriveFileBrowserContextConfig(
  context: DriveFileBrowserContext,
): DriveFileBrowserContextConfig {
  switch (context) {
    case 'brain':
      return {
        selectLabel: 'Import to Brain',
        exportLabel: 'Export to ROAS',
        showSelect: true,
        showExport: false,
        showRename: false,
        showOpenInDrive: false,
        showMoreMenu: false,
      }
    case 'campaign_knowledge':
      return {
        selectLabel: 'Add to chat',
        exportLabel: 'Add to Campaign Knowledge',
        showSelect: false,
        showExport: true,
        showRename: false,
        showOpenInDrive: false,
        showMoreMenu: false,
      }
    case 'mission_inbox':
      return {
        selectLabel: 'Attach to Inbox',
        exportLabel: 'Export to ROAS',
        showSelect: true,
        showExport: false,
        showRename: false,
        showOpenInDrive: false,
        showMoreMenu: false,
      }
    case 'media_library':
      return {
        selectLabel: 'Add to library',
        exportLabel: 'Export to ROAS',
        showSelect: true,
        showExport: false,
        showRename: false,
        showOpenInDrive: false,
        showMoreMenu: false,
      }
    case 'ad_creative':
      return {
        selectLabel: 'Use for ad',
        exportLabel: 'Export to ROAS',
        showSelect: false,
        showExport: false,
        showRename: false,
        showOpenInDrive: true,
        showMoreMenu: false,
      }
    case 'spaces_docs':
      return {
        selectLabel: '',
        exportLabel: '',
        showSelect: false,
        showExport: false,
        showRename: false,
        showOpenInDrive: true,
        showMoreMenu: false,
      }
    case 'chat':
      return {
        selectLabel: 'Add to chat',
        exportLabel: 'Export to ROAS',
        showSelect: true,
        showExport: false,
        showRename: false,
        showOpenInDrive: true,
        showMoreMenu: false,
      }
  }
}
