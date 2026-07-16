'use client'

import dynamic from 'next/dynamic'
import { useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowUpRight, Brain, Check, ChevronDown, FolderKanban, Globe, Plus } from 'lucide-react'
import { NewCampaignModal } from '@/components/layout/NewCampaignModal'
import { LucideIcon } from '@/components/ui/IconPicker'
import type { AnimationState } from '@/components/vibey/animation-states.config'
import {
  useWorkspaceSettingsModal,
  type WorkspaceSettingsSection,
} from '@/features/settings/contexts/WorkspaceSettingsModalContext'
import { createClient } from '@/lib/supabase/client'
import { useCampaignMode } from '../contexts/CampaignModeContext'
import { createCampaign, fetchCampaigns } from '../services/campaign.service'
import type { ChatModelSettings } from '../services/chat.service'
import type { Campaign, DocumentAttachment, MessageReference } from '../types'
import type { AttachedArtifact } from './chat/ArtifactAttachments'
import { ChatInput } from './ChatInput'

const VibeyLoadingSphereSimple = dynamic(
  () =>
    import('@/components/vibey/vibey-loading-sphere-simple').then(
      (m) => m.VibeyLoadingSphereSimple,
    ),
  { ssr: false },
)

interface StudioHomeProps {
  vibeyState: AnimationState
  onSend: (
    content: string,
    documents?: DocumentAttachment[],
    artifacts?: AttachedArtifact[],
    overrideCampaignId?: string,
    model?: string,
    references?: MessageReference[],
    modelSettings?: ChatModelSettings,
  ) => void
  isStreaming: boolean
  onStop: () => void
  disabled: boolean
}

const CAPABILITY_CHIPS = [
  {
    id: 'funnel',
    label: 'Build Funnel',
    icon: 'layers',
    suggestions: [
      'Build a lead magnet funnel to capture emails',
      'Create an opt-in funnel for my free guide',
      'Build a webinar registration funnel',
      'Design a high-converting sales page funnel',
      'Create a tripwire funnel with a low-ticket offer',
    ],
  },
  {
    id: 'offer',
    label: 'Build Offer',
    icon: 'gift',
    suggestions: [
      'Build an irresistible offer for my coaching program',
      'Create a value stack for my online course',
      'Design a limited-time bundle offer',
      'Build a high-ticket consulting offer',
      'Create a free + shipping physical product offer',
    ],
  },
  {
    id: 'ad',
    label: 'Create Ad',
    icon: 'megaphone',
    suggestions: [
      'Create a Facebook ad to promote my lead magnet',
      'Design a retargeting ad for warm audiences',
      'Build a carousel ad showcasing product features',
      'Create an Instagram story ad for brand awareness',
      'Write ad copy for a Black Friday promo',
    ],
  },
  {
    id: 'theme',
    label: 'Design Theme',
    icon: 'palette',
    suggestions: [
      'Design a modern, minimal brand theme',
      'Create a bold, high-energy visual identity',
      'Build a luxury brand theme with gold accents',
      'Design a clean SaaS-style theme',
      'Create a warm, coaching-brand theme',
    ],
  },
  {
    id: 'email',
    label: 'Email Sequence',
    icon: 'mail',
    suggestions: [
      'Write a 5-email welcome sequence for new leads',
      'Create an abandoned cart email series',
      'Build a launch sequence for my new course',
      'Write a re-engagement sequence for cold leads',
      'Create a post-purchase nurture sequence',
    ],
  },
  {
    id: 'lead-magnet',
    label: 'Lead Magnet',
    icon: 'magnet',
    suggestions: [
      'Create a PDF checklist lead magnet',
      'Build a free mini-course as a lead magnet',
      'Design a quiz funnel lead magnet',
      'Create a swipe file resource for my audience',
      'Build a free template pack lead magnet',
    ],
  },
  {
    id: 'avatar',
    label: 'Build Avatar',
    icon: 'user-circle',
    suggestions: [
      'Create a detailed buyer avatar for my coaching business',
      'Build an ideal customer profile for my SaaS',
      'Design a persona for course buyers aged 25-40',
      'Map out pain points and desires for my target market',
      'Create an avatar for small business owners',
    ],
  },
  {
    id: 'meta-publish',
    label: 'Publish to Meta',
    icon: 'send',
    suggestions: [
      'Publish my campaign ads to Meta',
      'Push my lead magnet ads to Facebook',
      'Publish retargeting ads to Instagram',
      'Deploy my ad set to Meta with audience targeting',
      'Publish all pending ads in this campaign',
    ],
  },
] as const

