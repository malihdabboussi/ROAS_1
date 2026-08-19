'use client'

import { useCallback, useEffect, useState, type ReactNode } from 'react'
import {
  CheckCircle2,
  ClipboardList,
  Layers,
  LayoutTemplate,
  Mail,
  MousePointer2,
  Package,
  Smartphone,
  Target,
  UserCircle2,
} from 'lucide-react'
import {
  fetchBlogPosts,
  fetchCampaignAvatars,
  fetchCampaignEmails,
  fetchCampaignFormAggregates,
  fetchCampaignForms,
  fetchCampaignFunnels,
  fetchCampaignOffers,
  fetchCampaignPresentations,
  fetchCampaignSequences,
  fetchCampaignSocialPosts,
  fetchSpaceEmails,
  fetchSpaceFormAggregates,
  fetchSpaceForms,
} from '@/features/studio/services/artifact-preview.service'
import { fetchWorkflowGraph } from '@/features/studio/services/workflow.service'
import { cachedFetch } from '@/lib/cache/keyed-fetch-cache'
import { loadAllArtifactSupportMaps, useAllArtifactRows } from '../../hooks/use-all-artifact-rows'
import { getAllArtifactsConfig } from '../../lib/all-artifacts'
import { useSpacesStore } from '../../store/use-spaces-store'
import type { ArtifactViewBaseConfig, ViewDef } from '../../types/space-schema'
import { SpaceNeedsCampaignState } from '../content/SpaceNeedsCampaignState'
import type { ArtifactPreviewSelection } from './artifact-preview-selection'
import {
  avatarRows,
  emailRows,
  formRows,
  funnelRows,
  offerRows,
  presentationRows,
  sequenceRows,
  socialPostRows,
  websiteRows,
} from './artifact-view-rows'
import { ArtifactSpaceView } from './ArtifactSpaceView'
import { PaidAdsSpaceView } from './paid-ads/PaidAdsSpaceView'
import { useArtifactRows } from './use-artifact-rows'

interface ArtifactViewProps {
  campaignId: string | null
  activeView: ViewDef
  selection: ArtifactPreviewSelection | null
  onSelectionChange: (next: ArtifactPreviewSelection | null) => void
  onDetailChange?: (open: boolean) => void
  onArtifactDeepMetaChange?: (meta: { id: string; title: string } | null) => void
  artifactDeepToolbarExtras?: ReactNode
  includeCampaignArtifacts: boolean
}

function MissingCampaign() {
  return <SpaceNeedsCampaignState viewLabel="This artifact view" />
}

function FunnelEmptyMockup() {
  return (
    <div aria-hidden className="relative h-48 w-80 select-none">
      {/* Step 1: Opt-in (Back Left) */}
      <div className="card-glass left-spacing-2 top-spacing-20 gap-spacing-1-5 p-spacing-2 absolute flex h-24 w-20 -rotate-6 flex-col opacity-40">
        <div className="bg-secondary h-spacing-6 rounded-spacing-1 w-full" />
        <div className="bg-secondary h-spacing-1 w-3/4 rounded-full" />
        <div className="bg-muted-foreground h-spacing-2 mt-auto w-full rounded-full opacity-25" />
      </div>

      {/* Step 2: Sales Page (Center Focus - Real Hero Section Mockup) */}
      <div className="card-glass top-spacing-4 absolute left-1/2 flex h-44 w-36 -translate-x-1/2 rotate-2 flex-col overflow-hidden p-0 shadow-2xl">
        {/* Faux Browser Header */}
        <div className="border-border gap-spacing-1 bg-muted px-spacing-2 py-spacing-1 flex items-center border-b opacity-80">
          <div className="bg-muted-foreground h-spacing-1 w-spacing-1 rounded-full opacity-20" />
          <div className="bg-muted-foreground h-spacing-1 w-spacing-1 rounded-full opacity-20" />
          <div className="bg-muted-foreground h-spacing-1 w-spacing-1 rounded-full opacity-20" />
          <div className="bg-muted-foreground ml-spacing-2 h-spacing-1-5 w-1/2 rounded-full opacity-10" />
        </div>

        <div className="gap-spacing-3 p-spacing-2-5 flex flex-1 flex-col">
          {/* Hero Content Area */}
          <div className="rounded-spacing-1 bg-muted px-spacing-2 py-spacing-4 relative flex flex-1 flex-col items-center justify-center text-center">
            {/* Logo/Nav Mockup */}
            <div className="left-spacing-2 top-spacing-2 gap-spacing-1 absolute z-10 flex w-full items-center">
              <div className="bg-muted-foreground h-spacing-2 w-spacing-2 rounded-full opacity-25" />
              <div className="bg-secondary h-spacing-1 w-spacing-8 rounded-full" />
            </div>

            {/* Headline Skeleton */}
            <div className="mb-spacing-2 space-y-spacing-1 z-10 w-full">
              <div className="bg-foreground h-spacing-2 mx-auto w-full rounded-full opacity-20" />
              <div className="bg-foreground h-spacing-2 mx-auto w-4/5 rounded-full opacity-20" />
            </div>

            {/* Subhead Skeleton */}
            <div className="mb-spacing-4 space-y-spacing-1 z-10 w-full opacity-60">
              <div className="bg-muted-foreground h-spacing-1 mx-auto w-3/4 rounded-full opacity-20" />
              <div className="bg-muted-foreground h-spacing-1 mx-auto w-1/2 rounded-full opacity-20" />
            </div>

            {/* CTA Button Mockup */}
            <div className="bg-primary h-spacing-4 relative z-10 w-3/4 overflow-hidden rounded-full opacity-40">
              <div className="animate-shimmer absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent" />
            </div>

            {/* Media/Image Mockup (Floating) */}
            <div className="bg-secondary border-border -bottom-spacing-1 right-spacing-1 h-spacing-8 w-spacing-12 rounded-spacing-1 absolute z-10 border opacity-80 shadow-sm" />

            <div className="animate-shimmer rounded-spacing-1 absolute inset-0 z-10 -translate-x-full bg-gradient-to-r from-transparent via-white/5 to-transparent" />
          </div>

          {/* Footer/Meta Skeleton */}
          <div className="space-y-spacing-1">
            <div className="bg-secondary h-spacing-2 w-full rounded-full" />
            <div className="bg-secondary h-spacing-1-5 w-2/3 rounded-full opacity-60" />
          </div>
        </div>

        {/* Interactive Element: The Cursor */}
        <div className="bottom-spacing-4 right-spacing-4 absolute rotate-12 transition-transform hover:scale-110">
          <MousePointer2 className="icon-sm text-foreground drop-shadow-lg" />
        </div>
      </div>

      {/* Step 3: Success (Back Right) */}
      <div className="card-glass right-spacing-2 top-spacing-24 gap-spacing-1 p-spacing-1-5 absolute flex h-20 w-16 rotate-12 flex-col opacity-40">
        <div className="bg-secondary h-spacing-4 rounded-spacing-1 w-full" />
        <div className="bg-muted-foreground h-spacing-1 mx-auto w-1/2 rounded-full opacity-25" />
      </div>

      {/* Decorative Glows */}
      <div className="h-spacing-16 w-spacing-16 bg-muted-foreground absolute left-1/4 top-1/2 -z-10 rounded-full opacity-10 blur-2xl" />
      <div className="h-spacing-20 w-spacing-20 bg-secondary absolute bottom-1/4 right-1/4 -z-10 rounded-full opacity-10 blur-3xl" />
    </div>
  )
}

