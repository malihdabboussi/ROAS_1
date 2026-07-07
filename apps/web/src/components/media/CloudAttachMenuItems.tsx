import type { ReactNode } from 'react'

interface CloudAttachMenuItemsProps {
  onLocalUpload?: () => void
  onDrive: () => void
  onDropbox: () => void
  onUrl?: () => void
  onSelect?: () => void
  localLabel?: string
  driveLabel?: string
  dropboxLabel?: string
  urlLabel?: string
  localIcon?: ReactNode
  driveIcon?: ReactNode
  dropboxIcon?: ReactNode
  urlIcon?: ReactNode
  itemClassName: string
}

export function CloudAttachMenuItems({
  onLocalUpload,
  onDrive,
  onDropbox,
  onUrl,
  onSelect,
  localLabel = 'Upload (from local)',
  driveLabel = 'Add from Google Drive',
  dropboxLabel = 'Add from Dropbox',
  urlLabel = 'Add from URL',
  localIcon,
  driveIcon,
  dropboxIcon,
  urlIcon,
  itemClassName,
}: CloudAttachMenuItemsProps) {
  return (
    <>
      {onLocalUpload && (
        <button
          type="button"
          onClick={() => {
            onLocalUpload()
            onSelect?.()
          }}
          className={itemClassName}
        >
          {localIcon}
          {localLabel}
        </button>
      )}
      <button
        type="button"
        onClick={() => {
          void onDrive()
          onSelect?.()
        }}
        className={itemClassName}
      >
        {driveIcon}
        {driveLabel}
      </button>
      <button
        type="button"
        onClick={() => {
          void onDropbox()
          onSelect?.()
        }}
        className={itemClassName}
      >
        {dropboxIcon}
        {dropboxLabel}
      </button>
      {onUrl && (
        <button
          type="button"
          onClick={() => {
            onUrl()
            onSelect?.()
          }}
          className={itemClassName}
        >
          {urlIcon}
          {urlLabel}
        </button>
      )}
    </>
  )
}
