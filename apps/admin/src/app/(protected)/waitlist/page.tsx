'use client'

import { Suspense } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { WaitlistContainer } from '@/features/waitlist'
import { InviteCodesTab } from '@/features/waitlist/components/InviteCodesTab'

export default function WaitlistPage() {
  return (
    <div className="p-spacing-6 w-full">
      <div className="mb-spacing-6">
        <h1 className="title-h1 text-foreground">WAITLIST</h1>
        <p className="body-2 text-muted-foreground mt-spacing-2">
          Manage platform access and invite codes
        </p>
      </div>

      <Tabs defaultValue="waitlist" className="space-y-spacing-6">
        <TabsList variant="liquid">
          <TabsTrigger value="waitlist" className="px-spacing-4">
            Waitlist
          </TabsTrigger>
          <TabsTrigger value="invite-codes" className="px-spacing-4">
            Invite Codes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="waitlist">
          <Suspense fallback={<div className="body-3 text-muted-foreground">Loading…</div>}>
            <WaitlistContainer />
          </Suspense>
        </TabsContent>

        <TabsContent value="invite-codes">
          <InviteCodesTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
