'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import type { MissionAgent } from '@/features/mission-control/types'
import {
  DEFAULT_AGENT_DOMAINS,
  KNOWLEDGE_DOMAINS,
} from '@/features/studio/services/campaign-knowledge.service'
import { ThemeSettingsModal } from '@/features/themes/components/ThemeSettingsModal'
import type { Theme } from '@/features/themes/types'

type KnowledgeSection = 'assets' | 'access'

const SECTIONS = [
  { id: 'assets', label: 'Brand Assets' },
  { id: 'access', label: 'Agent Access' },
] as const

interface CampaignKnowledgeTabProps {
  offers: any[]
  avatars: any[]
  theme: Theme | null
  onThemeChange: (themeId: string | null) => void
  offerPage: number
  setOfferPage: (value: number) => void
  avatarPage: number
  setAvatarPage: (value: number) => void
  dashboardAgents: MissionAgent[]
}

export function CampaignKnowledgeTab({
  offers,
  avatars,
  theme,
  onThemeChange,
  offerPage,
  setOfferPage,
  avatarPage,
  setAvatarPage,
  dashboardAgents,
}: CampaignKnowledgeTabProps) {
  const [activeSection, setActiveSection] = useState<KnowledgeSection>('assets')
  const [themeModalOpen, setThemeModalOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const activeSectionData = SECTIONS.find((s) => s.id === activeSection)!

  return (
    <div className="flex h-full min-h-0 flex-col gap-6 md:flex-row md:pr-6">
      <div className="relative shrink-0 md:hidden">
        <button
          type="button"
          onClick={() => setMobileMenuOpen((o) => !o)}
          className="rounded-spacing-3 border-border bg-card flex w-full items-center justify-between border px-4 py-3 shadow-sm"
        >
          <div className="flex items-center gap-3">
            <span className="body-2 text-foreground font-semibold">{activeSectionData.label}</span>
          </div>
          <ChevronDown className="text-muted-foreground h-4 w-4" />
        </button>
        {mobileMenuOpen && (
          <>
            <div className="fixed inset-0 z-[60]" onClick={() => setMobileMenuOpen(false)} />
            <div className="rounded-spacing-3 border-border bg-card absolute left-0 top-full z-[70] mt-2 w-full border p-2 shadow-lg">
              {SECTIONS.map((section) => {
                const isActive = activeSection === section.id
                return (
                  <button
                    key={section.id}
                    type="button"
                    onClick={() => {
                      setActiveSection(section.id)
                      setMobileMenuOpen(false)
                    }}
                    className={`rounded-spacing-2 flex w-full items-center gap-3 px-3 py-3 transition-colors ${isActive ? 'bg-primary/10 text-foreground' : 'text-muted-foreground hover:bg-muted/20 hover:text-foreground'}`}
                  >
                    <span className="body-2 font-medium">{section.label}</span>
                  </button>
                )
              })}
            </div>
          </>
        )}
      </div>

      <div className="hidden w-64 shrink-0 flex-col gap-2 md:flex">
        <h3 className="typo-caption text-muted-foreground mb-2 px-3 uppercase tracking-wider">
          Knowledge Base
        </h3>
        {SECTIONS.map((section) => {
          const isActive = activeSection === section.id
          return (
            <button
              key={section.id}
              type="button"
              onClick={() => setActiveSection(section.id)}
              className={`rounded-spacing-3 flex items-center gap-3 px-4 py-3 transition-all ${isActive ? 'chip-glass-blue font-medium' : 'text-muted-foreground hover:text-foreground hover:bg-muted/20'}`}
            >
              <span className="body-2">{section.label}</span>
            </button>
          )
        })}
      </div>

      <div className="space-y-spacing-4 min-w-0 flex-1 overflow-y-auto pb-8">
        <div className="surface-card border-border rounded-spacing-3 p-spacing-4 border">
          <p className="body-3 text-muted-foreground">
            Result, Purpose, Strategy, and Off-limits live in{' '}
            <Link
              href="/home"
              className="text-primary font-semibold underline-offset-4 hover:underline"
            >
              Mission Control → AutoPilot
            </Link>
            .
          </p>
        </div>

        {activeSection === 'assets' && (
          <div className="card-glass gap-spacing-6 flex flex-col p-5 sm:p-8">
            <div className="flex items-center justify-between">
              <h2 className="title-h4 text-foreground">Brand Assets</h2>
              <div className="flex -space-x-2">
                {dashboardAgents
                  .filter((agent) => agent.level === 'c_level' || agent.level === 'manager')
                  .map((agent) => (
                    <div
                      key={agent.id}
                      className="border-card relative h-8 w-8 rounded-full border-2"
                      title={agent.name}
                    >
                      {agent.image_url ? (
                        <img
                          src={agent.image_url}
                          alt={agent.name}
                          className="h-full w-full rounded-full object-cover"
                        />
                      ) : (
                        <div className="bg-primary/20 text-primary flex h-full w-full items-center justify-center rounded-full text-xs font-medium">
                          {agent.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            </div>

            <div className="flex flex-col">
              <h3 className="body-2 mb-spacing-2 text-foreground font-semibold">
                Offers ({offers.length})
              </h3>
              <div className="input-glass rounded-spacing-2 p-spacing-4">
                {offers.length > 0 ? (
                  (() => {
                    const pageSize = 3
                    const offerPages = []
                    for (let index = 0; index < offers.length; index += pageSize)
                      offerPages.push(offers.slice(index, index + pageSize))
                    return (
                      <div className="relative flex flex-col">
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                          {offerPages[offerPage ?? 0]?.map((offer: any, index: number) => {
                            const realIndex = (offerPage ?? 0) * pageSize + index
                            const offerId = offer.id || `offer-${realIndex}`
                            const name = offer.name || offer.offer_name || `Offer ${realIndex + 1}`
                            const step2 = (offer.step2_data || {}) as Record<string, unknown>
                            const powerOffer =
                              (step2.step2_power_offer_statement as string) ||
                              (step2.power_offer_statement as string) ||
                              (step2.powerOffer as string) ||
                              (offer.offer_description as string) ||
                              ''
                            return (
                              <div
                                key={offerId}
                                className="chip-glass-neutral rounded-spacing-3 flex flex-col items-center justify-center gap-2 px-4 py-6 text-center"
                              >
                                <p className="body-2 text-foreground font-semibold">{name}</p>
                                {powerOffer && (
                                  <p className="body-4 text-muted-foreground line-clamp-3">
                                    {String(powerOffer)}
                                  </p>
                                )}
                              </div>
                            )
                          })}
                        </div>
                        {offerPages.length > 1 && (
                          <div className="mt-4 flex shrink-0 items-center justify-center gap-2">
                            {offerPages.map((_: any, index: number) => (
                              <button
                                key={index}
                                type="button"
                                onClick={() => setOfferPage(index)}
                                className={`h-2 rounded-full transition-all ${(offerPage ?? 0) === index ? 'bg-primary w-6' : 'bg-muted-foreground/30 hover:bg-muted-foreground/50 w-2'}`}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })()
                ) : (
                  <p className="body-3 text-muted-foreground py-4 text-center">
                    No offers available.
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-col">
              <h3 className="body-2 mb-spacing-2 text-foreground font-semibold">
                Avatars ({avatars.length})
              </h3>
              <div className="input-glass rounded-spacing-2 p-spacing-4">
                {avatars.length > 0 ? (
                  (() => {
                    const pageSize = 3
                    const avatarPages = []
                    for (let index = 0; index < avatars.length; index += pageSize)
                      avatarPages.push(avatars.slice(index, index + pageSize))
                    return (
                      <div className="relative flex flex-col">
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                          {avatarPages[avatarPage ?? 0]?.map((avatar: any, index: number) => {
                            const realIndex = (avatarPage ?? 0) * pageSize + index
                            const avatarId = avatar.id || `avatar-${realIndex}`
                            const persona = (avatar.persona_data || {}) as Record<string, any>
                            const demo = (persona.demographics || {}) as Record<string, any>
                            const name =
                              demo.name ||
                              persona.buyerPersona?.name ||
                              avatar.name ||
                              `Avatar ${realIndex + 1}`
                            const oneLiner =
                              persona.core_problem || persona.buyerPersona?.description || ''
                            return (
                              <div
                                key={avatarId}
                                className="chip-glass-neutral rounded-spacing-3 flex flex-col items-center justify-center gap-2 px-4 py-6 text-center"
                              >
                                <p className="body-2 text-foreground font-semibold">{name}</p>
                                {oneLiner && (
                                  <p className="body-4 text-muted-foreground line-clamp-3">
                                    {String(oneLiner)}
                                  </p>
                                )}
                              </div>
                            )
                          })}
                        </div>
                        {avatarPages.length > 1 && (
                          <div className="mt-4 flex shrink-0 items-center justify-center gap-2">
                            {avatarPages.map((_: any, index: number) => (
                              <button
                                key={index}
                                type="button"
                                onClick={() => setAvatarPage(index)}
                                className={`h-2 rounded-full transition-all ${(avatarPage ?? 0) === index ? 'bg-primary w-6' : 'bg-muted-foreground/30 hover:bg-muted-foreground/50 w-2'}`}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })()
                ) : (
                  <p className="body-3 text-muted-foreground py-4 text-center">
                    No avatars available.
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-col">
              <h3 className="body-2 mb-spacing-2 text-foreground font-semibold">Theme</h3>
              <div className="input-glass rounded-spacing-2 p-spacing-4">
                {theme ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => setThemeModalOpen(true)}
                        className="body-2 text-foreground font-semibold hover:underline"
                      >
                        {theme.name}
                      </button>
                      <div className="flex gap-1.5">
                        {[
                          theme.colors.primary,
                          theme.colors.secondaryAccent1,
                          theme.colors.secondaryAccent2,
                          theme.colors.pageBackground,
                          theme.colors.cardBackground,
                        ].map((color, i) => (
                          <div
                            key={i}
                            className="border-border h-6 w-6 rounded-full border"
                            style={{ background: color }}
                          />
                        ))}
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <div className="chip-glass-neutral rounded-spacing-3 px-4 py-3">
                        <p className="body-4 text-muted-foreground mb-1 uppercase tracking-wider">
                          Voice
                        </p>
                        {theme.brand_voice?.tone && (
                          <p className="body-3 text-foreground">{theme.brand_voice.tone}</p>
                        )}
                        {theme.brand_voice?.style && (
                          <p className="body-3 text-muted-foreground mt-1">
                            {theme.brand_voice.style}
                          </p>
                        )}
                      </div>
                      <div className="chip-glass-neutral rounded-spacing-3 px-4 py-3">
                        <p className="body-4 text-muted-foreground mb-1 uppercase tracking-wider">
                          Values
                        </p>
                        {theme.brand_values?.primary && (
                          <p className="body-3 text-foreground">{theme.brand_values.primary}</p>
                        )}
                        {theme.brand_values?.secondary &&
                          theme.brand_values.secondary.length > 0 && (
                            <p className="body-3 text-muted-foreground mt-1">
                              {theme.brand_values.secondary.slice(0, 3).join(', ')}
                            </p>
                          )}
                      </div>
                      <div className="chip-glass-neutral rounded-spacing-3 px-4 py-3">
                        <p className="body-4 text-muted-foreground mb-1 uppercase tracking-wider">
                          Brand
                        </p>
                        {theme.brand_values?.tagline && (
                          <p className="body-3 text-foreground line-clamp-2">
                            {theme.brand_values.tagline}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="py-6 text-center">
                    <p className="body-3 text-muted-foreground mb-3">
                      No theme selected for this campaign.
                    </p>
                    <button
                      type="button"
                      onClick={() => setThemeModalOpen(true)}
                      className="button-glass-primary body-3 rounded-spacing-3 px-4 py-2 font-medium"
                    >
                      Set Theme
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeSection === 'access' && (
          <div className="card-glass flex flex-col p-5 sm:p-8">
            <div className="mb-1 flex items-center justify-between">
              <h2 className="title-h4 text-foreground">Agent Access</h2>
              <div className="flex -space-x-2">
                {dashboardAgents
                  .filter((agent) => agent.level === 'c_level' || agent.level === 'manager')
                  .map((agent) => (
                    <div
                      key={agent.id}
                      className="border-card relative h-8 w-8 rounded-full border-2"
                      title={agent.name}
                    >
                      {agent.image_url ? (
                        <img
                          src={agent.image_url}
                          alt={agent.name}
                          className="h-full w-full rounded-full object-cover"
                        />
                      ) : (
                        <div className="bg-primary/20 text-primary flex h-full w-full items-center justify-center rounded-full text-xs font-medium">
                          {agent.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            </div>
            <p className="body-3 text-muted-foreground mb-6">
              Which knowledge domains each agent can access during missions.
            </p>

            <div className="rounded-spacing-3 border-border overflow-x-auto border">
              <table className="w-full text-left">
                <thead className="bg-muted/10">
                  <tr>
                    <th className="body-4 text-muted-foreground px-4 py-3 font-medium uppercase tracking-wider">
                      Agent
                    </th>
                    {KNOWLEDGE_DOMAINS.map((domain) => (
                      <th
                        key={domain.value}
                        className="body-4 text-muted-foreground px-4 py-3 text-center font-medium uppercase tracking-wider"
                      >
                        {domain.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-border divide-y">
                  {dashboardAgents
                    .filter((agent) => agent.level !== 'system')
                    .sort((a, b) => {
                      const order = { c_level: 0, manager: 1, employee: 2 }
                      return (
                        (order[a.level as keyof typeof order] ?? 2) -
                        (order[b.level as keyof typeof order] ?? 2)
                      )
                    })
                    .map((agent) => {
                      const domains: string[] =
                        DEFAULT_AGENT_DOMAINS[agent.agent_key] ??
                        (agent.level === 'c_level'
                          ? [
                              'strategy',
                              'marketing',
                              'finance',
                              'operations',
                              'creative',
                              'general',
                            ]
                          : ['marketing', 'creative', 'general'])
                      return (
                        <tr key={agent.id} className="hover:bg-muted/5 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              {agent.image_url ? (
                                <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full">
                                  <img
                                    src={agent.image_url}
                                    alt=""
                                    className="h-full w-full object-cover"
                                  />
                                </div>
                              ) : (
                                <div className="bg-primary/20 flex h-8 w-8 shrink-0 items-center justify-center rounded-full">
                                  <span className="text-primary text-xs font-bold">
                                    {agent.name.charAt(0)}
                                  </span>
                                </div>
                              )}
                              <div className="min-w-0">
                                <p className="body-2 text-foreground truncate font-medium">
                                  {agent.name}
                                </p>
                                <p className="typo-caption text-muted-foreground truncate">
                                  {agent.role}
                                </p>
                              </div>
                            </div>
                          </td>
                          {KNOWLEDGE_DOMAINS.map((domain) => (
                            <td key={domain.value} className="px-4 py-3 text-center">
                              {domains.includes(domain.value) ? (
                                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-emerald-500/20 bg-emerald-500/10 text-emerald-400">
                                  <Check className="h-3.5 w-3.5" />
                                </span>
                              ) : (
                                <span className="text-muted-foreground/30 inline-flex h-6 w-6 items-center justify-center">
                                  —
                                </span>
                              )}
                            </td>
                          ))}
                        </tr>
                      )
                    })}
                  {dashboardAgents.filter((agent) => agent.level !== 'system').length === 0 && (
                    <tr>
                      <td
                        colSpan={KNOWLEDGE_DOMAINS.length + 1}
                        className="body-3 text-muted-foreground py-8 text-center"
                      >
                        No agents hired yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <ThemeSettingsModal
        open={themeModalOpen}
        onOpenChange={setThemeModalOpen}
        theme={theme}
        onThemeChange={onThemeChange}
      />
    </div>
  )
}
