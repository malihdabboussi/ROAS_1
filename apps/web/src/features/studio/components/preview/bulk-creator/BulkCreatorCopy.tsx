'use client'

import { useState } from 'react'
import { Check, Type } from 'lucide-react'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'

export interface CopyVariation {
  headline: string
  primaryText: string
  description: string
}

interface BulkCreatorCopyProps {
  variations: CopyVariation[]
  selectedIndex: number | null
  isGenerating: boolean
  generatingStatus?: string | null
  onSelect: (index: number) => void
  onGenerate: () => void
  onSkip: () => void
}

export function BulkCreatorCopy({
  variations,
  selectedIndex,
  isGenerating,
  generatingStatus,
  onSelect,
  onGenerate,
  onSkip,
}: BulkCreatorCopyProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editedCopy, setEditedCopy] = useState<CopyVariation | null>(null)

  const handleStartEdit = (index: number) => {
    setEditingIndex(index)
    const v = variations[index]
    if (v) {
      setEditedCopy({
        headline: v.headline ?? '',
        primaryText: v.primaryText ?? '',
        description: v.description ?? '',
      })
    }
  }

  const handleSaveEdit = () => {
    setEditingIndex(null)
    setEditedCopy(null)
  }

  if (isGenerating) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-8">
        <VibeyLoadingOrb size="md" />
        <span className="body-3 text-muted-foreground max-w-full animate-pulse truncate px-4 text-center">
          {generatingStatus || 'Generating copy variations...'}
        </span>
      </div>
    )
  }

  if (variations.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 py-8">
        <Type className="text-muted-foreground h-8 w-8" />
        <div className="text-center">
          <p className="body-1 font-semibold">Add Copy to Your Ads</p>
          <p className="body-2 text-muted-foreground mt-1">
            Generate headline, primary text, and description variations for your accepted creatives.
          </p>
        </div>
        <div className="gap-spacing-2 flex flex-col items-center">
          <button
            type="button"
            onClick={onGenerate}
            className="chip-glass-blue h-spacing-10 rounded-spacing-3 flex items-center gap-2 px-6 font-semibold transition-all"
          >
            Generate Copy
          </button>
          <button
            type="button"
            onClick={onSkip}
            className="body-4 text-muted-foreground hover:text-foreground transition-colors"
          >
            skip, create without copy
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="body-2 font-semibold">
          Select a copy variation{selectedIndex !== null ? ' (selected)' : ''}
        </span>
        <button
          type="button"
          onClick={onGenerate}
          className="chip-glass-neutral body-3 flex items-center gap-1 rounded-lg px-2 py-1 transition-all"
        >
          Regenerate
        </button>
      </div>

      <div className="flex flex-col gap-2">
        {variations.map((copy, index) => {
          const isSelected = selectedIndex === index
          const isEditing = editingIndex === index

          return (
            <button
              key={index}
              type="button"
              onClick={() => {
                if (!isEditing) onSelect(index)
              }}
              className={`relative rounded-lg p-3 text-left transition-all ${
                isSelected ? 'chip-glass-blue' : 'border-2 border-border hover:border-white/20'
              }`}
            >
              {isSelected && (
                <div className="chip-glass-green absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full">
                  <Check className="h-3 w-3" />
                </div>
              )}

              {isEditing && editedCopy ? (
                <div
                  className="flex flex-col gap-2"
                  onClick={(e) => e.stopPropagation()}
                  role="presentation"
                >
                  <input
                    type="text"
                    value={editedCopy.headline}
                    onChange={(e) => setEditedCopy({ ...editedCopy, headline: e.target.value })}
                    className="chip-glass-neutral body-2 rounded px-2 py-1 font-semibold"
                  />
                  <textarea
                    value={editedCopy.primaryText}
                    onChange={(e) => setEditedCopy({ ...editedCopy, primaryText: e.target.value })}
                    rows={3}
                    className="chip-glass-neutral body-3 rounded px-2 py-1"
                  />
                  <input
                    type="text"
                    value={editedCopy.description}
                    onChange={(e) => setEditedCopy({ ...editedCopy, description: e.target.value })}
                    className="chip-glass-neutral body-3 text-muted-foreground rounded px-2 py-1"
                  />
                  <button
                    type="button"
                    onClick={handleSaveEdit}
                    className="chip-glass-blue body-3 self-end rounded px-3 py-1"
                  >
                    Save
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="body-2 pr-6 font-semibold">{copy.headline}</p>
                  </div>
                  <p className="body-3 text-muted-foreground line-clamp-3 whitespace-pre-line">
                    {copy.primaryText}
                  </p>
                  <p className="body-3 text-muted-foreground mt-0.5 italic">{copy.description}</p>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleStartEdit(index)
                    }}
                    className="body-3 text-muted-foreground hover:text-foreground mt-1 self-end underline transition-all"
                  >
                    Edit
                  </button>
                </div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
