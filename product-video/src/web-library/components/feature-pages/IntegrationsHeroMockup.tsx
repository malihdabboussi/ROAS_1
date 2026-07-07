'use client'

import React, { useEffect, useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

// Real integration data from the library with official paths
const INTEGRATIONS = [
  // --- QUADRANT 0: Marketing & Social (Top Left) ---
  { id: 'linkedin', name: 'LinkedIn', logo: '/Integrations/LinkedIn.png', quadrant: 0 },
  { id: 'instagram', name: 'Instagram', logo: '/Integrations/Instagram.png', quadrant: 0 },
  { id: 'facebook', name: 'Facebook', logo: '/Integrations/Facebook.png', quadrant: 0 },
  { id: 'youtube', name: 'YouTube', logo: '/Integrations/YouTube.png', quadrant: 0 },
  { id: 'twitter', name: 'Twitter', logo: '/Integrations/Twitter.png', quadrant: 0 },
  { id: 'tiktok', name: 'TikTok', logo: '/Integrations/TikTok.png', quadrant: 0 },
  { id: 'reddit', name: 'Reddit', logo: '/Integrations/Reddit.png', quadrant: 0 },
  { id: 'meta', name: 'Meta Ads', logo: '/Integrations/Meta.png', quadrant: 0 },
  { id: 'google_ads', name: 'Google Ads', logo: '/Integrations/GoogleAds.png', quadrant: 0 },
  { id: 'google_analytics', name: 'Analytics', logo: '/Integrations/GoogleAnalytics.png', quadrant: 0 },
  { id: 'google_search_console', name: 'Search Console', logo: '/Integrations/GoogleSearchConsole.png', quadrant: 0 },

  // --- QUADRANT 1: Sales & CRM (Top Right) ---
  { id: 'hubspot', name: 'HubSpot', logo: '/Integrations/HubSpot.png', quadrant: 1 },
  { id: 'salesforce', name: 'Salesforce', logo: '/Integrations/Salesforce.png', quadrant: 1 },
  { id: 'stripe', name: 'Stripe', logo: '/Integrations/Stripe.png', quadrant: 1, logoScale: 1.3 },
  { id: 'paypal', name: 'PayPal', logo: '/Integrations/PayPal.png', quadrant: 1 },
  { id: 'whop', name: 'Whop', logo: '/Integrations/Whop.png', quadrant: 1 },
  { id: 'fanbasis', name: 'FanBasis', logo: '/Integrations/FanBasis.png', quadrant: 1 },
  { id: 'gohighlevel', name: 'GoHighLevel', logo: '/Integrations/GHL.png', quadrant: 1 },
  { id: 'airtable', name: 'Airtable', logo: '/Integrations/Airtable.png', quadrant: 1 },

  // --- QUADRANT 2: Communication & Support (Bottom Left) ---
  { id: 'gmail', name: 'Gmail', logo: '/Integrations/Gmail.png', quadrant: 2 },
  { id: 'slack', name: 'Slack', logo: '/Integrations/Slack.png', quadrant: 2 },
  { id: 'mailchimp', name: 'Mailchimp', logo: '/Integrations/Mailchimp.png', quadrant: 2 },
  { id: 'kit', name: 'Kit', logo: '/Integrations/Kit.png', quadrant: 2 },
  { id: 'active_campaign', name: 'ActiveCampaign', logo: '/Integrations/ActiveCampaign.png', quadrant: 2 },
  { id: 'zoom', name: 'Zoom', logo: '/Integrations/Zoom.png', quadrant: 2 },
  { id: 'fathom', name: 'Fathom', logo: '/Integrations/Fathom.png', quadrant: 2 },
  { id: 'fireflies', name: 'Fireflies', logo: '/Integrations/Fireflies.png', quadrant: 2 },

  // --- QUADRANT 3: Productivity & Ops (Bottom Right) ---
  { id: 'google_drive', name: 'Drive', logo: '/Integrations/GoogleDrive.png', quadrant: 3 },
  { id: 'dropbox', name: 'Dropbox', logo: '/Integrations/Dropbox.png', quadrant: 3 },
  { id: 'google_sheets', name: 'Sheets', logo: '/Integrations/GoogleSheets.png', quadrant: 3 },
  { id: 'google_docs', name: 'Docs', logo: '/Integrations/GoogleDocs.png', quadrant: 3 },
  { id: 'google_calendar', name: 'Calendar', logo: '/Integrations/GoogleCalendar.png', quadrant: 3 },
  { id: 'calendly', name: 'Calendly', logo: '/Integrations/Calendly.png', quadrant: 3 },
  { id: 'clickup', name: 'ClickUp', logo: '/Integrations/ClickUp.png', quadrant: 3 },
  { id: 'notion', name: 'Notion', logo: '/Integrations/Notion.png', quadrant: 3 },
  { id: 'canva', name: 'Canva', logo: '/Integrations/Canva.png', quadrant: 3 },
  { id: 'github', name: 'GitHub', logo: '/Integrations/GitHub.png', quadrant: 3 },
  { id: 'vercel', name: 'Vercel', logo: '/Integrations/Vercel.png', quadrant: 3 },
]

const QUADRANTS = [
  { title: 'Marketing', id: 0 },
  { title: 'Sales & CRM', id: 1 },
  { title: 'Communication', id: 2 },
  { title: 'Operations', id: 3 },
]

export function IntegrationsHeroMockup() {
  const [visibleIds, setVisibleIds] = useState<Set<string>>(new Set())

  // Generate structured but jittered positions to ensure logical placement and no clipping
  const positions = useMemo(() => {
    const results: Array<{ id: string; x: number; y: number; scale: number; rotate: number }> = []
    
    QUADRANTS.forEach(quad => {
      const quadIntegrations = INTEGRATIONS.filter(i => i.quadrant === quad.id)
      
      // Board is 100x100. Each quadrant is 50x50.
      // Define a "safe zone" within each quadrant to avoid clipping and the center cross.
      const margin = 10 // 10% from any edge or axis
      const safeWidth = 50 - (margin * 2)
      const safeHeight = 50 - (margin * 2)
      
      const baseLeft = quad.id % 2 === 0 ? margin : 50 + margin
      const baseTop = quad.id < 2 ? margin : 50 + margin
      
      // Use a 4x4 grid within the safe zone (16 possible slots)
      // This ensures logos are evenly distributed but still staggered
      const slots = Array.from({ length: 16 }, (_, i) => i)
        // Shuffle slots for randomness
        .sort(() => Math.random() - 0.5)
      
      quadIntegrations.forEach((int, idx) => {
        const slotIdx = slots[idx]
        const row = Math.floor(slotIdx / 4)
        const col = slotIdx % 4
        
        // Width/Height of each slot in the safe area
        const slotW = safeWidth / 4
        const slotH = safeHeight / 4
        
        // Center of the slot with very minor jitter
        const jitterX = (Math.random() - 0.5) * (slotW * 0.4)
        const jitterY = (Math.random() - 0.5) * (slotH * 0.4)
        
        const x = baseLeft + (col * slotW) + (slotW / 2) + jitterX
        const y = baseTop + (row * slotH) + (slotH / 2) + jitterY
        
        results.push({ 
          id: int.id, 
          x, 
          y, 
          scale: 0.9 + Math.random() * 0.2, 
          rotate: (Math.random() - 0.5) * 15 
        })
      })
    })
    
    return results
  }, [])

  useEffect(() => {
    const shuffledIds = [...INTEGRATIONS].sort(() => Math.random() - 0.5).map(i => i.id)
    let index = 0
    const interval = setInterval(() => {
      if (index < shuffledIds.length) {
        const nextBatch = shuffledIds.slice(index, index + 3)
        setVisibleIds(prev => {
          const next = new Set(prev)
          nextBatch.forEach(id => next.add(id))
          return next
        })
        index += 3
      } else {
        clearInterval(interval)
      }
    }, 1500)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="relative w-full h-full bg-[#030303] overflow-hidden">
      {/* Background Radial (Autopilot Style) */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(52,211,153,0.08),transparent_70%)]" />
      
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
          className="relative h-full w-full overflow-hidden border-0 bg-gradient-to-br from-white/[0.05] to-white/[0.02] backdrop-blur-3xl shadow-[0_4px_16px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.1)]"
        >
          {/* Grid Texture */}
          <div className="absolute inset-0 opacity-[0.02] invert pointer-events-none" />
          
          {/* The Cross / Center Axis */}
          <div className="absolute inset-0 pointer-events-none z-10">
            <div className="absolute left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-white/10 to-transparent -translate-x-1/2" />
            <div className="absolute top-1/2 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-y-1/2" />
            
            {/* Labels */}
            <div className="absolute top-8 left-8 px-5 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-3xl text-[10px] font-bold uppercase tracking-[0.3em] text-white/30 ring-1 ring-white/5">Marketing</div>
            <div className="absolute top-8 right-8 px-5 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-3xl text-[10px] font-bold uppercase tracking-[0.3em] text-white/30 text-right ring-1 ring-white/5">Sales & CRM</div>
            <div className="absolute bottom-8 left-8 px-5 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-3xl text-[10px] font-bold uppercase tracking-[0.3em] text-white/30 ring-1 ring-white/5">Communication</div>
            <div className="absolute bottom-8 right-8 px-5 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-3xl text-[10px] font-bold uppercase tracking-[0.3em] text-white/30 text-right ring-1 ring-white/5">Operations</div>
          </div>

          {/* Non-overlapping scattered logos */}
          <div className="absolute inset-0 z-0">
            <AnimatePresence>
              {INTEGRATIONS.map((integration) => {
                const isVisible = visibleIds.has(integration.id)
                const pos = positions.find(p => p.id === integration.id)!
                if (!isVisible) return null

                return (
                  <motion.div
                    key={integration.id}
                    initial={{ opacity: 0, scale: 0.1, filter: 'blur(15px)', rotate: pos.rotate - 30 }}
                    animate={{ opacity: 1, scale: pos.scale, filter: 'blur(0px)', rotate: pos.rotate }}
                    transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
                    style={{
                      position: 'absolute',
                      top: `${pos.y}%`,
                      left: `${pos.x}%`,
                      transform: 'translate(-50%, -50%)',
                    }}
                    className="group z-0 hover:z-50"
                  >
                    <div className="absolute -inset-6 rounded-full bg-emerald-500/10 opacity-0 group-hover:opacity-30 blur-2xl transition-all duration-700" />
                    
                    {/* Smaller production-grade circles */}
                    <div className="relative h-10 w-10 sm:h-12 sm:w-12 lg:h-14 lg:w-14 rounded-full bg-white border border-white/20 flex items-center justify-center overflow-hidden p-2.5 sm:p-3 shadow-[0_10px_30px_rgba(0,0,0,0.5)] transition-all duration-500 group-hover:scale-125 group-hover:border-white/60 ring-1 ring-black/5">
                      <img 
                        src={integration.logo} 
                        alt={integration.name} 
                        className="w-full h-full object-contain filter" 
                        style={{ transform: integration.logoScale ? `scale(${integration.logoScale})` : 'scale(1)' }}
                      />
                    </div>

                    <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all duration-500 translate-y-2 group-hover:translate-y-0 pointer-events-none z-30">
                      <div className="px-2.5 py-1 rounded-lg bg-black/80 backdrop-blur-3xl border border-white/10 shadow-[0_15px_30px_rgba(0,0,0,0.8)]">
                        <span className="text-[9px] font-bold text-white uppercase tracking-[0.1em]">{integration.name}</span>
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>

          {/* Screen Overlays */}
          <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black/80 via-transparent to-black/20" />
          <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_100px_rgba(0,0,0,0.8)]" />
          <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.03),rgba(0,255,0,0.01),rgba(0,0,255,0.03))] bg-[length:100%_2px,3px_100%] opacity-[0.05]" />
        </motion.div>
      </div>
    </div>
  )
}