const INTEGRATION_ICONS: Record<string, string> = {
  meta: '/Integrations/Meta.png',
  stripe: '/Integrations/Stripe.png',
  paypal: '/Integrations/PayPal.png',
  github: '/Integrations/GitHub.png',
  google_drive: '/Integrations/GoogleDrive.png',
  dropbox: '/Integrations/Dropbox.png',
  calendly: '/Integrations/Calendly.png',
  gohighlevel: '/Integrations/GHL.png',
  fathom: '/Integrations/Fathom.png',
  fireflies: '/Integrations/Fireflies.png',
  slack: '/Integrations/Slack.png',
  linkedin: '/Integrations/LinkedIn.png',
  instagram: '/Integrations/Instagram.png',
  youtube: '/Integrations/YouTube.png',
  twitter: '/Integrations/Twitter.png',
  tiktok: '/Integrations/TikTok.png',
  google_analytics: '/Integrations/GoogleAnalytics.png',
  google_calendar: '/Integrations/GoogleCalendar.png',
  gmail: '/Integrations/Gmail.png',
  outlook: '/Integrations/Outlook.png',
  clickup: '/Integrations/ClickUp.png',
  notion: '/Integrations/Notion.png',
  facebook: '/Integrations/Facebook.png',
  reddit: '/Integrations/Reddit.png',
  mailchimp: '/Integrations/Mailchimp.png',
  kit: '/Integrations/Kit.png',
  hubspot: '/Integrations/HubSpot.png',
  salesforce: '/Integrations/Salesforce.png',
  zoom: '/Integrations/Zoom.png',
  google_ads: '/Integrations/GoogleAds.png',
  google_search_console: '/Integrations/GoogleSearchConsole.png',
  google_sheets: '/Integrations/GoogleSheets.png',
  google_docs: '/Integrations/GoogleDocs.png',
  canva: '/Integrations/Canva.png',
  vercel: '/Integrations/Vercel.png',
  active_campaign: '/Integrations/ActiveCampaign.png',
  whop: '/Integrations/Whop.png',
}
const STUDIO_INTEGRATION_PLACEHOLDER_PROVIDERS = [
  'meta',
  'stripe',
  'github',
  'google_drive',
  'slack',
  'linkedin',
  'instagram',
  'youtube',
] as const

const FEATURE_CARDS: {
  id: string
  title: string
  subtitle: string
  section: WorkspaceSettingsSection | null
}[] = [
  {
    id: 'brain',
    title: 'ROAS Brain',
    subtitle: 'Train ROAS on your business so every response is on-brand.',
    section: 'brain',
  },
  {
    id: 'domains',
    title: 'Custom Domains',
    subtitle: 'Publish funnels and pages on your own domain.',
    section: 'domains',
  },
  {
    id: 'email',
    title: 'Email Sender',
    subtitle: 'Send broadcasts and sequences from your verified domain.',
    section: 'email',
  },
  {
    id: 'agents',
    title: 'Multi-Agent Org',
    subtitle: 'Build a team of specialized agents working together.',
    section: null,
  },
]

