import type React from 'react'
import { RxDoubleArrowRight } from 'react-icons/rx'
import {
  Brain,
  Cloud,
  FolderOpen,
  HardDrive,
  ImagePlus,
  Pencil,
  RefreshCw,
  Undo2,
  Upload,
} from 'lucide-react'
import { CloudAttachMenuItems } from '@/components/media/CloudAttachMenuItems'
import { DriveFileBrowserModal } from '@/components/media/DriveFileBrowserModal'
import { DropboxFileBrowserModal } from '@/components/media/DropboxFileBrowserModal'
import { MediaPickerModal } from '@/components/media/MediaPickerModal'
import { VibeyChatOrb } from '@/components/vibey/vibey-chat-orb'
import { VibeyLoadingSphereSimple } from '@/components/vibey/vibey-loading-sphere-simple'
import { updateAgentImage } from '@/features/mission-control/services/missions.service'
import type { MissionAgent } from '@/features/mission-control/types'
import { cn } from '@/lib/utils/cn'
import { openInNewTab } from '@/lib/utils/open-in-new-tab'
import { STATUS_BADGES } from '../../../constants/team.constants'
import { AgentInfoEditableName } from './AgentInfoEditableName'
import { useAgentInfoPanelPortrait } from './useAgentInfoPanelPortrait'

type Portrait = ReturnType<typeof useAgentInfoPanelPortrait>

const SQUARE_SHELL =
  'surface-bg h-[5.5rem] w-[5.5rem] shrink-0 overflow-hidden rounded-xl border border-border'

const MENU_ROW =
  'gap-spacing-2 px-spacing-3 py-spacing-2 body-3 flex w-full items-center text-left text-[var(--color-foreground)] transition-colors hover:bg-[var(--color-secondary)]'

const PORTRAIT_HEADER_ACTION_TRANSITION = 'transition-[opacity,transform] duration-200 ease-out'

const PORTRAIT_COLLAPSE_BUTTON_CLASS =
  'text-muted-foreground hover:text-foreground h-spacing-8 w-spacing-8 rounded-spacing-2 flex shrink-0 items-center justify-center'