function FormEmptyMockup() {
  return (
    <div aria-hidden className="relative h-48 w-80 select-none">
      {/* Background Decorative Form Sheet */}
      <div className="card-glass left-spacing-4 top-spacing-8 absolute h-32 w-24 -rotate-12 opacity-30">
        <div className="p-spacing-2 space-y-spacing-2">
          <div className="bg-secondary h-spacing-2 w-full rounded-full" />
          <div className="bg-secondary h-spacing-1-5 w-3/4 rounded-full" />
          <div className="bg-secondary h-spacing-1-5 w-1/2 rounded-full" />
        </div>
      </div>

      {/* Main Form Card */}
      <div className="card-glass top-spacing-2 gap-spacing-3 p-spacing-3 absolute left-1/2 flex h-44 w-40 -translate-x-1/2 rotate-1 flex-col shadow-xl">
        <div className="gap-spacing-2 border-border pb-spacing-2 flex items-center border-b">
          <ClipboardList className="icon-xs text-muted-foreground opacity-80" />
          <div className="bg-secondary h-spacing-2 w-2/3 rounded-full" />
        </div>

        <div className="gap-spacing-3 flex flex-1 flex-col">
          {/* Form Fields */}
          <div className="space-y-spacing-1">
            <div className="bg-secondary h-spacing-1-5 w-1/3 rounded-full opacity-40" />
            <div className="bg-secondary h-spacing-6 rounded-spacing-1 border-border w-full border opacity-20" />
          </div>
          <div className="space-y-spacing-1">
            <div className="bg-secondary h-spacing-1-5 w-1/4 rounded-full opacity-40" />
            <div className="bg-secondary h-spacing-6 rounded-spacing-1 border-border w-full border opacity-20" />
          </div>

          {/* Submit Button */}
          <div className="bg-primary h-spacing-6 rounded-spacing-1 relative mt-auto w-full overflow-hidden opacity-40">
            <div className="animate-shimmer absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent" />
            <div className="flex h-full items-center justify-center">
              <div className="bg-foreground h-spacing-1-5 w-1/3 rounded-full opacity-40" />
            </div>
          </div>
        </div>

        {/* Interactive Element: The Cursor */}
        <div className="bottom-spacing-2 right-spacing-2 absolute rotate-12 transition-transform hover:scale-110">
          <MousePointer2 className="icon-sm text-foreground drop-shadow-lg" />
        </div>
      </div>

      {/* Floating Success Badge */}
      <div className="right-spacing-4 top-spacing-12 h-spacing-12 w-spacing-12 border-border bg-secondary absolute flex rotate-12 items-center justify-center rounded-full border">
        <CheckCircle2 className="icon-sm text-muted-foreground opacity-55" />
      </div>

      {/* Decorative Glows */}
      <div className="h-spacing-20 w-spacing-20 bg-muted-foreground absolute left-1/3 top-1/2 -z-10 rounded-full opacity-5 blur-3xl" />
      <div className="h-spacing-16 w-spacing-16 bg-secondary absolute right-1/4 top-1/4 -z-10 rounded-full opacity-10 blur-2xl" />
    </div>
  )
}

function WebsiteEmptyMockup() {
  return (
    <div aria-hidden className="relative h-48 w-80 select-none">
      {/* Main Browser Window - Straight, clean, modern */}
      <div className="card-glass inset-x-spacing-4 inset-y-spacing-2 absolute flex flex-col overflow-hidden p-0 shadow-2xl">
        {/* Browser Chrome */}
        <div className="h-spacing-6 gap-spacing-1.5 border-border bg-muted px-spacing-3 flex items-center border-b opacity-90">
          <div className="gap-spacing-1 flex">
            <div className="h-spacing-1.5 w-spacing-1.5 bg-muted-foreground rounded-full opacity-25" />
            <div className="h-spacing-1.5 w-spacing-1.5 bg-muted-foreground rounded-full opacity-25" />
            <div className="h-spacing-1.5 w-spacing-1.5 bg-muted-foreground rounded-full opacity-25" />
          </div>
          <div className="h-spacing-3 border-border bg-background mx-auto flex w-1/2 items-center justify-center rounded-full border shadow-sm">
            <div className="h-spacing-1 bg-muted-foreground w-1/3 rounded-full opacity-25" />
          </div>
        </div>

        {/* Builder Interface */}
        <div className="flex flex-1">
          {/* Sidebar (Pages/Layers) */}
          <div className="gap-spacing-2 border-border bg-secondary p-spacing-2 flex w-1/4 flex-col border-r">
            <div className="h-spacing-1.5 bg-muted-foreground w-3/4 rounded-full opacity-30" />
            <div className="h-spacing-1.5 bg-muted-foreground w-full rounded-full opacity-15" />
            <div className="h-spacing-1.5 bg-muted-foreground w-5/6 rounded-full opacity-15" />
            <div className="h-spacing-1.5 bg-muted-foreground w-full rounded-full opacity-15" />
          </div>

          {/* Main Canvas */}
          <div className="gap-spacing-2 bg-muted p-spacing-3 flex flex-1 flex-col">
            {/* Nav */}
            <div className="flex items-center justify-between">
              <div className="h-spacing-2 w-spacing-6 bg-muted-foreground rounded-full opacity-25" />
              <div className="gap-spacing-1 flex">
                <div className="h-spacing-1 w-spacing-3 bg-muted-foreground rounded-full opacity-15" />
                <div className="h-spacing-1 w-spacing-3 bg-muted-foreground rounded-full opacity-15" />
              </div>
            </div>

            {/* Hero */}
            <div className="h-spacing-12 gap-spacing-1.5 rounded-spacing-1 border-border bg-secondary relative flex w-full flex-col items-center justify-center border">
              <div className="h-spacing-2 bg-muted-foreground w-1/2 rounded-full opacity-25" />
              <div className="h-spacing-1.5 bg-muted-foreground w-1/3 rounded-full opacity-15" />
              <div className="mt-spacing-1 h-spacing-3 w-spacing-8 bg-primary rounded-full opacity-40" />
            </div>

            {/* Features Grid */}
            <div className="gap-spacing-2 flex flex-1">
              <div className="rounded-spacing-1 border-border bg-secondary flex-1 border" />
              <div className="rounded-spacing-1 border-border bg-secondary flex-1 border" />
              <div className="rounded-spacing-1 border-border bg-secondary flex-1 border" />
            </div>
          </div>
        </div>
      </div>

      {/* Floating Element: A "Component Block" being dragged */}
      <div className="card-glass bottom-spacing-6 right-spacing-6 h-spacing-8 w-spacing-24 gap-spacing-2 p-spacing-1.5 absolute flex rotate-3 items-center shadow-xl">
        <div className="w-spacing-6 border-border bg-secondary h-full rounded-sm border" />
        <div className="gap-spacing-1 flex flex-1 flex-col">
          <div className="h-spacing-1 bg-muted-foreground w-full rounded-full opacity-25" />
          <div className="h-spacing-1 bg-muted-foreground w-2/3 rounded-full opacity-15" />
        </div>
        <div className="-bottom-spacing-3 -right-spacing-2 absolute">
          <MousePointer2 className="icon-sm text-muted-foreground drop-shadow-md" />
        </div>
      </div>

      {/* Decorative Glows */}
      <div className="h-spacing-32 w-spacing-32 bg-muted-foreground absolute left-1/2 top-1/2 -z-10 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-5 blur-3xl" />
    </div>
  )
}

