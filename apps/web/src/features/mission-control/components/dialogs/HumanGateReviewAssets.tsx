'use client'

import Image from 'next/image'
import { FileText } from 'lucide-react'
import { ArtifactInlinePreviewCard, type ArtifactPreviewType } from '@/components/artifacts'
import type { MissionDeliverable } from '../../types'

const INLINE_ARTIFACT_TYPES: Partial<Record<MissionDeliverable['type'], ArtifactPreviewType>> = {
  ad: 'ad',
  funnel: 'funnel',
  presentation: 'presentation',
  social_post: 'social-post',
  website: 'website',
}

interface HumanGateReviewAssetsProps {
  deliverables: MissionDeliverable[]
  onSelectDeliverable: (deliverable: MissionDeliverable) => void
}

function cleanTaskPrefix(title: string): string {
  return title.replace(/^Task\s*\d+[A-Z]?\s*[—–-]\s*/i, '').trim()
}

function resolveImageLabel(deliverable: MissionDeliverable, index: number): string {
  const base = cleanTaskPrefix(deliverable.title) || 'Generated image'
  return `Image ${index + 1} — ${base}`
}

function resolveImageUrl(deliverable: MissionDeliverable): string | null {
  if (deliverable.file_url) return deliverable.file_url
  const metadataUrl = deliverable.metadata?.image_url
  return typeof metadataUrl === 'string' && metadataUrl ? metadataUrl : null
}

function resolveImagePrompt(deliverable: MissionDeliverable): string | null {
  for (const value of [deliverable.metadata?.prompt, deliverable.metadata?.source_prompt]) {
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return null
}

export function HumanGateReviewAssets({
  deliverables,
  onSelectDeliverable,
}: HumanGateReviewAssetsProps) {
  const images = deliverables.filter((deliverable) => deliverable.type === 'image')
  const artifacts = deliverables.filter((deliverable) => INLINE_ARTIFACT_TYPES[deliverable.type])
  const documents = deliverables.filter(
    (deliverable) => deliverable.type !== 'image' && !INLINE_ARTIFACT_TYPES[deliverable.type],
  )

  if (deliverables.length === 0) return null

  return (
    <div className="space-y-spacing-3">
      {images.length > 0 ? (
        <div className="space-y-spacing-2">
          <h4 className="body-3 text-foreground font-semibold">Images to review</h4>
          <div className="gap-spacing-2 grid grid-cols-2">
            {images.map((deliverable, index) => {
              const label = resolveImageLabel(deliverable, index)
              const imageUrl = resolveImageUrl(deliverable)
              const prompt = resolveImagePrompt(deliverable)
              return (
                <button
                  key={deliverable.id}
                  type="button"
                  aria-label={`Open ${label}`}
                  onClick={() => onSelectDeliverable(deliverable)}
                  className="border-border bg-muted-20 rounded-spacing-2 p-spacing-2 space-y-spacing-1 overflow-hidden border text-left"
                >
                  {imageUrl ? (
                    <Image
                      src={imageUrl}
                      alt={label}
                      width={320}
                      height={400}
                      unoptimized
                      className="rounded-spacing-1 h-auto w-full object-cover"
                    />
                  ) : (
                    <div className="bg-secondary aspect-square w-full" aria-hidden="true" />
                  )}
                  <span className="body-4 text-foreground line-clamp-2 block">{label}</span>
                  {prompt ? (
                    <span className="body-4 text-muted-foreground line-clamp-3 block">
                      Prompt: {prompt}
                    </span>
                  ) : null}
                </button>
              )
            })}
          </div>
        </div>
      ) : null}

      {artifacts.length > 0 ? (
        <div className="space-y-spacing-2">
          <h4 className="body-3 text-foreground font-semibold">Visual previews</h4>
          <div className="space-y-spacing-2">
            {artifacts.map((deliverable) => (
              <ArtifactInlinePreviewCard
                key={deliverable.id}
                artifactType={INLINE_ARTIFACT_TYPES[deliverable.type]!}
                artifactId={deliverable.entity_id || deliverable.id}
                name={cleanTaskPrefix(deliverable.title)}
                imageUrl={resolveImageUrl(deliverable) ?? undefined}
                openPreviewOverride={() => onSelectDeliverable(deliverable)}
              />
            ))}
          </div>
        </div>
      ) : null}

      {documents.length > 0 ? (
        <div className="space-y-spacing-2">
          <h4 className="body-3 text-foreground font-semibold">Documents</h4>
          <div className="space-y-spacing-1">
            {documents.map((deliverable) => (
              <button
                key={deliverable.id}
                type="button"
                aria-label={`Open ${cleanTaskPrefix(deliverable.title)}`}
                onClick={() => onSelectDeliverable(deliverable)}
                className="bg-muted-20 hover:bg-hover-subtle rounded-spacing-2 px-spacing-3 py-spacing-2 gap-spacing-2 flex w-full items-center text-left"
              >
                <FileText className="icon-sm text-muted-foreground shrink-0" />
                <span className="body-3 text-foreground min-w-0 flex-1 truncate">
                  {cleanTaskPrefix(deliverable.title)}
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}
