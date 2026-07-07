'use client'

import { useEffect, useState } from 'react'
import { Layers, Megaphone, Settings } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/navigation/tabs'
import { useCampaignMode } from '../../contexts/CampaignModeContext'
import { AdsPerformanceView } from './AdsPerformanceView'
import { BulkCreatorTab } from './BulkCreatorTab'
import { SettingsTab } from './SettingsTab'

interface AdsTabProps {
  campaignId: string
  campaignName?: string | null
}

export function AdsTab({ campaignId, campaignName }: AdsTabProps) {
  const { bulkCreatorAdSetId } = useCampaignMode()
  const [activeSubTab, setActiveSubTab] = useState<'performance' | 'bulk-creator' | 'settings'>(
    'performance',
  )

  useEffect(() => {
    if (bulkCreatorAdSetId) {
      setActiveSubTab('bulk-creator')
    }
  }, [bulkCreatorAdSetId])

  return (
    <Tabs
      value={activeSubTab}
      onValueChange={(v) => setActiveSubTab(v as 'performance' | 'bulk-creator' | 'settings')}
      className="flex h-full min-h-0 flex-col"
    >
      <div className="flex shrink-0 items-center justify-end px-4 py-2">
        <TabsList variant="liquid" className="shrink-0">
          <TabsTrigger value="performance" className="gap-spacing-2">
            <Megaphone className="h-4 w-4" />
            Performance
          </TabsTrigger>
          <TabsTrigger value="bulk-creator" className="gap-spacing-2">
            <Layers className="h-4 w-4" />
            Bulk Creator
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-spacing-2">
            <Settings className="h-4 w-4" />
            Settings
          </TabsTrigger>
        </TabsList>
      </div>
      <div className="pt-spacing-4 flex min-h-0 flex-1 flex-col">
        <TabsContent
          value="performance"
          className="mt-0 min-h-0 flex-1 data-[state=inactive]:hidden"
        >
          <AdsPerformanceView campaignId={campaignId} campaignName={campaignName} />
        </TabsContent>
        <TabsContent
          value="bulk-creator"
          className="mt-0 min-h-0 flex-1 data-[state=inactive]:hidden"
        >
          <BulkCreatorTab campaignId={campaignId} />
        </TabsContent>
        <TabsContent value="settings" className="mt-0 min-h-0 flex-1 data-[state=inactive]:hidden">
          <div className="h-full min-h-0 overflow-auto">
            <SettingsTab campaignId={campaignId} initialSection="ads" hideSidebar />
          </div>
        </TabsContent>
      </div>
    </Tabs>
  )
}
