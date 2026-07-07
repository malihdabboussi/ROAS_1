import { describe, expect, it } from 'vitest'

import {
  artifactBadgeClass,
  artifactCardMaxWidthClass,
  previewTypeToArtifactNodeType,
} from './artifact-card-display'

describe('artifact card display helpers', () => {
  it('maps preview types to stable card width classes', () => {
    expect(artifactCardMaxWidthClass('doc')).toBe('max-w-artifact-medium')
    expect(artifactCardMaxWidthClass('funnel')).toBe('max-w-artifact-wide')
    expect(artifactCardMaxWidthClass('website')).toBe('max-w-artifact-wide')
    expect(artifactCardMaxWidthClass('presentation')).toBe('max-w-artifact-wide')
    expect(artifactCardMaxWidthClass('avatar')).toBe('max-w-artifact-wide')
    expect(artifactCardMaxWidthClass('social_post')).toBe('max-w-artifact-square')
    expect(artifactCardMaxWidthClass('ad')).toBe('max-w-artifact-square')
    expect(artifactCardMaxWidthClass('offer')).toBe('max-w-artifact-compact')
    expect(artifactCardMaxWidthClass('form')).toBe('max-w-artifact-medium')
    expect(artifactCardMaxWidthClass('ad_campaign')).toBe('max-w-artifact-medium')
    expect(artifactCardMaxWidthClass('ad_set')).toBe('max-w-artifact-medium')
    expect(artifactCardMaxWidthClass('sequence')).toBe('max-w-artifact-medium')
    expect(artifactCardMaxWidthClass('email')).toBe('max-w-artifact-medium')
    expect(artifactCardMaxWidthClass('task')).toBe('max-w-artifact-medium')
    expect(artifactCardMaxWidthClass('mission')).toBe('max-w-artifact-medium')
    expect(artifactCardMaxWidthClass('flow')).toBe('max-w-artifact-medium')
    expect(artifactCardMaxWidthClass('theme')).toBe('max-w-artifact-medium')
    expect(artifactCardMaxWidthClass('custom_object')).toBe('max-w-artifact-medium')
  })

  it('maps preview types to draggable artifact node types', () => {
    expect(previewTypeToArtifactNodeType('doc')).toBe('document')
    expect(previewTypeToArtifactNodeType('funnel')).toBe('funnel')
    expect(previewTypeToArtifactNodeType('website')).toBe('funnel')
    expect(previewTypeToArtifactNodeType('presentation')).toBe('presentation')
    expect(previewTypeToArtifactNodeType('avatar')).toBe('avatar')
    expect(previewTypeToArtifactNodeType('social_post')).toBe('social-post')
    expect(previewTypeToArtifactNodeType('ad')).toBe('ad')
    expect(previewTypeToArtifactNodeType('ad_campaign')).toBe('ad-campaign')
    expect(previewTypeToArtifactNodeType('ad_set')).toBe('ad-set')
    expect(previewTypeToArtifactNodeType('sequence')).toBe('sequence')
    expect(previewTypeToArtifactNodeType('email')).toBe('email')
    expect(previewTypeToArtifactNodeType('form')).toBe('form')
    expect(previewTypeToArtifactNodeType('offer')).toBe('offer')
    expect(previewTypeToArtifactNodeType('task')).toBe('task')
    expect(previewTypeToArtifactNodeType('mission')).toBe('mission')
    expect(previewTypeToArtifactNodeType('flow')).toBe('flow')
    expect(previewTypeToArtifactNodeType('theme')).toBe('theme')
    expect(previewTypeToArtifactNodeType('custom_object')).toBe('custom-object')
  })

  it('maps badge tones to glass classes with muted fallback', () => {
    expect(artifactBadgeClass('green')).toBe('badge-glass-green')
    expect(artifactBadgeClass('orange')).toBe('badge-glass-orange')
    expect(artifactBadgeClass('red')).toBe('badge-glass-red')
    expect(artifactBadgeClass('purple')).toBe('badge-glass-purple')
    expect(artifactBadgeClass('blue')).toBe('badge-glass-blue')
    expect(artifactBadgeClass()).toBe('badge-glass-muted')
  })
})
