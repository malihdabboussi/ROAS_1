'use client'

import { useEffect, useRef, type ReactNode } from 'react'
import {
  FileText,
  FolderGit2,
  Image as ImageIcon,
  LayoutTemplate,
  Music2,
  Rocket,
  Video,
} from 'lucide-react'
import { MissionArtifactStatus } from '@/components/artifacts'
import type { ArtifactNodeType } from '@/lib/chat/attached-artifact'
import { useResilientImageSrc } from '@/lib/media/use-resilient-image-src'
import { missionDeliverableFromContentBlock, type MissionDeliverable } from '@/lib/missions'
import { cn } from '@/lib/utils/cn'
import { ARTIFACT_GLASS, ARTIFACT_ICON } from '../chat/ArtifactAttachments'
import type { ContentBlockChannelSource } from './message-bubble.types'
import type { FinalOutputBlock } from './message-bubble.utils'
import { openFinalOutputInShell } from './open-final-output-in-shell'

const ARTIFACT_LABELS: Record<string, string> = {
  offer: 'Offer',
  funnel: 'Funnel',
  avatar: 'Avatar',
  sequence: 'Sequence',
  email: 'Email',
  'visual-doc': 'Document',
  presentation: 'Presentation',
  ad: 'Ad',
  'ad-set': 'Ad set',
  'ad-campaign': 'Ad campaign',
  'social-post': 'Social post',
  'blog-post': 'Blog post',
  form: 'Form',
  task: 'Task',
  mission: 'Mission',
  flow: 'Flow',
  website: 'Website',
  theme: 'Theme',
  'custom-object': 'Object',
  campaign: 'Campaign',
  canvas: 'Canvas',
}

function cleanText(value: string | undefined): string {
  return (value ?? '').replace(/\s+/g, ' ').trim()
}

function artifactNodeType(artifactType: string): ArtifactNodeType {
  if (artifactType === 'task') return 'space-task'
  if (artifactType === 'website') return 'funnel'
  if (
    artifactType === 'social-post' ||
    artifactType === 'blog-post' ||
    artifactType === 'email' ||
    artifactType === 'visual-doc' ||
    artifactType === 'form' ||
    artifactType === 'mission' ||
    artifactType === 'flow' ||
    artifactType === 'theme' ||
    artifactType === 'custom-object' ||
    artifactType === 'canvas' ||
    artifactType === 'campaign'
  ) {
    return 'document'
  }
  return artifactType as ArtifactNodeType
}

function mediaNodeType(
  kind: Extract<FinalOutputBlock, { type: 'media_asset' }>['kind'],
): ArtifactNodeType {
  if (kind === 'image') return 'media-image'
  if (kind === 'video') return 'media-video'
  return 'document'
}

function describeOutput(block: FinalOutputBlock): {
  title: string
  subtitle: string
  label: string
  nodeType: ArtifactNodeType
  imageUrl?: string
  videoUrl?: string
  mediaAssetId?: string
  icon: ReactNode
} {
  if (block.type === 'artifact_preview') {
    const nodeType = artifactNodeType(block.artifactType)
    const label = ARTIFACT_LABELS[block.artifactType] ?? block.artifactType
    const title =
      block.artifactType === 'email' ? cleanText(block.emailSubject) || block.name : block.name
    return {
      title,
      subtitle:
        cleanText(block.subtitle) ||
        cleanText(block.bodyPreview) ||
        cleanText(block.status) ||
        `${label} created`,
      label,
      nodeType,
      imageUrl: block.imageUrl,
      videoUrl: block.videoUrl,
      icon:
        block.artifactType === 'mission' ? (
          <Rocket className="icon-sm shrink-0" />
        ) : (
          (ARTIFACT_ICON[nodeType] ?? <FileText className="icon-sm shrink-0" />)
        ),
    }
  }

  if (block.type === 'document_card') {
    return {
      title: block.title,
      subtitle: cleanText(block.snippet) || 'Document created',
      label: 'Document',
      nodeType: block.spaceItemId ? 'space_doc' : 'document',
      icon: ARTIFACT_ICON.document ?? <FileText className="icon-sm shrink-0" />,
    }
  }

  if (block.type === 'pdf_file' || block.type === 'docx_file') {
    return {
      title: block.label,
      subtitle: block.type === 'pdf_file' ? 'PDF file' : 'Document file',
      label: block.type === 'pdf_file' ? 'PDF' : 'DOCX',
      nodeType: 'document',
      icon: <FileText className="icon-sm shrink-0" />,
    }
  }

  if (block.type === 'media_asset') {
    const nodeType = mediaNodeType(block.kind)
    return {
      title: block.title,
      subtitle: cleanText(block.prompt) || cleanText(block.fileName) || `${block.kind} generated`,
      label: block.kind === 'image' ? 'Image' : block.kind === 'video' ? 'Video' : 'Media',
      nodeType,
      imageUrl: block.kind === 'image' ? block.url : undefined,
      videoUrl: block.kind === 'video' ? block.url : undefined,
      mediaAssetId: block.mediaAssetId,
      icon:
        block.kind === 'video' ? (
          <Video className="icon-sm shrink-0" />
        ) : block.kind === 'audio' ? (
          <Music2 className="icon-sm shrink-0" />
        ) : block.kind === 'image' ? (
          <ImageIcon className="icon-sm shrink-0" />
        ) : (
          <FileText className="icon-sm shrink-0" />
        ),
    }
  }

  if (block.type === 'project_preview') {
    return {
      title: block.name,
      subtitle: Array.isArray(block.files) ? `${block.files.length} files` : 'Project created',
      label: 'Project',
      nodeType: 'document',
      icon: <FolderGit2 className="icon-sm shrink-0" />,
    }
  }

  return {
    title: block.name,
    subtitle: 'Interactive output',
    label: 'Widget',
    nodeType: 'document',
    icon: <LayoutTemplate className="icon-sm shrink-0" />,
  }
}