function AvatarEmptyMockup() {
  return (
    <div aria-hidden className="relative h-48 w-80 select-none">
      <div className="h-spacing-32 w-spacing-32 bg-muted-foreground absolute left-1/2 top-1/2 -z-10 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-5 blur-3xl" />

      {/* Back: research / notes sheet */}
      <div className="card-glass left-spacing-5 top-spacing-14 gap-spacing-2 p-spacing-3 absolute flex h-32 w-40 -rotate-6 flex-col opacity-40 shadow-lg">
        <div className="h-spacing-2 bg-muted-foreground w-2/5 rounded-full opacity-30" />
        <div className="space-y-spacing-1">
          <div className="h-spacing-1 bg-muted-foreground w-full rounded-full opacity-15" />
          <div className="h-spacing-1 bg-muted-foreground w-11/12 rounded-full opacity-15" />
          <div className="h-spacing-1 bg-muted-foreground w-4/5 rounded-full opacity-15" />
        </div>
        <div className="gap-spacing-2 mt-auto grid grid-cols-2">
          <div className="h-spacing-8 rounded-spacing-1 border-border bg-secondary border" />
          <div className="h-spacing-8 rounded-spacing-1 border-border bg-secondary border" />
        </div>
      </div>

      {/* Main: buyer persona panel */}
      <div className="card-glass top-spacing-3 absolute left-1/2 flex h-44 w-60 -translate-x-1/2 rotate-1 flex-col overflow-hidden p-0 shadow-2xl">
        <div className="h-spacing-6 border-border bg-muted px-spacing-3 flex shrink-0 items-center justify-center border-b opacity-90">
          <div className="h-spacing-2 bg-muted-foreground w-1/3 rounded-full opacity-25" />
        </div>

        <div className="gap-spacing-3 p-spacing-3 flex min-h-0 flex-1">
          <div className="relative shrink-0">
            <div className="h-spacing-16 w-spacing-16 border-border bg-secondary flex items-center justify-center rounded-full border">
              <UserCircle2 className="h-spacing-10 w-spacing-10 text-muted-foreground opacity-40" />
            </div>
            <div className="-bottom-spacing-1 -right-spacing-1 h-spacing-6 w-spacing-6 border-border bg-muted absolute flex items-center justify-center rounded-full border shadow-sm">
              <Target className="icon-xs text-muted-foreground opacity-60" />
            </div>
          </div>

          <div className="gap-spacing-2 flex min-w-0 flex-1 flex-col justify-center">
            <div className="h-spacing-3 bg-muted-foreground w-full rounded-full opacity-30" />
            <div className="h-spacing-2 bg-muted-foreground w-4/5 rounded-full opacity-25" />
            <div className="h-spacing-1.5 bg-muted-foreground w-3/5 rounded-full opacity-15" />
            <div className="mt-spacing-1 gap-spacing-1.5 flex">
              <div className="h-spacing-5 bg-primary flex-1 rounded-full opacity-35" />
              <div className="h-spacing-5 border-border bg-muted flex-1 rounded-full border" />
            </div>
          </div>
        </div>

        <div className="border-border bg-muted px-spacing-3 py-spacing-2 shrink-0 border-t opacity-80">
          <div className="mb-spacing-1 h-spacing-1 bg-muted-foreground w-1/4 rounded-full opacity-25" />
          <div className="h-spacing-1 bg-muted-foreground w-full rounded-full opacity-15" />
          <div className="mt-spacing-1 h-spacing-1 bg-muted-foreground w-10/12 rounded-full opacity-15" />
        </div>
      </div>

      <div className="bottom-spacing-5 right-spacing-12 absolute rotate-12">
        <MousePointer2 className="icon-sm text-muted-foreground opacity-70 drop-shadow-md" />
      </div>
    </div>
  )
}

function OfferEmptyMockup() {
  return (
    <div aria-hidden className="relative h-48 w-80 select-none">
      <div className="h-spacing-32 w-spacing-32 bg-muted-foreground absolute left-1/2 top-1/2 -z-10 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-5 blur-3xl" />

      <div className="card-glass right-spacing-10 top-spacing-11 w-spacing-24 gap-spacing-2 p-spacing-3 absolute flex h-36 rotate-6 flex-col opacity-40 shadow-lg">
        <div className="h-spacing-12 rounded-spacing-2 border-border bg-secondary border" />
        <div className="space-y-spacing-1">
          <div className="h-spacing-1.5 bg-muted-foreground w-full rounded-full opacity-20" />
          <div className="h-spacing-1.5 bg-muted-foreground w-11/12 rounded-full opacity-15" />
          <div className="h-spacing-1.5 bg-muted-foreground w-4/5 rounded-full opacity-15" />
        </div>
        <div className="h-spacing-2 bg-muted-foreground mt-auto w-2/3 rounded-full opacity-15" />
      </div>

      <div className="card-glass top-spacing-4 absolute left-1/2 flex h-44 w-56 -translate-x-1/2 -rotate-1 flex-col overflow-hidden p-0 shadow-2xl">
        <div className="h-spacing-7 gap-spacing-2 border-border bg-muted px-spacing-3 flex shrink-0 items-center border-b opacity-90">
          <div className="h-spacing-10 w-spacing-10 rounded-spacing-2 border-border bg-secondary flex shrink-0 items-center justify-center border">
            <Package className="icon-sm text-muted-foreground opacity-45" />
          </div>
          <div className="gap-spacing-1 flex min-w-0 flex-1 flex-col justify-center">
            <div className="h-spacing-2 bg-muted-foreground w-4/5 rounded-full opacity-25" />
            <div className="h-spacing-1.5 bg-muted-foreground w-3/5 rounded-full opacity-15" />
          </div>
        </div>

        <div className="p-spacing-3 flex min-h-0 flex-1 flex-col">
          <div className="gap-spacing-2 rounded-spacing-2 border-border bg-secondary p-spacing-2 flex min-h-0 flex-1 flex-col justify-end border">
            <div className="h-spacing-2 bg-muted-foreground w-2/3 rounded-full opacity-25" />
            <div className="gap-spacing-2 flex items-end justify-between">
              <div className="h-spacing-1.5 bg-muted-foreground w-1/3 rounded-full opacity-15" />
              <div className="h-spacing-8 w-spacing-16 rounded-spacing-1 bg-muted-foreground shrink-0 opacity-20" />
            </div>
          </div>
        </div>

        <div className="px-spacing-3 pb-spacing-3 relative shrink-0 pt-0">
          <div className="h-spacing-7 bg-primary w-full rounded-full opacity-40" />
          <div className="-bottom-spacing-1 right-spacing-10 absolute rotate-12">
            <MousePointer2 className="icon-sm text-muted-foreground opacity-70 drop-shadow-md" />
          </div>
        </div>
      </div>
    </div>
  )
}

