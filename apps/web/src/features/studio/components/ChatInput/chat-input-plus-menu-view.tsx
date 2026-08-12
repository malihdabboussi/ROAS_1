import type { Ref } from 'react'
import {
  AtSign,
  Bot,
  Check,
  ChevronRight,
  Cloud,
  File,
  FolderOpen,
  Globe,
  Grid,
  HardDrive,
  Loader2,
  Paperclip,
  Plus,
  Puzzle,
  Settings2,
  ShieldCheck,
  Upload,
  UserRound,
  type LucideIcon,
} from 'lucide-react'
import { CloudAttachMenuItems } from '@/components/media/CloudAttachMenuItems'
import type { ShellCreateMenuItem } from '@/components/shell/shell-create-menu.config'
import { ShellCreateMenuPanel } from '@/components/shell/ShellCreateMenuPanel'
import Switch from '@/components/ui/forms/switch'
import type { StudioAtMenuTabId } from './chat-input-at-mentions'
import { INTEGRATION_ICONS, INTEGRATION_NAMES } from './chat-input-constants'
import { ChatInputPlusMenuSpacePanel } from './chat-input-plus-menu-space-panel'
import type { ChatInputPlusMenuSpacePickerConfig } from './chat-input-plus-menu-space.types'
import {
  COMPOSER_ACCESS_ROWS,
  composerPolicyRowLocked,
  composerPolicyRowState,
  type AgentToggle,
  type ComposerAccessRow,
  type ComposerPlusInfoCard,
  type ComposerPlusSubmenu,
  type ComposerPolicy,
} from './chat-input-policy'
import type { SlashItem } from './chat-input-slash-menu'

type ComposerPlusSubmenuId = Exclude<ComposerPlusSubmenu, null>
type FloatingPosition = { top: number; left: number }

const PLUS_MENU_ITEMS: Array<{
  id: ComposerPlusSubmenuId
  label: string
  icon: LucideIcon
}> = [
  { id: 'files', label: 'Add photos & files', icon: Paperclip },
  { id: 'attach', label: 'Attach', icon: AtSign },
  { id: 'integrations', label: 'Integrations', icon: Settings2 },
  { id: 'skills', label: 'Skills', icon: Puzzle },
  { id: 'access', label: 'Access', icon: ShieldCheck },
]

const ATTACH_MENU_ITEMS: Array<{
  id: StudioAtMenuTabId
  label: string
  icon: LucideIcon
}> = [
  { id: 'people', label: 'People', icon: UserRound },
  { id: 'tasks', label: 'Tasks', icon: Check },
  { id: 'artifacts', label: 'Artifacts', icon: FolderOpen },
  { id: 'media', label: 'Media', icon: File },
  { id: 'missions', label: 'Missions', icon: Bot },
  { id: 'campaigns', label: 'Campaigns', icon: Globe },
]

export interface ChatInputPlusMenuViewProps {
  menuRef?: Ref<HTMLDivElement>
  submenuRef?: Ref<HTMLDivElement>
  menuPosition: FloatingPosition
  submenu: ComposerPlusSubmenu
  submenuPosition: FloatingPosition
  infoCard: ComposerPlusInfoCard | null
  connectedProviders: string[]
  suggestedUnconnected: string[]
  agentToggles: AgentToggle[]
  allSlashItems: SlashItem[]
  skillDenyKeys: Set<string>
  skillTogglePending: string | null
  composerPolicy: ComposerPolicy | null
  composerPolicyLoading: boolean
  composerPolicyPending: string | null
  accessReadOnly: boolean
  spacePicker?: ChatInputPlusMenuSpacePickerConfig | null
  onSubmenuAnchorNode: (id: ComposerPlusSubmenuId, node: HTMLButtonElement | null) => void
  onOpenSubmenu: (submenu: ComposerPlusSubmenuId) => void
  onCancelSubmenuClose: () => void
  onScheduleSubmenuClose: () => void
  onLocalUpload: () => void
  onDrive: () => void
  onDropbox: () => void
  onSelectCreateItem: (item: ShellCreateMenuItem) => void
  onCloseMenu: () => void
  onOpenAtMenu: (tab: StudioAtMenuTabId) => void
  onToggleAgent: (provider: string, enabled: boolean) => void
  onConnectIntegration: (provider: string) => void
  onToggleSkill: (skillKey: string, enabled: boolean) => void
  onToggleAccess: (row: ComposerAccessRow, enabled: boolean) => void
  onShowInfoCard: (target: HTMLElement, title: string, description: string) => void
  onClearInfoCard: () => void
}

