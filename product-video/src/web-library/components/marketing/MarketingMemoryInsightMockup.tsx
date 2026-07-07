'use client'

import React from 'react'
import { Brain, Heart, X } from 'lucide-react'

export function MarketingMemoryInsightMockup() {
  const typeColor = 'var(--brain-insight-rgb)'
  const emotionColor = '#3B82F6' // Confidence

  return (
    <div
      className="card-glass pointer-events-auto w-full min-w-0 max-w-[20rem] overflow-hidden rounded-lg backdrop-blur-xl md:rounded-xl"
      style={{
        background: 'rgba(15, 15, 20, 0.85)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
      }}
    >
      {/* Header */}
      <div className="md:px-spacing-4 md:py-spacing-3 flex items-center justify-between border-b border-white/5 px-2 py-1.5">
        <div className="flex items-center gap-1 md:gap-2">
          <Brain
            className="size-3 shrink-0 md:size-[14px]"
            style={{ color: `rgb(${typeColor})` }}
          />
          <span
            className="inline-flex items-center rounded px-1 py-px text-[7px] font-semibold tracking-wide md:px-2 md:py-0.5 md:text-[10px] md:tracking-wider"
            style={{
              backgroundColor: `rgba(${typeColor}, 0.15)`,
              color: `rgb(${typeColor})`,
              border: `1px solid rgba(${typeColor}, 0.3)`,
            }}
          >
            INSIGHT
          </span>
        </div>
        <button
          type="button"
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="size-3 md:size-[14px]" />
        </button>
      </div>

      {/* Body */}
      <div className="md:p-spacing-4 space-y-2 p-2 md:space-y-4">
        <p className="text-[9px] font-medium leading-tight text-white md:text-[13px] md:leading-relaxed">
          Brand voice should shift toward "Outcome-Driven" for Q2 campaigns. Audience data shows 42%
          higher engagement when leading with specific ROI metrics over features.
        </p>

        {/* Significance & Confidence bars */}
        <div className="space-y-2 md:space-y-3">
          <div>
            <div className="mb-1 flex items-center justify-between md:mb-1.5">
              <span className="text-muted-foreground text-[8px] font-semibold uppercase tracking-wider md:text-[10px] md:tracking-widest">
                Significance
              </span>
              <span
                className="text-[8px] font-bold md:text-[10px]"
                style={{ color: `rgb(${typeColor})` }}
              >
                92%
              </span>
            </div>
            <div className="h-1 w-full overflow-hidden rounded-full bg-white/5">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `92%`, backgroundColor: `rgb(${typeColor})` }}
              />
            </div>
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between md:mb-1.5">
              <span className="text-muted-foreground text-[8px] font-semibold uppercase tracking-wider md:text-[10px] md:tracking-widest">
                Confidence
              </span>
              <span className="text-[8px] font-bold text-blue-400 md:text-[10px]">88%</span>
            </div>
            <div className="h-1 w-full overflow-hidden rounded-full bg-white/5">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `88%`, backgroundColor: '#60a5fa' }}
              />
            </div>
          </div>
        </div>

        {/* Emotional metadata (Dispenza Layer 2) */}
        <div className="space-y-2 border-t border-white/5 pt-1.5 md:space-y-3 md:pt-2">
          <div className="flex items-center gap-1 md:gap-2">
            <Heart className="size-2.5 shrink-0 md:size-3" style={{ color: emotionColor }} />
            <span className="text-muted-foreground text-[8px] font-semibold uppercase tracking-wider md:text-[10px] md:tracking-widest">
              Emotion
            </span>
            <span
              className="inline-flex items-center rounded px-1 py-px text-[7px] font-medium capitalize md:px-2 md:py-0.5 md:text-[10px]"
              style={{ backgroundColor: `${emotionColor}22`, color: emotionColor }}
            >
              confidence
            </span>
          </div>

          <div className="flex items-center gap-1 md:gap-2">
            <span className="text-muted-foreground text-[8px] font-semibold uppercase tracking-wider md:text-[10px] md:tracking-widest">
              Valence
            </span>
            <div className="relative h-1 flex-1 overflow-hidden rounded-full bg-white/5">
              <div
                className="absolute top-0 h-full rounded-full transition-all"
                style={{ left: '85%', width: '4px', backgroundColor: '#22c55e' }}
              />
              <div className="absolute left-1/2 top-0 h-full w-px bg-white/10" />
            </div>
            <span className="text-muted-foreground w-6 text-right text-[8px] font-bold md:w-8 md:text-[10px]">
              +0.7
            </span>
          </div>
        </div>

        {/* Metadata */}
        <div className="flex items-center justify-between border-t border-white/5 pt-1.5 md:pt-2">
          <span className="text-muted-foreground text-[8px] font-semibold uppercase tracking-wider md:text-[10px] md:tracking-widest">
            Source
          </span>
          <span className="text-[9px] font-medium text-white md:text-[11px]">Call Summary</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground text-[8px] font-semibold uppercase tracking-wider md:text-[10px] md:tracking-widest">
            Created
          </span>
          <span className="text-[9px] font-medium text-white md:text-[11px]">Mar 15, 2026</span>
        </div>
      </div>
    </div>
  )
}