function PresentationEmptyMockup() {
  return (
    <div aria-hidden className="relative h-48 w-80 select-none">
      <div className="h-spacing-32 w-spacing-32 bg-muted-foreground absolute left-1/2 top-1/2 -z-10 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-5 blur-3xl" />

      <div className="card-glass left-spacing-8 top-spacing-10 gap-spacing-1.5 p-spacing-2 absolute flex h-32 w-28 -rotate-6 flex-col opacity-40 shadow-lg">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-spacing-2 rounded-spacing-1 border-border bg-secondary border"
          />
        ))}
      </div>

      <div className="card-glass top-spacing-3 absolute left-1/2 flex h-44 w-56 -translate-x-1/2 rotate-1 flex-col overflow-hidden p-0 shadow-2xl">
        <div className="h-spacing-6 gap-spacing-2 border-border bg-muted px-spacing-2 flex shrink-0 items-center border-b opacity-90">
          <div className="gap-spacing-1 flex">
            <div className="h-spacing-1.5 w-spacing-1.5 bg-muted-foreground rounded-full opacity-25" />
            <div className="h-spacing-1.5 w-spacing-1.5 bg-muted-foreground rounded-full opacity-25" />
          </div>
          <LayoutTemplate className="icon-xs text-muted-foreground shrink-0 opacity-40" />
          <div className="h-spacing-2 bg-muted-foreground min-w-0 flex-1 rounded-full opacity-20" />
        </div>
        <div className="gap-spacing-2 p-spacing-3 flex flex-1 flex-col">
          <div className="gap-spacing-2 rounded-spacing-1 border-border bg-secondary p-spacing-2 flex flex-1 flex-col border">
            <div className="h-spacing-2 bg-muted-foreground w-3/4 rounded-full opacity-25" />
            <div className="space-y-spacing-1 pt-spacing-1">
              <div className="h-spacing-1 bg-muted-foreground w-full rounded-full opacity-15" />
              <div className="h-spacing-1 bg-muted-foreground w-11/12 rounded-full opacity-15" />
              <div className="h-spacing-1 bg-muted-foreground w-4/5 rounded-full opacity-15" />
            </div>
          </div>
          <div className="gap-spacing-1 flex justify-center">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-spacing-1.5 w-spacing-1.5 bg-muted-foreground rounded-full opacity-25"
              />
            ))}
          </div>
          <div className="h-spacing-2 bg-primary mx-auto w-2/5 rounded-full opacity-40" />
        </div>
      </div>
    </div>
  )
}

function SequenceEmptyMockup() {
  return (
    <div aria-hidden className="relative h-52 w-80 select-none">
      <div className="h-spacing-32 w-spacing-32 bg-muted-foreground absolute left-1/2 top-1/2 -z-10 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-5 blur-3xl" />

      <div className="card-glass right-spacing-10 top-spacing-12 gap-spacing-1.5 p-spacing-2 absolute flex h-24 w-36 rotate-6 flex-col opacity-40 shadow-lg">
        <div className="h-spacing-1 bg-muted-foreground w-full rounded-full opacity-15" />
        <div className="h-spacing-1 bg-muted-foreground w-5/6 rounded-full opacity-15" />
        <div className="h-spacing-8 rounded-spacing-1 border-border bg-secondary mt-auto border" />
      </div>

      <div className="card-glass top-spacing-4 gap-spacing-2 p-spacing-3 absolute left-1/2 flex h-48 w-56 -translate-x-1/2 rotate-1 flex-col shadow-2xl">
        <div className="h-spacing-5 border-border pb-spacing-2 flex shrink-0 items-center border-b">
          <div className="h-spacing-2 bg-muted-foreground w-2/5 rounded-full opacity-25" />
        </div>
        <div className="gap-spacing-3 flex min-h-0 flex-1 flex-col">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="gap-spacing-2 rounded-spacing-1 border-border bg-muted p-spacing-1.5 flex shrink-0 border"
            >
              <div className="h-spacing-6 w-spacing-6 rounded-spacing-1 border-border bg-secondary flex shrink-0 items-center justify-center border">
                <Mail className="icon-xs text-muted-foreground opacity-40" />
              </div>
              <div className="gap-spacing-1 flex min-w-0 flex-1 flex-col justify-center">
                <div className="h-spacing-1.5 bg-muted-foreground w-full rounded-full opacity-25" />
                <div className="h-spacing-1 bg-muted-foreground w-4/5 rounded-full opacity-15" />
              </div>
            </div>
          ))}
        </div>
        <div className="pt-spacing-1 shrink-0">
          <div className="h-spacing-2 bg-primary w-full rounded-full opacity-40" />
        </div>
      </div>
    </div>
  )
}

