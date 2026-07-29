'use client'

import { openArtifactInShell } from '@/lib/artifacts'
import { AdArtifactInlinePreview } from './AdArtifactInlinePreview'
import type { ArtifactInlinePreviewCardProps } from './artifact-inline-preview.types'
import { AvatarArtifactInlinePreview } from './AvatarArtifactInlinePreview'
import { BlogPostArtifactInlinePreview } from './BlogPostArtifactInlinePreview'
import { DefaultArtifactInlinePreview } from './DefaultArtifactInlinePreview'
import { EmailPreviewChatCard } from './EmailPreviewChatCard'
import { EmailSequenceArtifactInlinePreview } from './EmailSequenceArtifactInlinePreview'
import { FunnelArtifactInlinePreview } from './FunnelArtifactInlinePreview'
import { OfferArtifactInlinePreview } from './OfferArtifactInlinePreview'
import { PresentationArtifactInlinePreview } from './PresentationArtifactInlinePreview'
import { SocialPostArtifactInlinePreview } from './SocialPostArtifactInlinePreview'
import { VisualDocArtifactInlinePreview } from './VisualDocArtifactInlinePreview'

export function ArtifactInlinePreviewCard({
  artifactType,
  artifactId,
  name,
  subtitle,
  career,
  age,
  backgroundProfile,
  bodyPreview,
  emailSubject,
  funnelPageId,
  spaceId,
  imageUrl,
  videoUrl,
  status,
  openPreviewOverride,
}: ArtifactInlinePreviewCardProps) {
  const handleClick = () => {
    if (openPreviewOverride) {
      openPreviewOverride()
      return
    }
    if (artifactType === 'task' && spaceId) {
      openArtifactInShell({
        id: artifactId,
        entityId: artifactId,
        entityTable: 'space_items',
        spaceId,
        title: name,
        type: 'task',
      })
      return
    }
    window.dispatchEvent(
      new CustomEvent('vibey-open-artifact', {
        detail: { artifactType, artifactId, name, spaceId },
      }),
    )
  }

  if (artifactType === 'avatar') {
    return (
      <AvatarArtifactInlinePreview
        artifactId={artifactId}
        name={name}
        subtitle={subtitle}
        career={career}
        age={age}
        backgroundProfile={backgroundProfile}
        imageUrl={imageUrl}
        onClick={handleClick}
      />
    )
  }

  if (artifactType === 'sequence' && bodyPreview) {
    return (
      <EmailSequenceArtifactInlinePreview
        artifactId={artifactId}
        name={name}
        bodyPreview={bodyPreview}
        emailSubject={emailSubject}
        onClick={handleClick}
      />
    )
  }
  if (artifactType === 'sequence') {
    return (
      <EmailSequenceArtifactInlinePreview
        artifactId={artifactId}
        name={name}
        onClick={handleClick}
      />
    )
  }

  if (artifactType === 'funnel') {
    return (
      <FunnelArtifactInlinePreview
        artifactId={artifactId}
        funnelPageId={funnelPageId}
        name={name}
        onClick={handleClick}
      />
    )
  }

  if (artifactType === 'social-post') {
    return (
      <SocialPostArtifactInlinePreview
        artifactId={artifactId}
        name={name}
        imageUrl={imageUrl}
        videoUrl={videoUrl}
        onClick={handleClick}
      />
    )
  }

  if (artifactType === 'presentation') {
    return (
      <PresentationArtifactInlinePreview
        artifactId={artifactId}
        name={name}
        onClick={handleClick}
      />
    )
  }

  if (artifactType === 'blog-post') {
    return (
      <BlogPostArtifactInlinePreview artifactId={artifactId} name={name} onClick={handleClick} />
    )
  }

  if (artifactType === 'ad') {
    return (
      <AdArtifactInlinePreview
        artifactId={artifactId}
        name={name}
        imageUrl={imageUrl}
        onClick={handleClick}
      />
    )
  }

  if (artifactType === 'offer') {
    return <OfferArtifactInlinePreview artifactId={artifactId} name={name} onClick={handleClick} />
  }

  if (artifactType === 'email') {
    const previewSnippet = bodyPreview?.trim() ?? subtitle?.trim() ?? ''
    const line = emailSubject?.trim() ?? name?.trim()
    return (
      <EmailPreviewChatCard
        title={line || 'Email draft'}
        snippet={previewSnippet}
        onClick={handleClick}
      />
    )
  }

  if (artifactType === 'visual-doc') {
    return (
      <VisualDocArtifactInlinePreview
        artifactId={artifactId}
        spaceId={spaceId}
        name={name}
        onClick={handleClick}
      />
    )
  }

  return (
    <DefaultArtifactInlinePreview
      artifactType={artifactType}
      name={name}
      subtitle={subtitle}
      imageUrl={imageUrl}
      status={status}
      onClick={handleClick}
    />
  )
}
