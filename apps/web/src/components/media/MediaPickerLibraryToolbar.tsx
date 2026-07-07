'use client'

import type { RefObject } from 'react'
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Cloud,
  FolderOpen,
  HardDrive,
  Link,
  Loader2,
  Plus,
  Search,
  Upload,
  X,
} from 'lucide-react'
import { CloudAttachMenuItems } from '@/components/media/CloudAttachMenuItems'
import { MEDIA_LIBRARY_FILE_INPUT_ACCEPT } from '@/components/media/drive-file-browser-modal.constants'
import {
  MEDIA_PICKER_CLOUD_ATTACH_ITEM_CLASS,
  TYPE_PILLS,
} from '@/components/media/media-picker-modal.constants'
import type { CampaignFilter, TypeFilter } from '@/components/media/media-picker-modal.types'

export function MediaPickerLibraryToolbar(options: {
  search: string
  setSearch: (v: string) => void
  typeFilter: TypeFilter
  setTypeFilter: (v: TypeFilter) => void
  campaignFilter: CampaignFilter
  setCampaignFilter: (v: CampaignFilter) => void
  isPillsExpanded: boolean
  setIsPillsExpanded: (v: boolean | ((p: boolean) => boolean)) => void
  scopeDropdownOpen: boolean
  setScopeDropdownOpen: (v: boolean | ((p: boolean) => boolean)) => void
  uploading: boolean
  uploadMenuOpen: boolean
  setUploadMenuOpen: (v: boolean | ((p: boolean) => boolean)) => void
  fileInputRef: RefObject<HTMLInputElement | null>
  uploadBtnRef: RefObject<HTMLButtonElement | null>
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  openDrive: () => void
  openDropbox: () => void
  onOpenUrlModal: () => void
}) {
  const {
    search,
    setSearch,
    typeFilter,
    setTypeFilter,
    campaignFilter,
    setCampaignFilter,
    isPillsExpanded,
    setIsPillsExpanded,
    scopeDropdownOpen,
    setScopeDropdownOpen,
    uploading,
    uploadMenuOpen,
    setUploadMenuOpen,
    fileInputRef,
    uploadBtnRef,
    onFileChange,
    openDrive,
    openDropbox,
    onOpenUrlModal,
  } = options

  return (
    <div className="mx-spacing-4 sm:mx-spacing-6 mb-spacing-2">
      <div className="card-glass-panel rounded-spacing-2 p-spacing-3 relative">
        <div className="flex items-center gap-2 md:hidden">
          <div className="relative min-w-0 flex-1">
            <Search className="icon-left-center icon-sm text-muted-foreground pointer-events-none z-10" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
              className="input-glass input-leading body-3 h-spacing-8 pr-spacing-3 w-full rounded-lg py-0"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="text-muted-foreground hover:text-foreground right-spacing-2 absolute top-1/2 -translate-y-1/2"
              >
                <X className="icon-sm" />
              </button>
            )}
          </div>
          <div className="relative" data-scope-dropdown>
            <button
              type="button"
              onClick={() => setScopeDropdownOpen((p) => !p)}
              className={`pill pill--sm flex items-center gap-1 ${typeFilter !== 'all' ? 'pill--active' : ''}`}
            >
              <span className="relative z-10">
                {typeFilter === 'all'
                  ? 'All'
                  : (TYPE_PILLS.find((p) => p.id === typeFilter)?.label ?? 'All')}
              </span>
              <ChevronDown className="icon-xs relative z-10" />
            </button>
            {scopeDropdownOpen && (
              <div
                className="dropdown-menu-solid rounded-spacing-2 p-spacing-2 absolute right-0 top-full z-50 mt-1 min-w-[140px]"
                data-scope-dropdown
              >
                <button
                  type="button"
                  onClick={() => {
                    setTypeFilter('all')
                    setScopeDropdownOpen(false)
                  }}
                  className={`body-3 rounded-spacing-1 px-spacing-2 py-spacing-2 w-full text-left ${typeFilter === 'all' ? 'dropdown-sort-option-selected text-muted-foreground' : 'text-muted-foreground hover:bg-hover-subtle hover:text-foreground'}`}
                >
                  All
                </button>
                {TYPE_PILLS.map((pill) => (
                  <button
                    key={pill.id}
                    type="button"
                    onClick={() => {
                      setTypeFilter(pill.id)
                      setScopeDropdownOpen(false)
                    }}
                    className={`body-3 rounded-spacing-1 px-spacing-2 py-spacing-2 w-full text-left ${typeFilter === pill.id ? 'dropdown-sort-option-selected text-muted-foreground' : 'text-muted-foreground hover:bg-hover-subtle hover:text-foreground'}`}
                  >
                    {pill.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="relative" data-scope-dropdown>
            <button
              type="button"
              onClick={() => setCampaignFilter(campaignFilter === 'current' ? 'all' : 'current')}
              className={`pill pill--sm ${campaignFilter === 'all' ? 'pill--active' : ''}`}
            >
              <span className="relative z-10">
                {campaignFilter === 'current' ? 'Campaign' : 'All media'}
              </span>
            </button>
          </div>
          <div className="relative">
            <button
              ref={uploadBtnRef}
              type="button"
              onClick={() => setUploadMenuOpen((p) => !p)}
              disabled={uploading}
              className="button-glass-blue h-spacing-8 px-spacing-2 flex shrink-0 items-center rounded-lg"
            >
              {uploading ? (
                <Loader2 className="icon-sm animate-spin" />
              ) : (
                <Plus className="icon-sm" />
              )}
            </button>
            {uploadMenuOpen && (
              <div className="dropdown-menu-solid z-dropdown rounded-spacing-2 absolute right-0 top-full mt-1 w-52 py-1">
                <CloudAttachMenuItems
                  onLocalUpload={() => fileInputRef.current?.click()}
                  onDrive={openDrive}
                  onDropbox={openDropbox}
                  onUrl={onOpenUrlModal}
                  onSelect={() => setUploadMenuOpen(false)}
                  localLabel="Upload to library"
                  driveLabel="Add from Google Drive"
                  dropboxLabel="Add from Dropbox"
                  urlLabel="Add from URL"
                  localIcon={<Upload className="h-4 w-4" />}
                  driveIcon={<HardDrive className="h-4 w-4" />}
                  dropboxIcon={<Cloud className="h-4 w-4" />}
                  urlIcon={<Link className="h-4 w-4" />}
                  itemClassName={MEDIA_PICKER_CLOUD_ATTACH_ITEM_CLASS}
                />
              </div>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={MEDIA_LIBRARY_FILE_INPUT_ACCEPT}
            className="hidden"
            onChange={onFileChange}
          />
        </div>

        <div className="gap-spacing-4 hidden items-center justify-between md:flex">
          <div className="gap-spacing-2 flex items-center">
            <button
              type="button"
              onClick={() => {
                setTypeFilter('all')
                setIsPillsExpanded(!isPillsExpanded)
              }}
              className={`pill pill--sm gap-spacing-1 flex items-center ${typeFilter === 'all' ? 'pill--active' : ''}`}
            >
              <span className="relative z-10 flex items-center gap-1">
                All
                {isPillsExpanded ? (
                  <ChevronLeft className="icon-xs" />
                ) : (
                  <ChevronRight className="icon-xs" />
                )}
              </span>
            </button>

            {isPillsExpanded &&
              TYPE_PILLS.map((pill) => (
                <button
                  key={pill.id}
                  type="button"
                  onClick={() => setTypeFilter(pill.id)}
                  className={`pill pill--sm ${typeFilter === pill.id ? 'pill--active' : ''}`}
                >
                  <span className="relative z-10">{pill.label}</span>
                </button>
              ))}
          </div>

          <div className="gap-spacing-2 relative flex items-center">
            <div className="relative">
              <Search className="icon-left-center icon-sm text-muted-foreground pointer-events-none z-10" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search media..."
                className="input-glass input-leading body-3 h-spacing-8 pr-spacing-3 w-48 rounded-lg py-0"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="text-muted-foreground hover:text-foreground right-spacing-2 absolute top-1/2 -translate-y-1/2"
                >
                  <X className="icon-sm" />
                </button>
              )}
            </div>

            <div className="relative" data-scope-dropdown>
              <button
                type="button"
                onClick={() => setScopeDropdownOpen((p) => !p)}
                className="button-glass-blue h-spacing-8 gap-spacing-1 px-spacing-3 flex items-center rounded-lg font-medium"
                title={campaignFilter === 'current' ? 'Campaign' : 'All media'}
              >
                <span className="relative z-10">
                  <FolderOpen className="icon-sm" />
                </span>
              </button>
              {scopeDropdownOpen && (
                <div
                  className="dropdown-menu-solid rounded-spacing-2 p-spacing-2 absolute right-0 top-full z-50 mt-1 min-w-[140px]"
                  data-scope-dropdown
                >
                  <button
                    type="button"
                    onClick={() => {
                      setCampaignFilter('current')
                      setScopeDropdownOpen(false)
                    }}
                    className={`body-3 rounded-spacing-1 px-spacing-2 py-spacing-2 w-full text-left ${campaignFilter === 'current' ? 'dropdown-sort-option-selected text-muted-foreground' : 'text-muted-foreground hover:bg-hover-subtle hover:text-foreground'}`}
                  >
                    Campaign
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCampaignFilter('all')
                      setScopeDropdownOpen(false)
                    }}
                    className={`body-3 rounded-spacing-1 px-spacing-2 py-spacing-2 w-full text-left ${campaignFilter === 'all' ? 'dropdown-sort-option-selected text-muted-foreground' : 'text-muted-foreground hover:bg-hover-subtle hover:text-foreground'}`}
                  >
                    All media
                  </button>
                </div>
              )}
            </div>

            <div className="relative">
              <button
                ref={uploadBtnRef}
                type="button"
                onClick={() => setUploadMenuOpen((p) => !p)}
                disabled={uploading}
                className="button-glass-blue h-spacing-8 gap-spacing-1 px-spacing-3 flex items-center rounded-lg font-medium"
              >
                <span className="relative z-10">
                  {uploading ? (
                    <Loader2 className="icon-sm animate-spin" />
                  ) : (
                    <Plus className="icon-sm" />
                  )}
                </span>
              </button>
              {uploadMenuOpen && (
                <div className="dropdown-menu-solid z-dropdown rounded-spacing-2 absolute right-0 top-full mt-1 w-52 py-1">
                  <CloudAttachMenuItems
                    onLocalUpload={() => fileInputRef.current?.click()}
                    onDrive={openDrive}
                    onDropbox={openDropbox}
                    onUrl={onOpenUrlModal}
                    onSelect={() => setUploadMenuOpen(false)}
                    localLabel="Upload to library"
                    driveLabel="Add from Google Drive"
                    dropboxLabel="Add from Dropbox"
                    urlLabel="Add from URL"
                    localIcon={<Upload className="h-4 w-4" />}
                    driveIcon={<HardDrive className="h-4 w-4" />}
                    dropboxIcon={<Cloud className="h-4 w-4" />}
                    urlIcon={<Link className="h-4 w-4" />}
                    itemClassName={MEDIA_PICKER_CLOUD_ATTACH_ITEM_CLASS}
                  />
                </div>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={MEDIA_LIBRARY_FILE_INPUT_ACCEPT}
              className="hidden"
              onChange={onFileChange}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
