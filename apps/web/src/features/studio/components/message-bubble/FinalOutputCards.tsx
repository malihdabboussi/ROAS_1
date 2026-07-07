'use client'

import type { ReactNode } from 'react'
import {
  FileText,
  FolderGit2,
  Image as ImageIcon,
  LayoutTemplate,
  Music2,
  Video,
} from 'lucide-react'
import type { ArtifactNodeType } from '@/lib/chat/attached-artifact'
import { missionDeliverableFromContentBlock, type MissionDeliverable } from '@/lib/missions'
import { cn } from '@/lib/utils/cn'
import { ARTIFACT_GLASS, ARTIFACT_ICON } from '../chat/ArtifactAttachments'
import type { ContentBlockChannelSource } from './message-bubble.types'
import type { FinalOutputBlock } from './message-bubble.utils'

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
    artifactType === 'custom-object'
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
      icon: ARTIFACT_ICON[nodeType] ?? <FileText className="icon-sm shrink-0" />,
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

function openDefaultOutput(block: FinalOutputBlock) {
  if (block.type === 'artifact_preview') {
    window.dispatchEvent(
      new CustomEvent('vibey-open-artifact', {
        detail: {
          artifactType: block.artifactType,
          artifactId: block.artifactId,
          name: block.name,
          spaceId: block.spaceId,
        },
      }),
    )
    return
  }

  if (block.type === 'document_card') {
    const documentId = block.documentId?.trim() ?? ''
    const spaceItemId = block.spaceItemId?.trim() ?? ''
    if (!documentId && !spaceItemId) return
    window.dispatchEvent(
      new CustomEvent('vibey-open-artifact', {
        detail: {
          artifactType: spaceItemId ? 'space_doc' : 'document',
          artifactId: spaceItemId || documentId,
          documentId,
          name: block.title,
          spaceId: block.spaceId,
          spaceItemId,
        },
      }),
    )
    return
  }

  if (block.type === 'pdf_file' || block.type === 'docx_file' || block.type === 'media_asset') {
    window.open(block.url, '_blank', 'noopener,noreferrer')
  }
}

export function FinalOutputCards({
  blocks,
  deliverableSource,
  onOpenDeliverablePreview,
}: {
  blocks: FinalOutputBlock[]
  deliverableSource?: ContentBlockChannelSource | null
  onOpenDeliverablePreview?: (deliverable: MissionDeliverable) => void
}) {
  if (blocks.length === 0) return null

  return (
    <div className="mt-spacing-2 gap-spacing-2 flex flex-col" data-final-output-cards>
      {blocks.map((block) => {
        const output = describeOutput(block)
        const glassClass = ARTIFACT_GLASS[output.nodeType] ?? 'badge-glass badge-glass-muted'

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
              openDefaultOutput(block)
            }}
            className="card-glass hover:bg-hover-subtle gap-spacing-3 rounded-spacing-3 p-spacing-2 flex w-full items-center text-left transition-colors"
          >
            <div className="h-spacing-14 w-spacing-16 border-border bg-muted rounded-spacing-2 flex shrink-0 items-center justify-center overflow-hidden border">
              {output.imageUrl ? (
                <img src={output.imageUrl} alt="" className="h-full w-full object-cover" />
              ) : output.videoUrl ? (
                <video src={output.videoUrl} muted className="h-full w-full object-cover" />
              ) : block.type === 'document_card' && output.subtitle ? (
                <span className="typo-caption text-muted-foreground px-spacing-2 line-clamp-3">
                  {output.subtitle}
                </span>
              ) : (
                <span className="text-muted-foreground">{output.icon}</span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="body-3 text-foreground truncate font-semibold">{output.title}</div>
              {output.subtitle ? (
                <div className="typo-caption text-muted-foreground mt-spacing-1 line-clamp-1">
                  {output.subtitle}
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
