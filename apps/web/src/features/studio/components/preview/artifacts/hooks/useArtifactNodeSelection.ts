'use client'

import { useCallback } from 'react'
import type { ArtifactPreviewResource } from '@/lib/artifacts'
import type { ArtifactsState, TreeNode } from '../tree/types'
import {
  getCategorySettingsResource,
  getFirstSortedFunnelPage,
  getLatestBlogPostForFunnel,
  toSelectedFunnel,
  toSelectedPresentation,
  type SelectedFunnel,
  type SelectedPresentation,
} from './useArtifactSelection.helpers'

interface UseArtifactNodeSelectionParams {
  artifactsRef: React.MutableRefObject<ArtifactsState>
  activeThemeId: string | null
  setSelectedId: React.Dispatch<React.SetStateAction<string | null>>
  setSelectedResource: React.Dispatch<React.SetStateAction<ArtifactPreviewResource | null>>
  setSelectedFunnel: React.Dispatch<React.SetStateAction<SelectedFunnel | null>>
  setSelectedPresentation: React.Dispatch<React.SetStateAction<SelectedPresentation | null>>
  resetPagePreview: () => void
  setCurrentPageId: React.Dispatch<React.SetStateAction<string | null>>
  loadFunnelPagePreview: (
    funnelId: string,
    pageId: string,
    options?: {
      updateCurrentPageId?: boolean
      keepPreviewMounted?: boolean
    },
  ) => Promise<void>
}

