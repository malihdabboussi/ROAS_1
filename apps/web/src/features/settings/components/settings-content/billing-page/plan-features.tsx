'use client'

import type { ReactNode } from 'react'
import {
  Brain,
  FileSearch,
  FolderKanban,
  Globe,
  ImagePlus,
  MessageSquare,
  Mic,
  RefreshCw,
  Sparkles,
  Zap,
} from 'lucide-react'
import { formatNumber } from './utils/billing-format'

export interface PlanFeature {
  icon: ReactNode
  text: string
}

function formatCampaignLimit(_maxCampaigns: number | null): string {
  return 'Unlimited campaigns'
}

export function getPlanFeatures(
  planName: string,
  credits: number,
  maxCampaigns: number | null,
): PlanFeature[] {
  const name = planName.toLowerCase()

  if (name === 'basic' || name === 'starter') {
    return [
      {
        icon: <RefreshCw className="icon-sm text-foreground" />,
        text: '200 refresh credits everyday',
      },
      {
        icon: <Sparkles className="icon-sm text-foreground" />,
        text: `${formatNumber(credits)} credits / month`,
      },
      {
        icon: <FolderKanban className="icon-sm text-foreground" />,
        text: formatCampaignLimit(maxCampaigns),
      },
      {
        icon: <MessageSquare className="icon-sm text-foreground" />,
        text: 'AI chat for everyday tasks',
      },
      { icon: <Brain className="icon-sm text-foreground" />, text: 'Memory for standard context' },
      { icon: <Mic className="icon-sm text-foreground" />, text: 'Voice chat included' },
      { icon: <Globe className="icon-sm text-foreground" />, text: 'Web research included' },
      { icon: <ImagePlus className="icon-sm text-foreground" />, text: 'Image generation included' },
      { icon: <FileSearch className="icon-sm text-foreground" />, text: 'File analysis included' },
      { icon: <Zap className="icon-sm text-foreground" />, text: 'Early access to beta features' },
    ]
  }

  if (name === 'early access') {
    return [
      {
        icon: <RefreshCw className="icon-sm text-foreground" />,
        text: '200 refresh credits everyday',
      },
      {
        icon: <Sparkles className="icon-sm text-foreground" />,
        text: `${formatNumber(credits)} credits / month`,
      },
      {
        icon: <FolderKanban className="icon-sm text-foreground" />,
        text: formatCampaignLimit(maxCampaigns),
      },
      {
        icon: <MessageSquare className="icon-sm text-foreground" />,
        text: 'AI chat with full platform access',
      },
      { icon: <Brain className="icon-sm text-foreground" />, text: 'Memory with growing context' },
      { icon: <Mic className="icon-sm text-foreground" />, text: 'Voice chat included' },
      { icon: <Globe className="icon-sm text-foreground" />, text: 'Web research included' },
      { icon: <ImagePlus className="icon-sm text-foreground" />, text: 'Image generation included' },
      {
        icon: <FileSearch className="icon-sm text-foreground" />,
        text: 'Advanced analytics',
      },
      { icon: <Zap className="icon-sm text-foreground" />, text: 'Early access to all new features' },
    ]
  }

  if (name === 'pro') {
    return [
      {
        icon: <RefreshCw className="icon-sm text-foreground" />,
        text: '200 refresh credits everyday',
      },
      {
        icon: <Sparkles className="icon-sm text-foreground" />,
        text: `${formatNumber(credits)} credits / month`,
      },
      {
        icon: <FolderKanban className="icon-sm text-foreground" />,
        text: formatCampaignLimit(maxCampaigns),
      },
      {
        icon: <MessageSquare className="icon-sm text-foreground" />,
        text: 'AI chat with self-set usage',
      },
      { icon: <Brain className="icon-sm text-foreground" />, text: 'Memory with growing context' },
      { icon: <Mic className="icon-sm text-foreground" />, text: 'Voice chat with extended sessions' },
      {
        icon: <Globe className="icon-sm text-foreground" />,
        text: 'Web research scaled to your plan',
      },
      {
        icon: <ImagePlus className="icon-sm text-foreground" />,
        text: 'Image generation for steady creation',
      },
      {
        icon: <FileSearch className="icon-sm text-foreground" />,
        text: 'File analysis for changing needs',
      },
      { icon: <Zap className="icon-sm text-foreground" />, text: 'Early access to beta features' },
    ]
  }

  if (name === 'ultra') {
    return [
      {
        icon: <RefreshCw className="icon-sm text-foreground" />,
        text: '200 refresh credits everyday',
      },
      {
        icon: <Sparkles className="icon-sm text-foreground" />,
        text: `${formatNumber(credits)} credits / month`,
      },
      {
        icon: <FolderKanban className="icon-sm text-foreground" />,
        text: formatCampaignLimit(maxCampaigns),
      },
      {
        icon: <MessageSquare className="icon-sm text-foreground" />,
        text: 'AI chat for large-scale work',
      },
      {
        icon: <Brain className="icon-sm text-foreground" />,
        text: 'Memory for deep, long-term context',
      },
      { icon: <Mic className="icon-sm text-foreground" />, text: 'Voice chat for sustained use' },
      { icon: <Globe className="icon-sm text-foreground" />, text: 'Web research for heavy use' },
      {
        icon: <ImagePlus className="icon-sm text-foreground" />,
        text: 'Image generation for batch production',
      },
      {
        icon: <FileSearch className="icon-sm text-foreground" />,
        text: 'File analysis with large documents',
      },
      { icon: <Zap className="icon-sm text-foreground" />, text: 'Early access to beta features' },
    ]
  }

  return [
    {
      icon: <Sparkles className="icon-sm text-foreground" />,
      text: `${formatNumber(credits)} credits / month`,
    },
    {
      icon: <FolderKanban className="icon-sm text-foreground" />,
      text: formatCampaignLimit(maxCampaigns),
    },
    { icon: <MessageSquare className="icon-sm text-foreground" />, text: 'Basic AI chat' },
  ]
}

export function getPlanSubtitle(planName: string): string {
  const name = planName.toLowerCase()
  if (name === 'basic' || name === 'starter') return 'Standard monthly usage'
  if (name === 'early access') return 'Full platform access'
  if (name === 'pro') return 'Customizable monthly usage'
  if (name === 'ultra') return 'Extended usage for productivity'
  return 'Get started for free'
}