function FinalOutputThumb({
  imageUrl,
  videoUrl,
  mediaAssetId,
  subtitle,
  icon,
  isDocumentSnippet,
}: {
  imageUrl?: string
  videoUrl?: string
  mediaAssetId?: string
  subtitle?: string
  icon: ReactNode
  isDocumentSnippet: boolean
}) {
  const resilient = useResilientImageSrc(imageUrl ?? '', { mediaAssetId })
  if (imageUrl) {
    if (resilient.loadState === 'error') {
      return <span className="text-muted-foreground">{icon}</span>
    }
    return (
      <img
        src={resilient.imgSrc}
        alt=""
        className={cn(
          'h-full w-full object-cover transition-opacity duration-300',
          resilient.loadState === 'loaded' ? 'opacity-100' : 'opacity-0',
        )}
        onLoad={resilient.onLoad}
        onError={resilient.onError}
      />
    )
  }
  if (videoUrl) {
    return <video src={videoUrl} muted className="h-full w-full object-cover" />
  }
  if (isDocumentSnippet && subtitle) {
    return (
      <span className="typo-caption text-muted-foreground px-spacing-2 line-clamp-3">
        {subtitle}
      </span>
    )
  }
  return <span className="text-muted-foreground">{icon}</span>
}

export function FinalOutputCards({
  blocks,
  deliverableSource,
  onOpenDeliverablePreview,
  autoOpen = false,
}: {
  blocks: FinalOutputBlock[]
  deliverableSource?: ContentBlockChannelSource | null
  onOpenDeliverablePreview?: (deliverable: MissionDeliverable) => void
  autoOpen?: boolean
}) {
  const autoOpenedBlockRef = useRef<string | null>(null)
  useEffect(() => {
    const block = blocks.at(-1)
    if (!autoOpen || !block || autoOpenedBlockRef.current === block.id) return
    autoOpenedBlockRef.current = block.id
    openFinalOutputInShell(block)
  }, [autoOpen, blocks])

  if (blocks.length === 0) return null

  return (
    <div className="mt-spacing-2 gap-spacing-2 flex flex-col" data-final-output-cards>
      {blocks.map((block) => {
        const output = describeOutput(block)
        const isMission = block.type === 'artifact_preview' && block.artifactType === 'mission'
        const glassClass = isMission
          ? 'badge-glass-purple'
          : (ARTIFACT_GLASS[output.nodeType] ?? 'badge-glass badge-glass-muted')

        return (
          <button
            key={`${block.type}:${block.id}`}
            type="button"
            onClick={() => {
              if (deliverableSource && onOpenDeliverablePreview) {
                const deliverable = missionDeliverableFromContentBlock(block, deliverableSource)
                if (deliverable) {
                  onOpenDeliverablePreview(deliverable)
                  return
                }
              }
              openFinalOutputInShell(block)
            }}
            className="card-glass hover:bg-hover-subtle gap-spacing-3 rounded-spacing-3 p-spacing-2 flex w-full items-center text-left transition-colors"
          >
            <div
              className={cn(
                'h-spacing-14 w-spacing-16 border-border rounded-spacing-2 flex shrink-0 items-center justify-center overflow-hidden border',
                isMission ? 'badge-glass-purple' : 'bg-muted',
              )}
            >
              <FinalOutputThumb
                imageUrl={output.imageUrl}
                videoUrl={output.videoUrl}
                mediaAssetId={output.mediaAssetId}
                subtitle={output.subtitle}
                icon={output.icon}
                isDocumentSnippet={block.type === 'document_card'}
              />
            </div>
            <div className="min-w-0 flex-1">
              <div className="body-3 text-foreground truncate font-semibold">{output.title}</div>
              {output.subtitle ? (
                <div className="typo-caption text-muted-foreground mt-spacing-1 line-clamp-1">
                  {block.type === 'artifact_preview' && block.artifactType === 'mission' ? (
                    <MissionArtifactStatus
                      missionId={block.artifactId}
                      fallback={output.subtitle}
                    />
                  ) : (
                    output.subtitle
                  )}
                </div>
              ) : null}
              <div className="mt-spacing-2 gap-spacing-2 flex min-w-0 items-center">
                <span className={cn(glassClass, 'typo-caption shrink-0 font-medium uppercase')}>
                  {output.label}
                </span>
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
}