function FeatureCardVisual({ id }: { id: string }) {
  if (id === 'brain') {
    return (
      <div className="relative ml-8 flex h-20 w-36 items-center justify-center">
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 144 80" fill="none">
          <path
            d="M32 28 L72 14"
            stroke="var(--color-primary)"
            strokeWidth="1"
            strokeDasharray="3 2"
            opacity="0.3"
          />
          <path
            d="M112 28 L72 14"
            stroke="var(--color-primary)"
            strokeWidth="1"
            strokeDasharray="3 2"
            opacity="0.3"
          />
          <path
            d="M32 28 L112 28"
            stroke="var(--color-primary)"
            strokeWidth="1"
            strokeDasharray="3 2"
            opacity="0.2"
          />
        </svg>
        <div className="absolute left-0 top-6 flex flex-col items-center">
          <div className="rounded-spacing-1 border-border flex h-10 w-10 items-center justify-center border bg-[var(--color-card)] shadow-sm">
            <Brain className="h-4 w-4 text-purple-400/60" />
          </div>
          <span className="text-muted-foreground mt-1 text-[6px] font-medium">Facts</span>
        </div>
        <div className="absolute left-1/2 top-0 flex -translate-x-1/2 flex-col items-center">
          <div className="rounded-spacing-1 border-border flex h-10 w-10 items-center justify-center border bg-[var(--color-card)] shadow-sm">
            <Brain className="h-4 w-4 text-indigo-400/60" />
          </div>
          <span className="text-muted-foreground mt-1 text-[6px] font-medium">Style</span>
        </div>
        <div className="absolute right-0 top-6 flex flex-col items-center">
          <div className="rounded-spacing-1 border-border flex h-10 w-10 items-center justify-center border bg-[var(--color-card)] shadow-sm">
            <Brain className="h-4 w-4 text-violet-400/60" />
          </div>
          <span className="text-muted-foreground mt-1 text-[6px] font-medium">Preferences</span>
        </div>
      </div>
    )
  }
  if (id === 'domains') {
    return null
  }
  if (id === 'email') {
    return null
  }
  return (
    <div className="ml-8 flex h-20 w-36 items-end gap-1.5">
      {[
        { label: 'To Do', color: 'bg-orange-500/60', cards: 3 },
        { label: 'In Progress', color: 'bg-blue-500/60', cards: 2 },
        { label: 'Done', color: 'bg-emerald-500/60', cards: 1 },
      ].map((col) => (
        <div key={col.label} className="flex flex-1 flex-col gap-1">
          <div className="flex items-center gap-0.5 px-0.5">
            <div className={`h-1 w-1 rounded-full ${col.color}`} />
            <span className="text-muted-foreground truncate text-[5px] font-medium">
              {col.label}
            </span>
          </div>
          <div className="flex flex-col gap-0.5">
            {[...Array(col.cards)].map((_, i) => (
              <div
                key={i}
                className="border-border rounded border bg-[var(--color-card)] p-1 shadow-sm"
              >
                <div className="bg-foreground/8 mb-0.5 h-0.5 w-full rounded-full" />
                <div className="bg-foreground/5 h-0.5 w-3/4 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export function StudioHome({ vibeyState, onSend, isStreaming, onStop, disabled }: StudioHomeProps) {
  const [firstName, setFirstName] = useState<string>('')
  const { openWorkspaceSettings } = useWorkspaceSettingsModal()
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const { activeCampaignId: _activeCampaignId } = useCampaignMode()
  const [pickedCampaignId, setPickedCampaignId] = useState<string | null>(null)
  const [campaignDropdownOpen, setCampaignDropdownOpen] = useState(false)
  const [showNewCampaignModal, setShowNewCampaignModal] = useState(false)
  const [moreDropdownOpen, setMoreDropdownOpen] = useState(false)
  const campaignDropdownRef = useRef<HTMLDivElement>(null)
  const campaignButtonRef = useRef<HTMLButtonElement>(null)
  const [campaignDropdownPos, setCampaignDropdownPos] = useState({ top: 0, left: 0 })
  const insertTextRef = useRef<((text: string) => void) | null>(null)
  const setTextRef = useRef<((text: string) => void) | null>(null)
  const moreDropdownRef = useRef<HTMLDivElement>(null)
  const searchParams = useSearchParams()
  const pendingMessage = useMemo(() => searchParams.get('message') ?? '', [searchParams])

  const [activeSlide, setActiveSlide] = useState(0)
  const [activeChipId, setActiveChipId] = useState<string | null>(null)

  const selectableCampaigns = useMemo(
    () =>
      campaigns.filter(
        (campaign) => (campaign.config as Record<string, unknown>)?.system_kind !== 'general',
      ),
    [campaigns],
  )

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      const meta = user.user_metadata as Record<string, unknown> | undefined
      const fullName =
        (meta?.full_name as string) ?? (meta?.name as string) ?? user.email?.split('@')[0] ?? ''
      setFirstName(fullName.split(' ')[0] ?? fullName)
    })
  }, [])

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % 4)
    }, 5000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    fetchCampaigns()
      .then((data) => {
        const sorted = [...data].sort(
          (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
        )
        setCampaigns(sorted)
      })
      .catch(() => setCampaigns([]))
  }, [])

  useLayoutEffect(() => {
    if (!campaignDropdownOpen || !campaignButtonRef.current) return
    const rect = campaignButtonRef.current.getBoundingClientRect()
    setCampaignDropdownPos({ top: rect.bottom + 8, left: rect.left })
  }, [campaignDropdownOpen])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node
      if (
        campaignDropdownOpen &&
        !campaignDropdownRef.current?.contains(target) &&
        !campaignButtonRef.current?.contains(target)
      )
        setCampaignDropdownOpen(false)
      if (moreDropdownRef.current && !moreDropdownRef.current.contains(target))
        setMoreDropdownOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [campaignDropdownOpen])

  const pickedCampaign = useMemo(
    () => selectableCampaigns.find((c) => c.id === pickedCampaignId) ?? null,
    [selectableCampaigns, pickedCampaignId],
  )

  const handleCampaignPick = useCallback((campaign: Campaign) => {
    setPickedCampaignId(campaign.id)
    setCampaignDropdownOpen(false)
  }, [])

  const handleCreateCampaign = useCallback(async (name: string, icon: string) => {
    const newCampaign = await createCampaign(name, icon)
    setCampaigns((prev) => [newCampaign, ...prev])
    setPickedCampaignId(newCampaign.id)
    setCampaignDropdownOpen(false)
  }, [])

  const handleChipSelect = useCallback((chipId: string) => {
    setActiveChipId(chipId)
  }, [])

  const handleSuggestionClick = useCallback((prompt: string) => {
    if (setTextRef.current) {
      setTextRef.current(prompt)
      return
    }
    insertTextRef.current?.(prompt)
  }, [])

  const activeChip = activeChipId ? CAPABILITY_CHIPS.find((c) => c.id === activeChipId) : null

  const handleSend = useCallback(
    (
      content: string,
      documents?: DocumentAttachment[],
      artifacts?: AttachedArtifact[],
      model?: string,
      references?: MessageReference[],
      modelSettings?: ChatModelSettings,
    ) => {
      onSend(
        content,
        documents,
        artifacts,
        pickedCampaignId ?? undefined,
        model,
        references,
        modelSettings,
      )
    },
    [pickedCampaignId, onSend],
  )

  const visibleIntegrationPlaceholders = STUDIO_INTEGRATION_PLACEHOLDER_PROVIDERS.slice(0, 5)
  const overflowCount = Math.max(0, STUDIO_INTEGRATION_PLACEHOLDER_PROVIDERS.length - 5)

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="md:scrollbar-thin relative flex min-h-0 flex-1 flex-col overflow-hidden md:overflow-y-auto">
        <div className="studio-home-hero-shell flex min-h-0 flex-1 flex-col">
          <div className="relative z-10 mx-auto flex w-full max-w-4xl flex-1 items-center justify-center px-2 md:px-8">
            <div className="p-spacing-2 md:p-spacing-8 mt-0 w-full max-w-3xl md:mt-6">
              <div className="mx-auto mb-6 h-36 w-36">
                <VibeyLoadingSphereSimple size="small" state={vibeyState} showBackground={true} />
              </div>
              <h1 className="title-h1 mb-8 text-center" suppressHydrationWarning>
                {firstName
                  ? `LET'S BUILD SOMETHING, ${firstName.toUpperCase()}`
                  : "LET'S BUILD SOMETHING"}
              </h1>

              <div className="rounded-spacing-4 relative z-10 w-full bg-[var(--color-background)]">
                <ChatInput
                  onSend={handleSend}
                  disabled={disabled}
                  isStreaming={isStreaming}
                  onStop={onStop}
                  placeholder="What are we creating today?"
                  initialValue={pendingMessage}
                  roundedClass="rounded-spacing-4"
                  insertTextRef={insertTextRef}
                  setTextRef={setTextRef}
                  activeCapabilityChip={
                    activeChip ? { label: activeChip.label, icon: activeChip.icon } : null
                  }
                  onClearCapabilityChip={() => setActiveChipId(null)}
                />
              </div>

              {/* ── Campaign toolbar — attached tab underneath ── */}
              <div className="bg-card rounded-b-spacing-4 pt-spacing-6 relative z-0 mx-1 -mt-3 flex items-center justify-between border-t-0 px-3 pb-2.5 shadow-sm md:mx-4 md:px-4">
                <div className="relative" ref={campaignDropdownRef}>
                  <button
                    ref={campaignButtonRef}
                    type="button"
                    onClick={() => setCampaignDropdownOpen((p) => !p)}
                    className="flex items-center gap-1.5 text-[11px] text-[var(--color-muted-foreground)] transition-colors hover:text-[var(--color-foreground)]"
                  >
                    {pickedCampaign ? (
                      <>
                        <LucideIcon
                          name={
                            (pickedCampaign.config as Record<string, string>)?.icon ||
                            'folder-kanban'
                          }
                          className="h-3 w-3"
                        />
                        <span className="max-w-[160px] truncate font-medium text-[var(--color-foreground)]">
                          {pickedCampaign.name}
                        </span>
                        <Check className="h-2.5 w-2.5 text-emerald-400" />
                      </>
                    ) : (
                      <>
                        <FolderKanban className="h-3 w-3" />
                        <span className="font-medium">Select campaign</span>
                      </>
                    )}
                    <ChevronDown className="h-2.5 w-2.5" />
                  </button>

                  {campaignDropdownOpen &&
                    typeof document !== 'undefined' &&
                    createPortal(
                      <div
                        ref={campaignDropdownRef}
                        className="studio-home-campaign-dropdown fixed z-[9999] w-64 overflow-hidden"
                        style={{ top: campaignDropdownPos.top, left: campaignDropdownPos.left }}
                      >
                        <div className="scrollbar-hide max-h-[200px] overflow-y-auto py-1">
                          <button
                            type="button"
                            onClick={() => {
                              setCampaignDropdownOpen(false)
                              setShowNewCampaignModal(true)
                            }}
                            className="body-3 flex w-full items-center gap-2 px-3 py-1.5 text-left text-[var(--color-foreground)] transition-all hover:bg-[var(--color-secondary)]"
                          >
                            <Plus className="h-3.5 w-3.5 shrink-0" />
                            <span className="font-medium">New campaign</span>
                          </button>
                          {selectableCampaigns.length === 0 ? (
                            <p className="body-3 px-3 py-3 text-center text-[var(--color-muted-foreground)]">
                              No campaigns yet
                            </p>
                          ) : (
                            selectableCampaigns.map((c) => {
                              const iconName =
                                (c.config as Record<string, string>)?.icon || 'folder-kanban'
                              const isSelected = pickedCampaignId === c.id
                              return (
                                <button
                                  key={c.id}
                                  type="button"
                                  onClick={() => handleCampaignPick(c)}
                                  className={`body-3 flex w-full items-center gap-2 px-3 py-1.5 text-left transition-all hover:bg-[var(--color-secondary)] ${
                                    isSelected
                                      ? 'text-[var(--color-primary)]'
                                      : 'text-[var(--color-foreground)]'
                                  }`}
                                >
                                  <LucideIcon name={iconName} className="h-3.5 w-3.5 shrink-0" />
                                  <span className="flex-1 truncate">{c.name}</span>
                                  {isSelected && (
                                    <Check className="h-3 w-3 text-[var(--color-primary)]" />
                                  )}
                                </button>
                              )
                            })
                          )}
                        </div>
                      </div>,
                      document.body,
                    )}
                </div>

                <button
                  onClick={() => {
                    if (typeof window !== 'undefined') {
                      const url = new URL(window.location.href)
                      url.searchParams.set('tab', 'library')
                      window.history.replaceState({}, '', url.toString())
                    }
                    openWorkspaceSettings('integrations')
                  }}
                  className="flex items-center gap-1 transition-opacity hover:opacity-80"
                >
                  {visibleIntegrationPlaceholders.map((provider) => (
                    <div
                      key={provider}
                      className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-secondary)]"
                      title={provider}
                    >
                      {INTEGRATION_ICONS[provider] ? (
                        <img
                          src={INTEGRATION_ICONS[provider]}
                          alt={provider}
                          className="h-4 w-4 rounded-full object-contain"
                          onError={(e) => {
                            ;(e.target as HTMLImageElement).style.display = 'none'
                          }}
                        />
                      ) : (
                        <Globe className="h-2.5 w-2.5 text-[var(--color-muted-foreground)]" />
                      )}
                    </div>
                  ))}
                  {overflowCount > 0 && (
                    <span className="text-[10px] text-[var(--color-muted-foreground)]">
                      +{overflowCount}
                    </span>
                  )}
                </button>
              </div>

              {/* ── Capability chips / Active chip suggestions ── */}
              <div className="mt-3 h-[210px]">
                <AnimatePresence mode="wait" initial={false}>
                  {!activeChip ? (
                    <motion.div
                      key="chip-row"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.2, ease: 'easeOut' }}
                      className="flex flex-wrap items-center justify-center gap-1.5"
                    >
                      {CAPABILITY_CHIPS.slice(0, 4).map((chip) => (
                        <motion.button
                          key={chip.id}
                          type="button"
                          onClick={() => handleChipSelect(chip.id)}
                          whileHover={{ y: -1 }}
                          whileTap={{ scale: 0.98 }}
                          className="body-2 border-border text-muted-foreground hover:border-foreground/20 hover:text-foreground flex items-center gap-1.5 rounded-full border px-3 py-1 font-medium transition-all"
                        >
                          <LucideIcon name={chip.icon} className="h-3 w-3" />
                          {chip.label}
                        </motion.button>
                      ))}
                      <div className="relative" ref={moreDropdownRef}>
                        <button
                          type="button"
                          onClick={() => setMoreDropdownOpen((p) => !p)}
                          className="body-2 border-border text-muted-foreground hover:border-foreground/20 hover:text-foreground flex items-center gap-1 rounded-full border px-3 py-1 font-medium transition-all"
                        >
                          More
                          <ChevronDown className="h-2.5 w-2.5" />
                        </button>
                        {moreDropdownOpen && (
                          <div className="border-border bg-card absolute left-1/2 top-full z-50 mt-2 w-48 -translate-x-1/2 overflow-hidden rounded-lg border shadow-lg md:left-0 md:translate-x-0">
                            <div className="py-1">
                              {CAPABILITY_CHIPS.slice(4).map((cap) => (
                                <button
                                  key={cap.id}
                                  type="button"
                                  onClick={() => {
                                    handleChipSelect(cap.id)
                                    setMoreDropdownOpen(false)
                                  }}
                                  className="body-2 text-foreground flex w-full items-center gap-2 px-3 py-1.5 text-left transition-colors hover:bg-[var(--color-secondary)]"
                                >
                                  <LucideIcon name={cap.icon} className="h-3 w-3 shrink-0" />
                                  {cap.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="chip-suggestions"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.2, ease: 'easeOut' }}
                      className="space-y-2"
                    >
                      <div>
                        {activeChip.suggestions.map((suggestion, idx) => (
                          <motion.button
                            key={suggestion}
                            type="button"
                            onClick={() => handleSuggestionClick(suggestion)}
                            whileHover={{ x: 3 }}
                            whileTap={{ scale: 0.995 }}
                            className={`text-muted-foreground hover:text-foreground rounded-spacing-2 flex w-full items-center justify-between px-3 py-2.5 text-left text-[13px] transition-colors hover:bg-[var(--color-secondary)] ${idx < activeChip.suggestions.length - 1 ? 'border-border border-b' : ''}`}
                          >
                            <span>{suggestion}</span>
                            <ArrowUpRight className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
                          </motion.button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* ── Rotating Feature Carousel — bottom of screen (desktop only) ── */}
          <div className="mt-auto hidden flex-col items-center justify-center px-4 pb-4 md:flex">
            {!activeChip ? (
              <>
                <div
                  className="input-glass rounded-spacing-3 relative h-28 w-full max-w-xl cursor-pointer overflow-hidden p-0"
                  onClick={() => {
                    const card = FEATURE_CARDS[activeSlide]
                    if (card?.section) openWorkspaceSettings(card.section)
                  }}
                >
                  <div
                    className="absolute inset-0 flex transition-transform duration-700 ease-[cubic-bezier(0.25,1,0.5,1)]"
                    style={{ transform: `translateX(-${activeSlide * 100}%)` }}
                  >
                    {FEATURE_CARDS.map((card) => {
                      const isComing = !card.section
                      const isDomains = card.id === 'domains'
                      const isEmail = card.id === 'email'
                      return (
                        <div
                          key={card.title}
                          className="relative flex h-full w-full flex-none items-center px-8"
                        >
                          <div
                            className={`flex-1 text-left ${isDomains || isEmail ? 'max-w-[55%]' : ''}`}
                          >
                            <h3 className="text-foreground text-lg font-medium">
                              {card.title}
                              {isComing && (
                                <span className="badge-glass badge-glass-muted typo-caption ml-2 inline-block align-middle font-medium">
                                  Coming soon
                                </span>
                              )}
                            </h3>
                            <p className="body-3 text-muted-foreground mt-1.5">{card.subtitle}</p>
                          </div>
                          {isDomains ? (
                            <div className="border-border absolute bottom-0 right-4 h-[90px] w-40 overflow-hidden rounded-t-lg border border-b-0 bg-[var(--color-card)] shadow-sm">
                              <div className="border-border flex items-center gap-1 border-b bg-[var(--color-secondary)] px-2 py-1">
                                <div className="flex gap-0.5">
                                  <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
                                  <span className="h-1.5 w-1.5 rounded-full bg-yellow-400" />
                                  <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
                                </div>
                                <div className="ml-1 flex flex-1 items-center gap-1 truncate rounded bg-[var(--color-background)] px-1.5 py-0.5">
                                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                                  <span className="text-muted-foreground whitespace-nowrap text-[7px]">
                                    yourdomain.com
                                  </span>
                                </div>
                              </div>
                              <div className="flex flex-col gap-1 p-2">
                                <div className="flex items-center gap-1">
                                  <div className="bg-foreground/8 h-2 w-2 rounded-full" />
                                  <div className="bg-foreground/10 h-1 w-8 rounded-full" />
                                  <div className="bg-foreground/8 h-1 w-6 rounded-full" />
                                  <div className="bg-foreground/6 h-1 w-10 rounded-full" />
                                </div>
                                <div className="bg-foreground/5 h-6 w-full rounded" />
                                <div className="flex gap-1">
                                  <div className="bg-foreground/4 h-4 flex-1 rounded" />
                                  <div className="bg-foreground/4 h-4 flex-1 rounded" />
                                  <div className="bg-foreground/4 h-4 flex-1 rounded" />
                                </div>
                                <div className="mt-0.5 flex gap-1">
                                  <div className="bg-foreground/6 h-1 w-14 rounded-full" />
                                  <div className="bg-foreground/4 h-1 w-8 rounded-full" />
                                </div>
                              </div>
                            </div>
                          ) : isEmail ? (
                            <div className="border-border absolute bottom-0 right-4 h-[90px] w-40 overflow-hidden rounded-t-lg border border-b-0 bg-[var(--color-card)] shadow-sm">
                              <div className="border-border flex items-center justify-between border-b bg-[var(--color-secondary)] px-2 py-1">
                                <span className="text-muted-foreground text-[6px] font-medium">
                                  New Email
                                </span>
                                <div className="flex gap-0.5">
                                  <span className="bg-muted-foreground/30 h-1 w-1 rounded-full" />
                                  <span className="bg-muted-foreground/30 h-1 w-1 rounded-full" />
                                </div>
                              </div>
                              <div className="space-y-1 p-1.5">
                                <div className="border-border flex items-center gap-1 border-b pb-1">
                                  <span className="text-muted-foreground shrink-0 text-[5px]">
                                    From:
                                  </span>
                                  <span className="text-foreground/60 text-[5px]">
                                    you@yourdomain.com
                                  </span>
                                </div>
                                <div className="border-border flex items-center gap-1 border-b pb-1">
                                  <span className="text-muted-foreground shrink-0 text-[5px]">
                                    To:
                                  </span>
                                  <div className="bg-foreground/8 h-0.5 w-16 rounded-full" />
                                </div>
                                <div className="border-border flex items-center gap-1 border-b pb-1">
                                  <span className="text-muted-foreground shrink-0 text-[5px]">
                                    Subject:
                                  </span>
                                  <div className="bg-foreground/10 h-0.5 w-20 rounded-full" />
                                </div>
                                <div className="space-y-0.5 pt-0.5">
                                  <div className="bg-foreground/6 h-0.5 w-full rounded-full" />
                                  <div className="bg-foreground/5 h-0.5 w-3/4 rounded-full" />
                                  <div className="bg-foreground/4 h-0.5 w-1/2 rounded-full" />
                                </div>
                              </div>
                              <div className="absolute bottom-1.5 right-1.5">
                                <div className="flex h-3 w-8 items-center justify-center rounded bg-blue-500/20">
                                  <span className="text-[5px] font-medium text-blue-500">Send</span>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <FeatureCardVisual id={card.id} />
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
                <div className="mt-4 flex gap-1.5">
                  {FEATURE_CARDS.map((card, idx) => (
                    <button
                      key={card.title}
                      type="button"
                      onClick={() => setActiveSlide(idx)}
                      className={`rounded-full transition-all duration-300 ${
                        activeSlide === idx
                          ? 'indicator-dot-glass indicator-dot-glass-blue h-2 w-4'
                          : 'indicator-dot-glass indicator-dot-glass-muted opacity-40 hover:opacity-70'
                      }`}
                    />
                  ))}
                </div>
              </>
            ) : (
              <>
                <div className="h-28 w-full max-w-xl" />
                <div className="mt-4 h-2" />
              </>
            )}
          </div>
        </div>
      </div>

      <NewCampaignModal
        open={showNewCampaignModal}
        onClose={() => setShowNewCampaignModal(false)}
        onCreate={handleCreateCampaign}
      />
    </div>
  )
}
