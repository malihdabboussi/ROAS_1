import {
  SHELL_CREATE_MENU_GROUPS,
  type ShellCreateMenuItem,
} from '@/components/shell/shell-create-menu.config'
import { cn } from '@/lib/utils/cn'

export function ChatInputPlusMenuCreatePanel({
  onSelectCreateItem,
  onCloseMenu,
}: {
  onSelectCreateItem: (item: ShellCreateMenuItem) => void
  onCloseMenu: () => void
}) {
  return (
    <>
      {SHELL_CREATE_MENU_GROUPS.map((group, groupIndex) => (
        <div key={group.id} className={cn(groupIndex > 0 && 'border-border mt-spacing-1 border-t')}>
          <p className="typo-caption text-muted-foreground px-spacing-3 pb-spacing-1 pt-spacing-2 font-medium uppercase tracking-wide">
            {group.label}
          </p>
          {group.items.map((item) => {
            const Icon = item.icon
            return (
              <button
                key={item.id}
                type="button"
                disabled={item.comingSoon}
                onClick={() => {
                  if (item.comingSoon) return
                  onCloseMenu()
                  onSelectCreateItem(item)
                }}
                className={cn(
                  'body-3 px-spacing-3 py-spacing-2 gap-spacing-2 flex w-full items-center text-left transition-colors',
                  item.comingSoon
                    ? 'text-muted-foreground cursor-default opacity-60'
                    : 'text-foreground hover:bg-hover-subtle',
                )}
              >
                <span
                  className={cn(
                    'p-spacing-1 flex shrink-0 items-center justify-center rounded-md',
                    item.glassClass,
                  )}
                >
                  <Icon className="icon-sm" aria-hidden />
                </span>
                <span className="min-w-0 flex-1 truncate">{item.label}</span>
                {item.comingSoon ? (
                  <span className="body-4 text-muted-foreground shrink-0">Soon</span>
                ) : item.hint ? (
                  <span className="body-4 text-muted-foreground shrink-0">{item.hint}</span>
                ) : null}
              </button>
            )
          })}
        </div>
      ))}
    </>
  )
}