export function ChatInputPlusMenuView({
  menuRef,
  submenuRef,
  menuPosition,
  submenu,
  submenuPosition,
  infoCard,
  connectedProviders,
  suggestedUnconnected,
  agentToggles,
  allSlashItems,
  skillDenyKeys,
  skillTogglePending,
  composerPolicy,
  composerPolicyLoading,
  composerPolicyPending,
  accessReadOnly,
  spacePicker,
  onSubmenuAnchorNode,
  onOpenSubmenu,
  onCancelSubmenuClose,
  onScheduleSubmenuClose,
  onLocalUpload,
  onDrive,
  onDropbox,
  onSelectCreateItem,
  onCloseMenu,
  onOpenAtMenu,
  onToggleAgent,
  onConnectIntegration,
  onToggleSkill,
  onToggleAccess,
  onShowInfoCard,
  onClearInfoCard,
}: ChatInputPlusMenuViewProps) {
  const skillItems = allSlashItems.filter((item) => item.type === 'skill')
  const menuItems: Array<{ id: ComposerPlusSubmenuId; label: string; icon: LucideIcon }> = [
    ...(spacePicker ? [{ id: 'space' as const, label: 'Space', icon: Grid }] : []),
    ...PLUS_MENU_ITEMS,
  ]

  return (
    <>
      <div
        ref={menuRef}
        className="dropdown-menu-solid z-dropdown py-spacing-1 fixed w-56"
        style={{ top: menuPosition.top, left: menuPosition.left }}
        onMouseDown={(e) => e.stopPropagation()}
        onMouseEnter={onCancelSubmenuClose}
        onMouseLeave={onScheduleSubmenuClose}
      >
        <button
          ref={(node) => onSubmenuAnchorNode('create', node)}
          type="button"
          onMouseEnter={() => onOpenSubmenu('create')}
          className="body-3 text-foreground hover:bg-hover-subtle px-spacing-3 py-spacing-2 gap-spacing-2 flex w-full items-center text-left transition-colors"
        >
          <Plus className="icon-sm text-muted-foreground shrink-0" />
          <span className="min-w-0 flex-1 truncate">Create</span>
          <ChevronRight className="icon-xs text-muted-foreground shrink-0" />
        </button>
        {menuItems.map((item) => {
          const Icon = item.icon
          return (
            <button
              key={item.id}
              ref={(node) => onSubmenuAnchorNode(item.id, node)}
              type="button"
              onMouseEnter={() => onOpenSubmenu(item.id)}
              className="body-3 text-foreground hover:bg-hover-subtle px-spacing-3 py-spacing-2 gap-spacing-2 flex w-full items-center text-left transition-colors"
            >
              <Icon className="icon-sm text-muted-foreground shrink-0" />
              <span className="min-w-0 flex-1 truncate">{item.label}</span>
              <ChevronRight className="icon-xs text-muted-foreground shrink-0" />
            </button>
          )
        })}
      </div>
      {submenu ? (
        <div
          ref={submenuRef}
          className="dropdown-menu-solid z-dropdown py-spacing-1 fixed max-h-96 w-72 overflow-y-auto"
          style={{ top: submenuPosition.top, left: submenuPosition.left }}
          onMouseDown={(e) => e.stopPropagation()}
          onMouseEnter={onCancelSubmenuClose}
          onMouseLeave={onScheduleSubmenuClose}
        >
          {submenu === 'create' ? (
            <ShellCreateMenuPanel
              onSelectCreateItem={onSelectCreateItem}
              onCloseMenu={onCloseMenu}
            />
          ) : null}
          {submenu === 'space' && spacePicker ? (
            <ChatInputPlusMenuSpacePanel spacePicker={spacePicker} onCloseMenu={onCloseMenu} />
          ) : null}
          {submenu === 'files' ? (
            <CloudAttachMenuItems
              onLocalUpload={onLocalUpload}
              onDrive={onDrive}
              onDropbox={onDropbox}
              onSelect={onCloseMenu}
              localIcon={<Upload className="icon-sm" />}
              driveIcon={<HardDrive className="icon-sm" />}
              dropboxIcon={<Cloud className="icon-sm" />}
              itemClassName="body-3 text-foreground hover:bg-hover-subtle px-spacing-3 py-spacing-2 gap-spacing-2 flex w-full items-center text-left transition-colors"
            />
          ) : null}
          {submenu === 'attach'
            ? ATTACH_MENU_ITEMS.map((item) => {
                const Icon = item.icon
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      onCloseMenu()
                      onOpenAtMenu(item.id)
                    }}
                    className="body-3 text-foreground hover:bg-hover-subtle px-spacing-3 py-spacing-2 gap-spacing-2 flex w-full items-center text-left transition-colors"
                  >
                    <Icon className="icon-sm text-muted-foreground shrink-0" />
                    <span>{item.label}</span>
                  </button>
                )
              })
            : null}
          {submenu === 'integrations' ? (
            <>
              {connectedProviders.length === 0 && suggestedUnconnected.length === 0 ? (
                <p className="body-4 text-muted-foreground px-spacing-3 py-spacing-3">
                  No integrations connected yet.
                </p>
              ) : null}
              {connectedProviders.map((provider) => {
                const toggle = agentToggles.find((t) => t.integration_id === provider)
                const enabled = toggle ? toggle.agent_enabled : true
                return (
                  <div
                    key={provider}
                    className="px-spacing-3 py-spacing-2 gap-spacing-2 flex items-center justify-between"
                  >
                    <div className="gap-spacing-2 flex min-w-0 items-center">
                      {INTEGRATION_ICONS[provider] ? (
                        <img
                          src={INTEGRATION_ICONS[provider]}
                          alt=""
                          className="h-5 w-5 shrink-0 rounded object-contain"
                        />
                      ) : (
                        <Globe className="icon-sm text-muted-foreground shrink-0" />
                      )}
                      <span className="body-3 text-foreground min-w-0 truncate">
                        {INTEGRATION_NAMES[provider] ?? provider}
                      </span>
                    </div>
                    <Switch
                      checked={enabled}
                      onCheckedChange={(checked) => onToggleAgent(provider, checked)}
                    />
                  </div>
                )
              })}
              {suggestedUnconnected.length > 0 ? (
                <div className="border-border mt-spacing-1 pt-spacing-1 border-t">
                  {suggestedUnconnected.map((provider) => (
                    <div
                      key={provider}
                      className="px-spacing-3 py-spacing-2 gap-spacing-2 flex items-center justify-between"
                    >
                      <span className="body-3 text-muted-foreground min-w-0 truncate">
                        {INTEGRATION_NAMES[provider] ?? provider}
                      </span>
                      <button
                        type="button"
                        onClick={() => onConnectIntegration(provider)}
                        className="body-4 text-foreground hover:text-primary shrink-0 font-medium transition-colors"
                      >
                        Connect
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}
            </>
          ) : null}
          {submenu === 'skills' ? (
            <>
              {skillItems.length === 0 ? (
                <p className="body-4 text-muted-foreground px-spacing-3 py-spacing-3">
                  No skills found for this agent.
                </p>
              ) : null}
              {skillItems.map((item) => {
                const enabled = !skillDenyKeys.has(item.key)
                return (
                  <div
                    key={item.id}
                    onMouseEnter={(e) =>
                      onShowInfoCard(
                        e.currentTarget,
                        item.name,
                        item.description || 'No description.',
                      )
                    }
                    onMouseLeave={onClearInfoCard}
                    className="px-spacing-3 py-spacing-2 gap-spacing-3 hover:bg-hover-subtle flex items-center justify-between transition-colors"
                  >
                    <span className="body-3 text-foreground min-w-0 truncate">{item.name}</span>
                    <Switch
                      checked={enabled}
                      disabled={skillTogglePending === item.key}
                      onCheckedChange={(checked) => onToggleSkill(item.key, checked)}
                    />
                  </div>
                )
              })}
            </>
          ) : null}
          {submenu === 'access' ? (
            <>
              {composerPolicyLoading ? (
                <div className="body-4 text-muted-foreground px-spacing-3 py-spacing-4 gap-spacing-2 flex items-center justify-center">
                  <Loader2 className="icon-sm animate-spin" />
                  Loading access
                </div>
              ) : null}
              {!composerPolicyLoading && !composerPolicy ? (
                <p className="body-4 text-muted-foreground px-spacing-3 py-spacing-3">
                  Access is unavailable right now.
                </p>
              ) : null}
              {composerPolicy
                ? COMPOSER_ACCESS_ROWS.map((row) => {
                    const state = composerPolicyRowState(composerPolicy, row.kind, row.id)
                    const checked =
                      state === 'default' || state === 'inherited' || state === 'allow_extra'
                    const pending = composerPolicyPending === `${row.kind}:${row.id}`
                    const locked = composerPolicyRowLocked(composerPolicy, row.kind, row.id)
                    return (
                      <div
                        key={`${row.kind}:${row.id}`}
                        onMouseEnter={(e) =>
                          onShowInfoCard(e.currentTarget, row.label, row.description)
                        }
                        onMouseLeave={onClearInfoCard}
                        className="px-spacing-3 py-spacing-2 gap-spacing-3 hover:bg-hover-subtle flex items-center justify-between transition-colors"
                      >
                        <span className="body-3 text-foreground min-w-0 truncate">{row.label}</span>
                        <Switch
                          checked={checked}
                          disabled={accessReadOnly || pending || locked}
                          onCheckedChange={(next) => onToggleAccess(row, next)}
                        />
                      </div>
                    )
                  })
                : null}
            </>
          ) : null}
        </div>
      ) : null}
      {infoCard && (submenu === 'skills' || submenu === 'access') ? (
        <div
          className="dropdown-menu-solid z-dropdown px-spacing-3 py-spacing-2 max-w-spacing-72 pointer-events-none fixed"
          style={{ top: infoCard.top, left: infoCard.left }}
        >
          <p className="body-3 text-foreground font-semibold">{infoCard.title}</p>
          <p className="body-4 text-muted-foreground mt-spacing-1">{infoCard.description}</p>
        </div>
      ) : null}
    </>
  )
}
