'use client'

import React from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown, Mic, Paperclip, Settings2 } from 'lucide-react'
import { FeatureFloatingMockShell } from '@/components/feature-pages/FeatureFloatingMockShell'

const INTEGRATIONS = [
  { id: 'meta', name: 'Meta', logo: '/Integrations/Meta.png', enabled: true },
  {
    id: 'stripe',
    name: 'Stripe',
    logo: '/Integrations/Stripe.png',
    enabled: false,
    logoScale: 1.3,
  },
  { id: 'slack', name: 'Slack', logo: '/Integrations/Slack.png', enabled: true },
  { id: 'hubspot', name: 'HubSpot', logo: '/Integrations/HubSpot.png', enabled: true },
]

export function IntegrationPermissionScoperMockup() {
  return (
    <FeatureFloatingMockShell className="!min-h-[500px]">
      <div className="site-mock-dark studio-app-preview-root relative flex h-full min-h-[500px] w-full flex-col p-6">
        {/* Chat History Area */}
        <div className="mb-8 flex-1 space-y-6 overflow-hidden pt-4">
          {/* User Message */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col items-end"
          >
            <div className="card-glass card-glass-user max-w-[80%] px-4 py-2">
              <p className="body-2 font-normal text-white">Can you get my Stripe payment data?</p>
            </div>
          </motion.div>

          {/* Assistant Message */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.8 }}
            className="flex flex-col items-start"
          >
            <div className="body-1 text-chat px-spacing-2 group flex max-w-[90%] flex-col">
              <div className="gap-spacing-3 flex flex-col">
                <p className="body-2 font-normal leading-relaxed text-white/90">
                  <strong className="font-bold">I can&apos;t access your Stripe</strong> right now
                  as it&apos;s disconnected, but I do have access to your Meta, Slack, and HubSpot
                  data to proceed with the mission.
                </p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Chat Input Area (Pixel Perfect Replica) */}
        <div className="relative mt-auto">
          {/* Actual Input Replica */}
          <div className="input-glass flex flex-col rounded-2xl border border-white/10 !bg-white/[0.03] shadow-2xl">
            <div className="px-4 pb-1 pt-3">
              <p className="body-2 font-normal text-white/30">Message Vibe...</p>
            </div>

            <div className="mt-2 flex items-center justify-between px-3 py-2">
              <div className="flex items-center gap-1.5">
                {/* Model Button */}
                <div className="chip-glass-blue flex h-8 items-center gap-1 rounded-full border border-blue-500/20 bg-blue-500/10 px-2.5 text-[11px] font-medium text-blue-400">
                  <span className="typo-caption font-medium">Auto</span>
                  <ChevronDown size={12} className="opacity-60" />
                </div>

                {/* Attach Button */}
                <div className="button-glass-neutral flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/40">
                  <Paperclip size={14} />
                </div>

                {/* Integration Button (Active) with Dropdown aligned to it */}
                <div className="relative">
                  {/* Integration Dropdown (Open State) — centered above button via wrapper */}
                  <div className="absolute bottom-[calc(100%+12px)] left-1/2 z-[100] w-64 -translate-x-1/2">
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ duration: 0.3, delay: 1.5 }}
                      className="dropdown-menu-solid w-full rounded-xl border border-white/10 !bg-[#1a1a1a] shadow-2xl shadow-black/50"
                    >
                      <div className="py-1">
                        {INTEGRATIONS.map((int) => (
                          <div
                            key={int.id}
                            className="px-spacing-3 py-spacing-2 flex items-center justify-between transition-colors hover:bg-white/[0.03]"
                          >
                            <div className="gap-spacing-2 flex items-center">
                              <div className="flex h-6 w-6 items-center justify-center">
                                <div className="flex h-5 w-5 items-center justify-center overflow-hidden rounded bg-white p-0.5 shadow-sm">
                                  <img
                                    src={int.logo}
                                    alt={int.name}
                                    className="h-full w-full object-contain"
                                    style={{
                                      transform: int.logoScale ? `scale(${int.logoScale})` : 'none',
                                    }}
                                  />
                                </div>
                              </div>
                              <span className="body-3 font-medium text-white/95">{int.name}</span>
                            </div>

                            {/* Switch Replica */}
                            <div
                              className={`switch-glass-primary relative inline-flex h-5 w-9 items-center overflow-hidden rounded-full transition-colors ${!int.enabled ? 'border-white/10 !bg-white/5' : ''}`}
                              aria-checked={int.enabled}
                            >
                              <span
                                className={`switch-glass-primary-thumb inline-block h-4 w-4 transform rounded-full transition-transform ${int.enabled ? 'translate-x-4 bg-white' : 'translate-x-1 bg-white/20'}`}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="border-t border-white/5 bg-white/[0.02]">
                        <button className="body-3 w-full py-2.5 text-center font-medium text-white/40 transition-colors hover:text-white">
                          Manage All Integrations
                        </button>
                      </div>
                    </motion.div>
                  </div>

                  <div className="flex h-8 items-center gap-1.5 rounded-full border border-purple-500/40 bg-purple-500/20 px-2.5 text-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.2)]">
                    <Settings2 size={14} />
                    <span className="typo-caption font-bold">3</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <div className="button-glass-neutral flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/40">
                  <Mic size={14} />
                </div>
                <div className="button-glass-neutral flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/20">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Background Polish */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_100%,rgba(168,85,247,0.05),transparent_70%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.01),rgba(0,255,0,0.005),rgba(0,0,255,0.01))] bg-[length:100%_2px,3px_100%] opacity-[0.03]" />
    </FeatureFloatingMockShell>
  )
}
