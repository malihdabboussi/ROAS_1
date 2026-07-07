'use client'

import { SkillBuilderContainer } from '@/features/enterprise-tools'

export default function SkillBuilderPage() {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="mb-spacing-6 shrink-0">
        <h1 className="title-h1 text-foreground">SKILL BUILDER</h1>
        <p className="body-2 text-muted-foreground mt-spacing-2">
          Build agent skills for customers. Sessions stay in admin only — customers only see the
          finished skills.
        </p>
      </div>
      <SkillBuilderContainer />
    </div>
  )
}
