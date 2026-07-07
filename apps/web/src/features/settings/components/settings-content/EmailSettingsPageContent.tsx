'use client'

import { useEffect, useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/navigation/tabs'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import {
  EmailDomainsProvider,
  useEmailDomains,
} from '@/features/email/providers/EmailDomainsProvider'
import { SenderIdentitiesProvider } from '@/features/email/providers/SenderIdentitiesProvider'
import EmailDomainsAndSendersContent from './EmailDomainsAndSendersContent'
import EmailGeneralSettingsContent from './EmailGeneralSettingsContent'
import EmailLogsContent from './EmailLogsContent'

type TabId = 'domains' | 'general' | 'logs'

function EmailSettingsPageContentInner() {
  const [activeTab, setActiveTab] = useState<TabId>('domains')
  const [initialLoadComplete, setInitialLoadComplete] = useState(false)
  const { isLoading: domainsLoading } = useEmailDomains()

  useEffect(() => {
    if (!domainsLoading && !initialLoadComplete) {
      setInitialLoadComplete(true)
    }
  }, [domainsLoading, initialLoadComplete])

  if (!initialLoadComplete) {
    return (
      <div className="flex h-full min-h-[400px] w-full items-center justify-center">
        <VibeyLoadingOrb size="sm" state="processing" />
      </div>
    )
  }

  return (
    <div className="p-spacing-4 sm:p-spacing-8">
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as TabId)}
        className="space-y-spacing-4 sm:space-y-spacing-6"
      >
        <TabsList>
          <TabsTrigger value="domains">Domains & Senders</TabsTrigger>
          <TabsTrigger value="general">General Settings</TabsTrigger>
          <TabsTrigger value="logs">Email Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="domains">
          <EmailDomainsAndSendersInline />
        </TabsContent>

        <TabsContent value="general">
          <EmailGeneralSettingsContent />
        </TabsContent>

        <TabsContent value="logs">
          <EmailLogsContent />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function EmailDomainsAndSendersInline() {
  return <EmailDomainsAndSendersContent />
}

export default function EmailSettingsPageContent() {
  return (
    <EmailDomainsProvider>
      <SenderIdentitiesProvider>
        <EmailSettingsPageContentInner />
      </SenderIdentitiesProvider>
    </EmailDomainsProvider>
  )
}