export function AgentInfoPanelPortraitSection(props: {
  selected: MissionAgent | null
  generatingAvatarIds: Set<string>
  setAgents: React.Dispatch<React.SetStateAction<MissionAgent[]>>
  portrait: Portrait
  level: string
  isSystemLikeAgent: boolean
  setNameValue: React.Dispatch<React.SetStateAction<string>>
  handleNameSave: () => Promise<void>
  statusBadgeText: string | null
  lastActiveLabel: string | null
  onRequestCollapse?: () => void
}) {
  const {
    selected,
    generatingAvatarIds,
    setAgents,
    portrait,
    level,
    isSystemLikeAgent,
    setNameValue,
    handleNameSave,
    statusBadgeText,
    lastActiveLabel,
    onRequestCollapse,
  } = props

  const {
    previousImageRef,
    imageAddMenuRef,
    portraitFileInputRef,
    emptyPortraitDragDepth,
    imageAddMenuOpen,
    setImageAddMenuOpen,
    showLibraryPicker,
    setShowLibraryPicker,
    isDraggingPortraitFile,
    setIsDraggingPortraitFile,
    showDrivePicker,
    setShowDrivePicker,
    showDropboxPicker,
    setShowDropboxPicker,
    openDrive,
    openDropbox,
    mediaPickerCampaignId,
    applyAgentPortraitUrl,
    uploadPortraitFile,
    canSetPortraitImage,
    showEmptyPortraitDropZone,
    showSelectedVibeyAnimation,
    handleGeneratePortrait,
  } = portrait

  const portraitMenuEligible =
    !!selected &&
    !generatingAvatarIds.has(selected.id) &&
    !showSelectedVibeyAnimation &&
    (!!selected.image_url || !!canSetPortraitImage)

  const showRevert =
    !!selected &&
    !generatingAvatarIds.has(selected.id) &&
    !!previousImageRef.current &&
    !!selected.image_url &&
    previousImageRef.current !== selected.image_url

  const portraitDropdown =
    portraitMenuEligible && selected && imageAddMenuOpen ? (
      <div
        className="dropdown-menu-solid absolute left-0 top-full z-[60] mt-1 w-52 py-1"
        role="menu"
      >
        <button
          type="button"
          role="menuitem"
          className={MENU_ROW}
          onClick={() => {
            previousImageRef.current = selected.image_url ?? null
            void handleGeneratePortrait()
            setImageAddMenuOpen(false)
          }}
        >
          <RefreshCw className="icon-sm shrink-0" />
          Regenerate portrait
        </button>
        {showRevert ? (
          <button
            type="button"
            role="menuitem"
            className={MENU_ROW}
            onClick={() => {
              const prev = previousImageRef.current
              if (!prev || !selected) return
              previousImageRef.current = null
              setAgents((agents) =>
                agents.map((a) => (a.id === selected.id ? { ...a, image_url: prev } : a)),
              )
              void updateAgentImage(selected.agent_key, prev).catch(() => null)
              setImageAddMenuOpen(false)
            }}
          >
            <Undo2 className="icon-sm shrink-0" />
            Revert to previous image
          </button>
        ) : null}
        {canSetPortraitImage ? <div className="border-border my-1 border-t" aria-hidden /> : null}
        {canSetPortraitImage ? (
          <>
            <button
              type="button"
              role="menuitem"
              className={MENU_ROW}
              onClick={() => {
                setShowLibraryPicker(true)
                setImageAddMenuOpen(false)
              }}
            >
              <FolderOpen className="icon-sm shrink-0" />
              From library
            </button>
            <button
              type="button"
              role="menuitem"
              className={MENU_ROW}
              onClick={() => {
                portraitFileInputRef.current?.click()
                setImageAddMenuOpen(false)
              }}
            >
              <Upload className="icon-sm shrink-0" />
              Upload from device
            </button>
            <CloudAttachMenuItems
              onDrive={() => void openDrive()}
              onDropbox={() => void openDropbox()}
              onSelect={() => setImageAddMenuOpen(false)}
              driveIcon={<HardDrive className="icon-sm shrink-0" />}
              dropboxIcon={<Cloud className="icon-sm shrink-0" />}
              itemClassName={MENU_ROW}
            />
          </>
        ) : null}
      </div>
    ) : null

  /** Full-size transparent hit target when the avatar is a flat image (no drag layer). */
  const portraitInsetTrigger =
    portraitMenuEligible && selected ? (
      <>
        <button
          type="button"
          aria-label="Portrait options"
          aria-expanded={imageAddMenuOpen}
          aria-haspopup="menu"
          className="absolute inset-0 z-[1] cursor-pointer border-0 bg-transparent p-0 outline-none"
          onClick={() => setImageAddMenuOpen((o) => !o)}
        />
        <div className="pointer-events-none absolute inset-0 z-[2] flex items-center justify-center bg-black/50 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
          <Pencil
            className="h-5 w-5 text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.95)]"
            aria-hidden
          />
        </div>
      </>
    ) : null

  const squarePortrait =
    selected &&
    (generatingAvatarIds.has(selected.id) ? (
      <div className={SQUARE_SHELL}>
        <div className="flex h-full w-full items-center justify-center bg-surface-subtle">
          <div className="scale-90">
            <VibeyChatOrb state="processing" style="elastic" />
          </div>
        </div>
      </div>
    ) : selected.image_url ? (
      <div
        ref={imageAddMenuRef}
        className={cn('relative shrink-0', portraitMenuEligible && 'group')}
      >
        <div className={cn(SQUARE_SHELL, 'relative')}>
          <img
            src={selected.image_url}
            alt={selected.name}
            className="h-full w-full object-cover object-top"
          />
          {portraitInsetTrigger}
        </div>
        {portraitDropdown}
      </div>
    ) : (
      <div
        ref={portraitMenuEligible ? imageAddMenuRef : undefined}
        className={cn('relative shrink-0', portraitMenuEligible && 'group')}
      >
        <div className={cn(SQUARE_SHELL, 'relative')}>
          <div
            className={cn(
              'flex h-full min-h-full w-full flex-col items-center justify-center gap-1 bg-surface-subtle p-1',
              portraitMenuEligible && !imageAddMenuOpen ? 'cursor-pointer' : '',
              showEmptyPortraitDropZone && isDraggingPortraitFile ? 'ring-primary/40 ring-2' : '',
            )}
            onDragEnter={
              showEmptyPortraitDropZone
                ? (e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    emptyPortraitDragDepth.current += 1
                    setIsDraggingPortraitFile(true)
                  }
                : undefined
            }
            onDragLeave={
              showEmptyPortraitDropZone
                ? (e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    emptyPortraitDragDepth.current -= 1
                    if (emptyPortraitDragDepth.current <= 0) {
                      emptyPortraitDragDepth.current = 0
                      setIsDraggingPortraitFile(false)
                    }
                  }
                : undefined
            }
            onDragOver={
              showEmptyPortraitDropZone
                ? (e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    e.dataTransfer.dropEffect = 'copy'
                  }
                : undefined
            }
            onDrop={
              showEmptyPortraitDropZone
                ? (e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    emptyPortraitDragDepth.current = 0
                    setIsDraggingPortraitFile(false)
                    const file = e.dataTransfer.files?.[0]
                    if (file) void uploadPortraitFile(file)
                  }
                : undefined
            }
            onClick={
              portraitMenuEligible
                ? () => {
                    if (!isDraggingPortraitFile) setImageAddMenuOpen((o) => !o)
                  }
                : undefined
            }
            onKeyDown={
              portraitMenuEligible
                ? (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      if (!isDraggingPortraitFile) setImageAddMenuOpen((o) => !o)
                    }
                  }
                : undefined
            }
            role={portraitMenuEligible ? 'button' : undefined}
            tabIndex={portraitMenuEligible ? 0 : undefined}
            aria-label={portraitMenuEligible ? 'Portrait options' : undefined}
            aria-expanded={portraitMenuEligible ? imageAddMenuOpen : undefined}
            aria-haspopup={portraitMenuEligible ? 'menu' : undefined}
          >
            {showSelectedVibeyAnimation ? (
              <div className="flex h-8 w-8 items-center justify-center">
                <VibeyLoadingSphereSimple size="small" state="idle" showBackground={false} />
              </div>
            ) : portraitMenuEligible ? null : (
              <>
                <button
                  type="button"
                  onClick={() => {
                    previousImageRef.current = selected?.image_url ?? null
                    void handleGeneratePortrait()
                  }}
                  className="btn-icon-glass btn-icon-glass-sm rounded-spacing-3 flex h-9 w-9 shrink-0 items-center justify-center"
                  title="Generate portrait"
                >
                  <ImagePlus className="icon-sm" />
                </button>
                {showEmptyPortraitDropZone ? (
                  <span className="body-4 text-muted-foreground/80 line-clamp-2 px-1 text-center leading-tight">
                    Tap or drop image
                  </span>
                ) : null}
              </>
            )}
          </div>
          {portraitMenuEligible ? (
            <div className="pointer-events-none absolute inset-0 z-[1] flex items-center justify-center rounded-xl bg-black/50 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
              <Pencil
                className="h-5 w-5 text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.95)]"
                aria-hidden
              />
            </div>
          ) : null}
        </div>
        {portraitDropdown}
      </div>
    ))

  return (
    <>
      {selected ? (
        <div className="px-spacing-3 pb-spacing-3 pt-spacing-3 shrink-0">
          <div className="gap-spacing-3 flex items-start">
            {squarePortrait}
            <div className="min-w-0 flex-1 pt-0.5">
              <AgentInfoEditableName
                selected={selected}
                level={level}
                isSystemLikeAgent={isSystemLikeAgent}
                setNameValue={setNameValue}
                handleNameSave={handleNameSave}
              />
              {selected.role ? (
                <p className="body-3 text-muted-foreground mt-1 truncate">{selected.role}</p>
              ) : null}
              {lastActiveLabel ? (
                <p className="body-4 text-muted-foreground/50 mt-1">{lastActiveLabel}</p>
              ) : null}
            </div>
            <div
              className={cn(
                'h-spacing-8 relative flex shrink-0 items-center justify-end',
                onRequestCollapse ? 'min-w-[4.5rem] overflow-visible' : 'overflow-hidden',
              )}
            >
              {statusBadgeText ? (
                <span
                  className={cn(
                    STATUS_BADGES[selected.status] ?? STATUS_BADGES['offline'],
                    'badge-glass-sm',
                    PORTRAIT_HEADER_ACTION_TRANSITION,
                    onRequestCollapse &&
                      'group-hover:pointer-events-none group-hover:translate-x-4 group-hover:opacity-0',
                  )}
                >
                  {statusBadgeText}
                </span>
              ) : null}
              {onRequestCollapse ? (
                <div
                  className={cn(
                    'gap-spacing-1 absolute right-0 top-1/2 flex -translate-y-1/2 translate-x-4 items-center opacity-0',
                    PORTRAIT_HEADER_ACTION_TRANSITION,
                    'pointer-events-none group-hover:pointer-events-auto group-hover:translate-x-0 group-hover:opacity-100',
                  )}
                >
                  <button
                    type="button"
                    onClick={() => {
                      const scope = `agent:${selected.agent_key}`
                      openInNewTab(`/brain?scope=${encodeURIComponent(scope)}`)
                    }}
                    className={PORTRAIT_COLLAPSE_BUTTON_CLASS}
                    aria-label="Open agent brain in new tab"
                    title="Agent brain"
                  >
                    <Brain className="icon-sm" aria-hidden />
                  </button>
                  <button
                    type="button"
                    onClick={onRequestCollapse}
                    className={PORTRAIT_COLLAPSE_BUTTON_CLASS}
                    aria-label="Collapse agent info"
                    title="Collapse agent info"
                  >
                    <RxDoubleArrowRight className="icon-sm" aria-hidden />
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      <input
        ref={portraitFileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) void uploadPortraitFile(file)
          e.target.value = ''
        }}
      />

      <DriveFileBrowserModal
        open={showDrivePicker}
        onClose={() => setShowDrivePicker(false)}
        context="chat"
        onSelectFileForChat={(file) => void uploadPortraitFile(file)}
      />
      <DropboxFileBrowserModal
        open={showDropboxPicker}
        onClose={() => setShowDropboxPicker(false)}
        context="chat"
        onSelectFileForChat={(file) => void uploadPortraitFile(file)}
      />
      <MediaPickerModal
        open={showLibraryPicker}
        onClose={() => setShowLibraryPicker(false)}
        onSelect={(url) => void applyAgentPortraitUrl(url)}
        campaignId={mediaPickerCampaignId}
      />
    </>
  )
}