export function useArtifactNodeSelection({
  artifactsRef,
  activeThemeId,
  setSelectedId,
  setSelectedResource,
  setSelectedFunnel,
  setSelectedPresentation,
  resetPagePreview,
  setCurrentPageId,
  loadFunnelPagePreview,
}: UseArtifactNodeSelectionParams) {
  const handleSelect = useCallback(
    async (node: TreeNode) => {
      const currentArtifacts = artifactsRef.current
      setSelectedId(node.id)
      resetPagePreview()
      setSelectedFunnel(null)
      setSelectedPresentation(null)

      if (node.type === 'category') {
        const categoryResource = getCategorySettingsResource(node.id, node.label)
        if (categoryResource) setSelectedResource(categoryResource)
        return
      }

      if (node.type === 'page' && node.funnelId && node.pageId) {
        const funnel = currentArtifacts.funnels.find((candidate) => candidate.id === node.funnelId)
        if (funnel) {
          setSelectedFunnel(toSelectedFunnel(funnel, activeThemeId))
        }

        setSelectedResource({
          type: 'page',
          id: node.pageId,
          funnelId: node.funnelId,
          pageId: node.pageId,
          name: node.label,
        })
        await loadFunnelPagePreview(node.funnelId, node.pageId, {
          updateCurrentPageId: false,
          keepPreviewMounted: false,
        })
        return
      }

      if (node.type === 'website-blog' && node.funnelId) {
        const funnel = currentArtifacts.funnels.find((candidate) => candidate.id === node.funnelId)
        if (funnel) {
          setSelectedFunnel(toSelectedFunnel(funnel, activeThemeId))
        }
        const post = getLatestBlogPostForFunnel(currentArtifacts.blogPosts, node.funnelId)
        if (post) {
          setSelectedResource({
            type: 'blog-post',
            id: post.id,
            funnelId: node.funnelId,
            name: post.title || post.slug,
          })
        } else {
          setSelectedResource({
            type: 'blog-hub',
            funnelId: node.funnelId,
            name: 'Blog',
          })
        }
        return
      }

      if (node.type === 'funnel' && node.resourceId) {
        const funnel = currentArtifacts.funnels.find(
          (candidate) => candidate.id === node.resourceId,
        )
        if (funnel) {
          setSelectedFunnel(toSelectedFunnel(funnel, activeThemeId))
          setSelectedResource({ type: 'funnel', id: funnel.id, name: funnel.name })

          const firstPage = getFirstSortedFunnelPage(funnel)
          if (firstPage) {
            await loadFunnelPagePreview(funnel.id, firstPage.id, {
              updateCurrentPageId: true,
              keepPreviewMounted: false,
            })
          } else {
            setCurrentPageId(null)
          }
        }
        return
      }

      if (node.type === 'offer' && node.resourceId) {
        setSelectedResource({ type: 'offer', id: node.resourceId, name: node.label })
      } else if (node.type === 'offer-step' && node.resourceId && node.stepNumber) {
        setSelectedResource({
          type: 'offer-step',
          id: node.resourceId,
          stepNumber: node.stepNumber,
          name: node.label,
        })
      } else if (node.type === 'ad' && node.resourceId) {
        setSelectedResource({ type: 'ad', id: node.resourceId, name: node.label })
      } else if (node.type === 'ad-campaign' && node.resourceId) {
        setSelectedResource({ type: 'ad-campaign', id: node.resourceId, name: node.label })
      } else if (node.type === 'ad-set' && node.resourceId) {
        setSelectedResource({ type: 'ad-set', id: node.resourceId, name: node.label })
      } else if (node.type === 'sequence' && node.resourceId) {
        setSelectedResource({ type: 'sequence', id: node.resourceId, name: node.label })
      } else if (node.type === 'sequence-email' && node.resourceId) {
        setSelectedResource({
          type: 'sequence',
          id: node.resourceId,
          emailId: node.emailId,
          name: node.label,
        })
      } else if (node.type === 'presentation' && node.resourceId) {
        const presentation = currentArtifacts.presentations.find(
          (candidate) => candidate.id === node.resourceId,
        )
        if (presentation) {
          setSelectedPresentation(toSelectedPresentation(presentation))
        }
        setSelectedResource({ type: 'presentation', id: node.resourceId, name: node.label })
      } else if (node.type === 'avatar' && node.resourceId) {
        setSelectedResource({ type: 'avatar', id: node.resourceId, name: node.label })
      } else if (node.type === 'social-post' && node.resourceId) {
        setSelectedResource({ type: 'social-post', id: node.resourceId, name: node.label })
      } else if (node.type === 'blog-post' && node.resourceId) {
        const funnelId =
          node.funnelId ??
          currentArtifacts.blogPosts.find((post) => post.id === node.resourceId)?.funnel_id
        if (funnelId) {
          setSelectedId(`website-blog-${funnelId}`)
          const funnel = currentArtifacts.funnels.find((candidate) => candidate.id === funnelId)
          if (funnel) {
            setSelectedFunnel(toSelectedFunnel(funnel, activeThemeId))
          }
        }
        setSelectedResource({
          type: 'blog-post',
          id: node.resourceId,
          funnelId,
          name: node.label,
        })
      } else if (node.type === 'social-platform' && node.id?.startsWith('social-')) {
        const platform = node.id.replace('social-', '') as 'linkedin' | 'instagram'
        const firstPost = currentArtifacts.socialPosts.find((post) => post.platform === platform)
        if (firstPost) {
          setSelectedResource({
            type: 'social-post',
            id: firstPost.id,
            name:
              firstPost.headline?.trim() ||
              firstPost.caption?.slice(0, 60) ||
              `${platform} Post`,
          })
        }
      }
    },
    [
      activeThemeId,
      artifactsRef,
      loadFunnelPagePreview,
      resetPagePreview,
      setCurrentPageId,
      setSelectedFunnel,
      setSelectedId,
      setSelectedPresentation,
      setSelectedResource,
    ],
  )

  const selectBlogPostById = useCallback(
    (postId: string) => {
      const currentArtifacts = artifactsRef.current
      const post = currentArtifacts.blogPosts.find((candidate) => candidate.id === postId)
      if (!post) return
      setSelectedId(`website-blog-${post.funnel_id}`)
      setSelectedFunnel((prev) => {
        const funnel = currentArtifacts.funnels.find((candidate) => candidate.id === post.funnel_id)
        if (!funnel) return prev
        return toSelectedFunnel(funnel, activeThemeId)
      })
      setSelectedResource({
        type: 'blog-post',
        id: postId,
        funnelId: post.funnel_id,
        name: post.title || post.slug,
      })
    },
    [activeThemeId, artifactsRef, setSelectedFunnel, setSelectedId, setSelectedResource],
  )

  return {
    handleSelect,
    selectBlogPostById,
  }
}