/** Empty Emails artifact tab — same composition as Sequences (rear card + hero), one draft card instead of three steps. */
function EmailsEmptyMockup() {
  return (
    <div aria-hidden className="relative h-52 w-80 select-none">
      <div className="h-spacing-32 w-spacing-32 bg-muted-foreground absolute left-1/2 top-1/2 -z-10 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-5 blur-3xl" />

      <div className="card-glass right-spacing-10 top-spacing-12 gap-spacing-1.5 p-spacing-2 absolute flex h-24 w-36 rotate-6 flex-col opacity-40 shadow-lg">
        <div className="h-spacing-1 bg-muted-foreground w-full rounded-full opacity-15" />
        <div className="h-spacing-1 bg-muted-foreground w-5/6 rounded-full opacity-15" />
        <div className="h-spacing-8 rounded-spacing-1 border-border bg-secondary mt-auto border" />
      </div>

      <div className="card-glass top-spacing-4 gap-spacing-2 p-spacing-3 absolute left-1/2 flex h-48 w-56 -translate-x-1/2 rotate-1 flex-col shadow-2xl">
        <div className="h-spacing-5 border-border pb-spacing-2 flex shrink-0 items-center border-b">
          <div className="h-spacing-2 bg-muted-foreground w-2/5 rounded-full opacity-25" />
        </div>
        <div className="gap-spacing-2 rounded-spacing-1 border-border bg-muted p-spacing-2 flex min-h-0 flex-1 flex-col border">
          <div className="gap-spacing-2 flex shrink-0 items-start">
            <div className="h-spacing-6 w-spacing-6 rounded-spacing-1 border-border bg-secondary flex shrink-0 items-center justify-center border">
              <Mail className="icon-xs text-muted-foreground opacity-40" />
            </div>
            <div className="gap-spacing-1 flex min-w-0 flex-1 flex-col justify-center">
              <div className="h-spacing-1.5 bg-muted-foreground w-full rounded-full opacity-25" />
              <div className="h-spacing-1 bg-muted-foreground w-4/5 rounded-full opacity-15" />
            </div>
          </div>
          <div className="gap-spacing-1 flex min-h-0 flex-1 flex-col justify-end">
            <div className="h-spacing-1 bg-muted-foreground opacity-12 w-full rounded-full" />
            <div className="h-spacing-1 bg-muted-foreground w-11/12 rounded-full opacity-10" />
            <div className="h-spacing-1 bg-muted-foreground w-5/6 rounded-full opacity-10" />
          </div>
        </div>
        <div className="pt-spacing-1 shrink-0">
          <div className="h-spacing-2 bg-primary w-full rounded-full opacity-40" />
        </div>
      </div>
    </div>
  )
}

