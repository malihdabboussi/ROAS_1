'use client'

import dynamic from 'next/dynamic'
import { useEffect, useMemo, useState } from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import * as VisuallyHidden from '@radix-ui/react-visually-hidden'
import { ArrowLeft, BarChart2, Building2, CreditCard, Palette, User, X } from 'lucide-react'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import { useOrgStore } from '@/features/org/store/use-org-store'
import type { AccountSettingsSection } from '../contexts/AccountSettingsModalContext'

const DynamicLoadingFallback = () => (
  <div className="flex h-full items-center justify-center">
    <VibeyLoadingOrb state="processing" size="sm" />
  </div>
)

const ProfilePageContent = dynamic(
  () => import('../components/settings-content/ProfilePageContent'),
  {
    ssr: false,
    loading: DynamicLoadingFallback,
  },
)
const BillingPageContent = dynamic(
  () => import('../components/settings-content/BillingPageContent'),
  {
    ssr: false,
    loading: DynamicLoadingFallback,
  },
)
const UsagePageContent = dynamic(() => import('../components/settings-content/UsagePageContent'), {
  ssr: false,
  loading: DynamicLoadingFallback,
})
const OrgSettingsContent = dynamic(
  () => import('../components/settings-content/OrgSettingsContent'),
  {
    ssr: false,
    loading: DynamicLoadingFallback,
  },
)
const AppearancePageContent = dynamic(
  () => import('../components/settings-content/AppearancePageContent'),
  {
    ssr: false,
    loading: DynamicLoadingFallback,
  },
)

interface NavItem {
  id: AccountSettingsSection
  label: string
  icon: React.ComponentType<{ className?: string }>
}

interface AccountSettingsModalProps {
  open: boolean
  onClose: () => void
  initialSection?: AccountSettingsSection
}

export function AccountSettingsModal({
  open,
  onClose,
  initialSection = 'profile',
}: AccountSettingsModalProps) {
  const [activeSection, setActiveSection] = useState<AccountSettingsSection>(initialSection)
  const [isMobile, setIsMobile] = useState(false)
  const { activeOrgId, hasMinRole, isOrgOnly } = useOrgStore()

  const showOrgTab = !!activeOrgId && hasMinRole('admin')

  const navItems = useMemo<NavItem[]>(() => {
    const items: NavItem[] = [
      { id: 'profile', label: 'Profile', icon: User },
      { id: 'appearance', label: 'Appearance', icon: Palette },
    ]
    if (!isOrgOnly) {
      items.push(
        { id: 'billing', label: 'Billing', icon: CreditCard },
        { id: 'usage', label: 'Usage', icon: BarChart2 },
      )
    }
    if (showOrgTab) {
      items.push({ id: 'organization', label: 'Organization', icon: Building2 })
    }
    return items
  }, [isOrgOnly, showOrgTab])

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)')
    const handler = () => setIsMobile(mq.matches)
    handler()
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  useEffect(() => {
    if (open) {
      const valid =
        (initialSection === 'organization' && !showOrgTab) ||
        (isOrgOnly && (initialSection === 'billing' || initialSection === 'usage'))
          ? 'profile'
          : initialSection
      setActiveSection(valid)
    }
  }, [isOrgOnly, open, initialSection, showOrgTab])

  const renderContent = () => {
    switch (activeSection) {
      case 'profile':
        return <ProfilePageContent />
      case 'appearance':
        return <AppearancePageContent />
      case 'billing':
        return isOrgOnly ? <ProfilePageContent /> : <BillingPageContent />
      case 'usage':
        return isOrgOnly ? <ProfilePageContent /> : <UsagePageContent />
      case 'organization':
        return showOrgTab ? <OrgSettingsContent /> : <ProfilePageContent />
      default:
        return <ProfilePageContent />
    }
  }

  if (!open) return null

  if (isMobile) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-[var(--color-background)]">
        <div className="flex items-center gap-3 px-3 pb-1 pt-3">
          <button
            type="button"
            onClick={onClose}
            className="chip-glass-neutral h-spacing-8 w-spacing-8 flex items-center justify-center rounded-lg"
            aria-label="Back"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <span className="body-2 min-w-0 flex-1 truncate text-center font-medium text-[var(--color-foreground)]">
            Account Settings
          </span>
          <div className="w-spacing-8" />
        </div>
        <div className="flex items-center justify-center gap-1 px-3 py-2">
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveSection(item.id)}
                className={`gap-spacing-2 h-spacing-8 rounded-spacing-3 flex items-center transition-all duration-[600ms] ease-in-out ${
                  activeSection === item.id
                    ? 'chip-glass-blue px-spacing-3'
                    : 'chip-glass-neutral px-spacing-2'
                }`}
              >
                <Icon className="h-4 w-4" />
                {activeSection === item.id && (
                  <span className="body-2 whitespace-nowrap font-semibold">{item.label}</span>
                )}
              </button>
            )
          })}
        </div>
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">{renderContent()}</div>
      </div>
    )
  }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="z-modal-backdrop-inert" />
        <DialogPrimitive.Content className="z-modal-layer-3 z-modal-dialog-root fixed inset-0 flex items-center justify-center overflow-visible">
          <VisuallyHidden.Root>
            <DialogPrimitive.Title>Account Settings</DialogPrimitive.Title>
          </VisuallyHidden.Root>

          <div
            className="z-modal-dialog-backdrop-fill"
            role="presentation"
            aria-hidden
            onClick={onClose}
          />

          <div className="p-spacing-4 pointer-events-none relative z-10 flex h-full min-h-0 w-full items-center justify-center">
            <div
              className="pointer-events-auto relative flex h-[90vh] w-full max-w-[1400px] items-start"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="surface-card wizard-container-border rounded-spacing-4 relative flex h-full w-full flex-col overflow-hidden">
                <div className="px-spacing-4 py-spacing-3 flex items-center justify-between">
                  <h2 className="typo-caption text-muted-foreground uppercase">Account Settings</h2>
                  <button type="button" onClick={onClose} className="btn-icon-bare">
                    <X className="icon-sm" />
                  </button>
                </div>

                <div className="flex flex-1 overflow-hidden">
                  <div className="hidden md:block">
                    <aside className="surface-card relative z-40 flex h-full w-[240px] flex-col">
                      <nav className="px-spacing-3 py-spacing-4 space-y-spacing-1 flex-1 overflow-y-auto">
                        {navItems.map((item) => {
                          const Icon = item.icon
                          const isActive = activeSection === item.id
                          return (
                            <button
                              key={item.id}
                              onClick={() => setActiveSection(item.id)}
                              className={`gap-spacing-2 px-spacing-3 py-spacing-2 body-2 group flex w-full items-center text-left font-medium transition-all duration-200 ${
                                isActive
                                  ? 'nav-glass-selected-purple nav-glass-text-purple'
                                  : 'text-muted-foreground nav-glass-hover-purple border border-transparent'
                              } rounded-spacing-2 relative`}
                            >
                              <Icon className="icon-sm" />
                              <span>{item.label}</span>
                            </button>
                          )
                        })}
                      </nav>
                    </aside>
                  </div>

                  <main className="surface-card rounded-tl-spacing-3 h-full min-w-0 flex-1 overflow-hidden">
                    <div className="surface-bg h-full overflow-auto">{renderContent()}</div>
                  </main>
                </div>
              </div>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
