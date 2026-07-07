import type {
  DropboxFileBrowserContext,
  DropboxFileBrowserContextConfig,
} from '@/components/media/dropbox-file-browser-modal.types'

export function getDropboxFileBrowserContextConfig(
  context: DropboxFileBrowserContext,
): DropboxFileBrowserContextConfig {
  switch (context) {
    case 'brain':
      return {
        selectLabel: 'Import to Brain',
        exportLabel: 'Export to Vibey',
        showSelect: true,
        showExport: false,
        showShare: false,
        showDelete: false,
      }
    case 'campaign_knowledge':
      return {
        selectLabel: 'Add to chat',
        exportLabel: 'Add to Campaign Knowledge',
        showSelect: false,
        showExport: true,
        showShare: false,
        showDelete: false,
      }
    case 'mission_inbox':
      return {
        selectLabel: 'Attach to Inbox',
        exportLabel: 'Export to Vibey',
        showSelect: true,
        showExport: false,
        showShare: false,
        showDelete: false,
      }
    case 'media_library':
      return {
        selectLabel: 'Add to library',
        exportLabel: 'Export to Vibey',
        showSelect: true,
        showExport: false,
        showShare: false,
        showDelete: false,
      }
    case 'chat':
      return {
        selectLabel: 'Add to chat',
        exportLabel: 'Export to Vibey',
        showSelect: true,
        showExport: false,
        showShare: false,
        showDelete: false,
      }
  }
}
