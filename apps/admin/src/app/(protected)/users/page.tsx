'use client'

import { Suspense } from 'react'
import { UsersListContainer } from '@/features/users'

export default function UsersPage() {
  return (
    <div className="p-spacing-6 w-full">
      <div className="mb-spacing-6">
        <h1 className="title-h1 text-foreground">Users</h1>
        <p className="body-2 text-muted-foreground mt-spacing-2">
          View and manage all registered users on the platform
        </p>
      </div>

      <Suspense fallback={<div className="body-3 text-muted-foreground">Loading users...</div>}>
        <UsersListContainer />
      </Suspense>
    </div>
  )
}
