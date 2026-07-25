'use client'

import { useRouter } from 'next/navigation'
import { Briefcase, House } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { useShellStore, type ShellMenuMode } from './use-shell-store'

export function ShellMenuModeToggle() {
  const router = useRouter()
  const menuMode = useShellStore((s) => s.menuMode)
  const setMenuMode = useShellStore((s) => s.setMenuMode)

  const modes: { id: ShellMenuMode; label: string; icon: typeof House }[] = [
    { id: 'home', label: 'Home', icon: House },
    { id: 'work', label: 'Work', icon: Briefcase },
  ]

  return (
    <div className="mb-3">
      <div className="shell-menu-mode-toggle">
        {modes.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => {
              setMenuMode(id)
              if (id === 'home') {
                router.push('/home')
              }
            }}
            className={cn('shell-menu-mode-tab', menuMode === id && 'shell-menu-mode-tab-active')}
          >
            <Icon />
            <span>{label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