function SocialPostsEmptyMockup() {
  return (
    <div aria-hidden className="relative h-48 w-80 select-none">
      <div className="h-spacing-32 w-spacing-32 bg-muted-foreground absolute left-1/2 top-1/2 -z-10 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-5 blur-3xl" />

      <div className="card-glass left-spacing-10 top-spacing-14 absolute flex h-28 w-32 -rotate-6 opacity-40 shadow-lg">
        <div className="gap-spacing-1 p-spacing-2 flex h-full w-full flex-col">
          <div className="h-spacing-12 rounded-spacing-1 border-border bg-secondary border" />
          <div className="h-spacing-1 bg-muted-foreground w-full rounded-full opacity-15" />
          <div className="h-spacing-1 bg-muted-foreground w-3/4 rounded-full opacity-15" />
        </div>
      </div>

      <div className="card-glass top-spacing-3 absolute left-1/2 flex h-44 w-48 -translate-x-1/2 rotate-2 flex-col overflow-hidden p-0 shadow-2xl">
        <div className="h-spacing-6 border-border bg-muted px-spacing-3 flex shrink-0 items-center justify-between border-b opacity-90">
          <div className="gap-spacing-2 flex items-center">
            <Smartphone className="icon-xs text-muted-foreground opacity-40" />
            <div className="h-spacing-2 bg-muted-foreground w-1/3 rounded-full opacity-25" />
          </div>
          <div className="h-spacing-4 w-spacing-4 border-border bg-secondary rounded-full border" />
        </div>
        <div className="h-spacing-20 border-border bg-secondary shrink-0 border-b" />
        <div className="gap-spacing-2 p-spacing-3 flex flex-1 flex-col">
          <div className="h-spacing-1.5 bg-muted-foreground w-full rounded-full opacity-20" />
          <div className="h-spacing-1.5 bg-muted-foreground w-11/12 rounded-full opacity-15" />
          <div className="gap-spacing-2 pt-spacing-1 mt-auto flex flex-col">
            <div className="h-spacing-2 bg-primary w-full rounded-full opacity-40" />
            <div className="gap-spacing-3 flex">
              <div className="h-spacing-2 w-spacing-8 bg-muted-foreground rounded-full opacity-15" />
              <div className="h-spacing-2 w-spacing-8 bg-muted-foreground rounded-full opacity-15" />
              <div className="h-spacing-2 w-spacing-8 bg-muted-foreground rounded-full opacity-15" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function withRootGrouping(config: ArtifactViewBaseConfig, view: ViewDef): ArtifactViewBaseConfig {
  return {
    ...config,
    group_by: config.group_by ?? view.group_by,
    group_sort: config.group_sort ?? view.group_sort,
  }
}

export function FunnelsSpaceView({
  campaignId,
  activeView,
  selection,
  onSelectionChange,
  onDetailChange,
  onArtifactDeepMetaChange,
  artifactDeepToolbarExtras,
  includeCampaignArtifacts,
}: ArtifactViewProps) {
  const activeSpaceId = useSpacesStore((state) => state.activeSpaceId)
  const fetcher = useCallback(
    async (id: string) =>
      funnelRows(
        await fetchCampaignFunnels(
          id,
          includeCampaignArtifacts ? undefined : (activeSpaceId ?? undefined),
          { summary: true },
        ),
      ),
    [activeSpaceId, includeCampaignArtifacts],
  )
  const { rows, loading, error } = useArtifactRows({
    campaignId,
    viewType: 'funnels',
    realtimeTables: ['funnels'],
    childRealtimeTables: ['funnel_pages'],
    fetcher,
    enabled: includeCampaignArtifacts || Boolean(activeSpaceId),
  })
  if (!campaignId) return <MissingCampaign />
  return (
    <ArtifactSpaceView
      campaignId={campaignId}
      rows={rows}
      loading={loading}
      error={error}
      config={withRootGrouping(activeView.funnels_config ?? {}, activeView)}
      emptyTitle="No funnels yet"
      emptyDescription="Create a funnel and I’ll keep it organized here."
      emptyMockup={<FunnelEmptyMockup />}
      previewType="funnel"
      selection={selection}
      onSelectionChange={onSelectionChange}
      onDetailChange={onDetailChange}
      onArtifactDeepMetaChange={onArtifactDeepMetaChange}
      artifactDeepToolbarExtras={artifactDeepToolbarExtras}
      funnelsCardFieldIds={activeView.funnels_config?.funnel_card_fields}
    />
  )
}

export function FormsSpaceView({
  campaignId,
  activeView,
  selection,
  onSelectionChange,
  onDetailChange,
  onArtifactDeepMetaChange,
  artifactDeepToolbarExtras,
  includeCampaignArtifacts,
}: ArtifactViewProps) {
  const activeSpaceId = useSpacesStore((state) => state.activeSpaceId)
  const fetcher = useCallback(
    async (id: string) => {
      if (includeCampaignArtifacts) return formRows(await fetchCampaignForms(id))
      return activeSpaceId ? formRows(await fetchSpaceForms(id, activeSpaceId)) : []
    },
    [activeSpaceId, includeCampaignArtifacts],
  )
  const { rows, loading, error } = useArtifactRows({
    campaignId,
    viewType: 'forms',
    realtimeTables: ['forms', 'form_responses'],
    fetcher,
  })

  const [formAggregatesMap, setFormAggregatesMap] = useState<
    Map<
      string,
      {
        responses_count: number
        last_response_at: string | null
        target_space_name: string | null
      }
    >
  >(() => new Map())

  useEffect(() => {
    if (!campaignId || !activeSpaceId) {
      setFormAggregatesMap(new Map())
      return
    }
    let cancelled = false
    const request = includeCampaignArtifacts
      ? fetchCampaignFormAggregates(campaignId)
      : fetchSpaceFormAggregates(campaignId, activeSpaceId)
    request
      .then((aggregates) => {
        if (cancelled) return
        const map = new Map<
          string,
          {
            responses_count: number
            last_response_at: string | null
            target_space_name: string | null
          }
        >()
        for (const aggregate of aggregates) {
          map.set(aggregate.form_id, {
            responses_count: aggregate.responses_count,
            last_response_at: aggregate.last_response_at,
            target_space_name: aggregate.target_space_name,
          })
        }
        setFormAggregatesMap(map)
      })
      .catch(() => {
        if (cancelled) return
        setFormAggregatesMap(new Map())
      })
    return () => {
      cancelled = true
    }
  }, [activeSpaceId, campaignId, includeCampaignArtifacts, rows])

  if (!campaignId) return <MissingCampaign />
  return (
    <ArtifactSpaceView
      campaignId={campaignId}
      rows={rows}
      loading={loading}
      error={error}
      config={withRootGrouping(activeView.forms_config ?? {}, activeView)}
      emptyTitle="No forms yet"
      emptyDescription="Create a form and I’ll collect every response here."
      emptyMockup={<FormEmptyMockup />}
      previewType="form"
      selection={selection}
      onSelectionChange={onSelectionChange}
      onDetailChange={onDetailChange}
      onArtifactDeepMetaChange={onArtifactDeepMetaChange}
      artifactDeepToolbarExtras={artifactDeepToolbarExtras}
      formsCardFieldIds={activeView.forms_config?.form_card_fields}
      formAggregatesMap={formAggregatesMap}
    />
  )
}

export function WebsitesSpaceView({
  campaignId,
  activeView,
  selection,
  onSelectionChange,
  onDetailChange,
  onArtifactDeepMetaChange,
  artifactDeepToolbarExtras,
  includeCampaignArtifacts,
}: ArtifactViewProps) {
  const activeSpaceId = useSpacesStore((state) => state.activeSpaceId)
  const fetcher = useCallback(
    async (id: string) => {
      const funnels = await fetchCampaignFunnels(
        id,
        includeCampaignArtifacts ? undefined : (activeSpaceId ?? undefined),
        { summary: true },
      )
      const websites = funnels.filter((funnel) => funnel.funnel_type === 'website')
      const blogPairs = await Promise.all(
        websites.map(
          async (website) =>
            [website.id, await fetchBlogPosts(website.id).catch(() => [])] as const,
        ),
      )
      return websiteRows(funnels, Object.fromEntries(blogPairs))
    },
    [activeSpaceId, includeCampaignArtifacts],
  )
  const { rows, loading, error } = useArtifactRows({
    campaignId,
    viewType: 'websites',
    realtimeTables: ['funnels', 'blog_posts'],
    childRealtimeTables: ['funnel_pages'],
    fetcher,
    enabled: includeCampaignArtifacts || Boolean(activeSpaceId),
  })
  if (!campaignId) return <MissingCampaign />
  return (
    <ArtifactSpaceView
      campaignId={campaignId}
      rows={rows}
      loading={loading}
      error={error}
      config={withRootGrouping(activeView.websites_config ?? {}, activeView)}
      emptyTitle="No websites yet"
      emptyDescription="Create a website and its pages will show up here."
      emptyMockup={<WebsiteEmptyMockup />}
      previewType="website"
      selection={selection}
      onSelectionChange={onSelectionChange}
      onDetailChange={onDetailChange}
      onArtifactDeepMetaChange={onArtifactDeepMetaChange}
      artifactDeepToolbarExtras={artifactDeepToolbarExtras}
    />
  )
}

export function OffersSpaceView({
  campaignId,
  activeView,
  selection,
  onSelectionChange,
  onDetailChange,
  onArtifactDeepMetaChange,
  includeCampaignArtifacts,
}: ArtifactViewProps) {
  const activeSpaceId = useSpacesStore((state) => state.activeSpaceId)
  const fetcher = useCallback(
    async (id: string) =>
      offerRows(
        await fetchCampaignOffers(
          id,
          includeCampaignArtifacts ? undefined : (activeSpaceId ?? undefined),
        ),
      ),
    [activeSpaceId, includeCampaignArtifacts],
  )
  const { rows, loading, error, refresh } = useArtifactRows({
    campaignId,
    viewType: 'offers',
    realtimeTables: ['offers'],
    fetcher,
    enabled: includeCampaignArtifacts || Boolean(activeSpaceId),
  })
  if (!campaignId) return <MissingCampaign />
  return (
    <ArtifactSpaceView
      campaignId={campaignId}
      rows={rows}
      loading={loading}
      error={error}
      config={withRootGrouping(activeView.offers_config ?? {}, activeView)}
      emptyTitle="No offers yet"
      emptyDescription="Start with your power offer and it’ll live here."
      emptyMockup={<OfferEmptyMockup />}
      previewType="offer"
      selection={selection}
      onSelectionChange={onSelectionChange}
      onDetailChange={onDetailChange}
      onArtifactDeepMetaChange={onArtifactDeepMetaChange}
      onArtifactListMutated={() => void refresh(true)}
    />
  )
}

export function AvatarsSpaceView({
  campaignId,
  activeView,
  selection,
  onSelectionChange,
  onDetailChange,
  onArtifactDeepMetaChange,
  includeCampaignArtifacts,
}: ArtifactViewProps) {
  const activeSpaceId = useSpacesStore((state) => state.activeSpaceId)
  const fetcher = useCallback(
    async (id: string) =>
      avatarRows(
        await fetchCampaignAvatars(
          id,
          includeCampaignArtifacts ? undefined : (activeSpaceId ?? undefined),
        ),
      ),
    [activeSpaceId, includeCampaignArtifacts],
  )
  const { rows, loading, error, refresh } = useArtifactRows({
    campaignId,
    viewType: 'avatars',
    realtimeTables: ['avatars'],
    fetcher,
    enabled: includeCampaignArtifacts || Boolean(activeSpaceId),
  })

  const [avatarOfferMap, setAvatarOfferMap] = useState<Map<string, string>>(() => new Map())

  useEffect(() => {
    if (!campaignId || !includeCampaignArtifacts) return
    let cancelled = false
    cachedFetch(`offer-names:${campaignId}:`, () => fetchCampaignOffers(campaignId), {
      ttlMs: 60_000,
    })
      .then((offers) => {
        if (cancelled) return
        const map = new Map<string, string>()
        for (const o of offers) {
          map.set(o.id, o.name?.trim() ? o.name : 'Offer')
        }
        setAvatarOfferMap(map)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [campaignId, includeCampaignArtifacts])

  if (!campaignId) return <MissingCampaign />
  return (
    <ArtifactSpaceView
      campaignId={campaignId}
      rows={rows}
      loading={loading}
      error={error}
      config={withRootGrouping(activeView.avatars_config ?? {}, activeView)}
      emptyTitle="No avatars yet"
      emptyDescription="Build a buyer avatar and I’ll pin it here."
      emptyMockup={<AvatarEmptyMockup />}
      previewType="avatar"
      selection={selection}
      onSelectionChange={onSelectionChange}
      onDetailChange={onDetailChange}
      onArtifactDeepMetaChange={onArtifactDeepMetaChange}
      onArtifactListMutated={() => void refresh(true)}
      avatarsCardFieldIds={activeView.avatars_config?.avatar_card_fields}
      avatarOfferMap={avatarOfferMap}
    />
  )
}

export { PaidAdsSpaceView }

/** @deprecated Use PaidAdsSpaceView — kept for imports/tests. */
export const AdCampaignsSpaceView = PaidAdsSpaceView
/** @deprecated Use PaidAdsSpaceView — kept for imports/tests. */
export const AdsSpaceView = PaidAdsSpaceView

export function SequencesSpaceView({
  campaignId,
  activeView,
  selection,
  onSelectionChange,
  onDetailChange,
  onArtifactDeepMetaChange,
  artifactDeepToolbarExtras,
  includeCampaignArtifacts,
}: ArtifactViewProps) {
  const activeSpaceId = useSpacesStore((state) => state.activeSpaceId)
  const fetcher = useCallback(
    async (id: string) =>
      sequenceRows(
        await fetchCampaignSequences(
          id,
          includeCampaignArtifacts ? undefined : (activeSpaceId ?? undefined),
          { summary: true },
        ),
      ),
    [activeSpaceId, includeCampaignArtifacts],
  )
  const { rows, loading, error } = useArtifactRows({
    campaignId,
    viewType: 'sequences',
    realtimeTables: ['sequences'],
    childRealtimeTables: ['sequence_emails'],
    fetcher,
    enabled: includeCampaignArtifacts || Boolean(activeSpaceId),
  })

  const [sequenceFunnelMap, setSequenceFunnelMap] = useState<Map<string, string>>(new Map())

  useEffect(() => {
    if (!campaignId || !includeCampaignArtifacts) return
    let cancelled = false
    cachedFetch(`workflow-graph:${campaignId}`, () => fetchWorkflowGraph(campaignId), {
      ttlMs: 60_000,
    })
      .then((graph) => {
        if (cancelled) return
        const funnelNodes = new Map(
          graph.nodes.filter((n) => n.type === 'funnel').map((n) => [n.id, n.label]),
        )
        const map = new Map<string, string>()
        for (const edge of graph.edges) {
          if (
            edge.edge_type === 'funnel_conversion_to_sequence' &&
            edge.status !== 'paused' &&
            edge.status !== 'invalid'
          ) {
            const name = funnelNodes.get(edge.from_id)
            if (name) map.set(edge.to_id, name)
          }
        }
        setSequenceFunnelMap(map)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [campaignId, includeCampaignArtifacts])

  if (!campaignId) return <MissingCampaign />
  return (
    <ArtifactSpaceView
      campaignId={campaignId}
      rows={rows}
      loading={loading}
      error={error}
      config={withRootGrouping(activeView.sequences_config ?? {}, activeView)}
      emptyTitle="No sequences yet"
      emptyDescription="Build an email sequence and it’ll show up here."
      emptyMockup={<SequenceEmptyMockup />}
      previewType="sequence"
      selection={selection}
      onSelectionChange={onSelectionChange}
      onDetailChange={onDetailChange}
      onArtifactDeepMetaChange={onArtifactDeepMetaChange}
      artifactDeepToolbarExtras={artifactDeepToolbarExtras}
      sequencesCardFieldIds={activeView.sequences_config?.sequence_card_fields}
      sequenceFunnelMap={sequenceFunnelMap}
    />
  )
}

export function EmailsSpaceView({
  campaignId,
  activeView,
  selection,
  onSelectionChange,
  onDetailChange,
  onArtifactDeepMetaChange,
  artifactDeepToolbarExtras,
  includeCampaignArtifacts,
}: ArtifactViewProps) {
  const activeSpaceId = useSpacesStore((state) => state.activeSpaceId)
  const fetcher = useCallback(
    async (id: string) => {
      if (includeCampaignArtifacts) return emailRows(await fetchCampaignEmails(id))
      return activeSpaceId ? emailRows(await fetchSpaceEmails(id, activeSpaceId)) : []
    },
    [activeSpaceId, includeCampaignArtifacts],
  )
  const { rows, loading, error } = useArtifactRows({
    campaignId,
    viewType: 'emails',
    realtimeTables: ['emails'],
    fetcher,
  })
  if (!campaignId) return <MissingCampaign />
  return (
    <ArtifactSpaceView
      campaignId={campaignId}
      rows={rows}
      loading={loading}
      error={error}
      config={withRootGrouping(activeView.emails_config ?? {}, activeView)}
      emptyTitle="No email drafts yet"
      emptyDescription="When an agent drafts an email, I’ll keep it here."
      emptyMockup={<EmailsEmptyMockup />}
      previewType="email"
      selection={selection}
      onSelectionChange={onSelectionChange}
      onDetailChange={onDetailChange}
      onArtifactDeepMetaChange={onArtifactDeepMetaChange}
      artifactDeepToolbarExtras={artifactDeepToolbarExtras}
    />
  )
}

export function PresentationsSpaceView({
  campaignId,
  activeView,
  selection,
  onSelectionChange,
  onDetailChange,
  onArtifactDeepMetaChange,
  artifactDeepToolbarExtras,
  includeCampaignArtifacts,
}: ArtifactViewProps) {
  const activeSpaceId = useSpacesStore((state) => state.activeSpaceId)
  const fetcher = useCallback(
    async (id: string) =>
      presentationRows(
        await fetchCampaignPresentations(
          id,
          includeCampaignArtifacts ? undefined : (activeSpaceId ?? undefined),
          { summary: true },
        ),
      ),
    [activeSpaceId, includeCampaignArtifacts],
  )
  const { rows, loading, error, refresh } = useArtifactRows({
    campaignId,
    viewType: 'presentations',
    realtimeTables: ['presentations'],
    fetcher,
    enabled: includeCampaignArtifacts || Boolean(activeSpaceId),
  })

  const [presentationOfferMap, setPresentationOfferMap] = useState<Map<string, string>>(
    () => new Map(),
  )

  useEffect(() => {
    if (!campaignId || !includeCampaignArtifacts) return
    let cancelled = false
    cachedFetch(`offer-names:${campaignId}:`, () => fetchCampaignOffers(campaignId), {
      ttlMs: 60_000,
    })
      .then((offers) => {
        if (cancelled) return
        const map = new Map<string, string>()
        for (const o of offers) {
          map.set(o.id, o.name?.trim() ? o.name : 'Offer')
        }
        setPresentationOfferMap(map)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [campaignId, includeCampaignArtifacts])

  if (!campaignId) return <MissingCampaign />
  return (
    <ArtifactSpaceView
      campaignId={campaignId}
      rows={rows}
      loading={loading}
      error={error}
      config={withRootGrouping(activeView.presentations_config ?? {}, activeView)}
      emptyTitle="No presentations yet"
      emptyDescription="Create a deck and I’ll keep the latest version here."
      emptyMockup={<PresentationEmptyMockup />}
      previewType="presentation"
      selection={selection}
      onSelectionChange={onSelectionChange}
      onDetailChange={onDetailChange}
      onArtifactDeepMetaChange={onArtifactDeepMetaChange}
      artifactDeepToolbarExtras={artifactDeepToolbarExtras}
      presentationsCardFieldIds={activeView.presentations_config?.presentation_card_fields}
      presentationOfferMap={presentationOfferMap}
      onArtifactListMutated={() => void refresh(true)}
    />
  )
}

export function SocialPostsSpaceView({
  campaignId,
  activeView,
  selection,
  onSelectionChange,
  onDetailChange,
  onArtifactDeepMetaChange,
  includeCampaignArtifacts,
}: ArtifactViewProps) {
  const activeSpaceId = useSpacesStore((state) => state.activeSpaceId)
  const fetcher = useCallback(
    async (id: string) =>
      socialPostRows(
        await fetchCampaignSocialPosts(
          id,
          includeCampaignArtifacts ? undefined : (activeSpaceId ?? undefined),
        ),
      ),
    [activeSpaceId, includeCampaignArtifacts],
  )
  const { rows, loading, error } = useArtifactRows({
    campaignId,
    viewType: 'social_posts',
    realtimeTables: ['social_posts'],
    fetcher,
    enabled: includeCampaignArtifacts || Boolean(activeSpaceId),
  })
  if (!campaignId) return <MissingCampaign />
  return (
    <ArtifactSpaceView
      campaignId={campaignId}
      rows={rows}
      loading={loading}
      error={error}
      config={withRootGrouping(activeView.social_posts_config ?? {}, activeView)}
      emptyTitle="No social posts yet"
      emptyDescription="Create posts for each channel and I’ll line them up here."
      emptyMockup={<SocialPostsEmptyMockup />}
      previewType="social_post"
      timeField={activeView.social_posts_config?.time_field ?? 'created_at'}
      selection={selection}
      onSelectionChange={onSelectionChange}
      onDetailChange={onDetailChange}
      onArtifactDeepMetaChange={onArtifactDeepMetaChange}
      socialPostsCardFieldIds={activeView.social_posts_config?.social_post_card_fields}
    />
  )
}

function AllArtifactsEmptyMockup() {
  return (
    <div aria-hidden className="relative flex h-48 w-80 select-none items-center justify-center">
      <Layers className="text-muted-foreground h-16 w-16 opacity-30" />
    </div>
  )
}

export function AllArtifactsSpaceView({
  campaignId,
  activeView,
  selection,
  onSelectionChange,
  onDetailChange,
  onArtifactDeepMetaChange,
  artifactDeepToolbarExtras,
  includeCampaignArtifacts,
}: ArtifactViewProps) {
  const activeSpaceId = useSpacesStore((state) => state.activeSpaceId)
  const { rows, loading, error, refresh } = useAllArtifactRows({
    campaignId,
    activeSpaceId,
    activeView,
    includeCampaignArtifacts,
  })

  const [avatarOfferMap, setAvatarOfferMap] = useState<Map<string, string>>(() => new Map())
  const [presentationOfferMap, setPresentationOfferMap] = useState<Map<string, string>>(
    () => new Map(),
  )
  const [formAggregatesMap, setFormAggregatesMap] = useState<
    Map<
      string,
      {
        responses_count: number
        last_response_at: string | null
        target_space_name: string | null
      }
    >
  >(() => new Map())
  const [sequenceFunnelMap, setSequenceFunnelMap] = useState<Map<string, string>>(() => new Map())

  useEffect(() => {
    if (!campaignId) {
      setAvatarOfferMap(new Map())
      setPresentationOfferMap(new Map())
      setFormAggregatesMap(new Map())
      setSequenceFunnelMap(new Map())
      return
    }
    let cancelled = false
    void loadAllArtifactSupportMaps(campaignId, activeSpaceId, includeCampaignArtifacts, rows).then(
      (maps) => {
        if (cancelled) return
        setAvatarOfferMap(maps.avatarOfferMap)
        setPresentationOfferMap(maps.presentationOfferMap)
        setFormAggregatesMap(maps.formAggregatesMap)
        setSequenceFunnelMap(maps.sequenceFunnelMap)
      },
    )
    return () => {
      cancelled = true
    }
  }, [activeSpaceId, campaignId, includeCampaignArtifacts, rows])

  if (!campaignId) return <MissingCampaign />

  const config: ArtifactViewBaseConfig = {
    ...getAllArtifactsConfig(activeView),
    group_by: getAllArtifactsConfig(activeView).group_by ?? activeView.group_by,
    group_sort: getAllArtifactsConfig(activeView).group_sort ?? activeView.group_sort,
  }

  return (
    <ArtifactSpaceView
      campaignId={campaignId}
      rows={rows}
      loading={loading}
      error={error}
      config={config}
      emptyTitle="No artifacts yet"
      emptyDescription="Funnels, offers, avatars, and everything else will show up here."
      emptyMockup={<AllArtifactsEmptyMockup />}
      previewType="funnel"
      mixedArtifactKinds
      selection={selection}
      onSelectionChange={onSelectionChange}
      onDetailChange={onDetailChange}
      onArtifactDeepMetaChange={onArtifactDeepMetaChange}
      artifactDeepToolbarExtras={artifactDeepToolbarExtras}
      onArtifactListMutated={() => void refresh(true)}
      avatarOfferMap={avatarOfferMap}
      presentationOfferMap={presentationOfferMap}
      formAggregatesMap={formAggregatesMap}
      sequenceFunnelMap={sequenceFunnelMap}
    />
  )
}
