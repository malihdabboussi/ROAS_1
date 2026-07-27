'use client'

import dynamic from 'next/dynamic'

const HomeDashboardContent = dynamic(
  () =>
    import('./home-dashboard-content').then((mod) => ({
      default: mod.HomeDashboardContent,
    })),
  {
    ssr: false,
    loading: () => <HomePageBootSkeleton />,
  },
)

export default function HomePage() {
  return <HomeDashboardContent />
}

function HomePageBootSkeleton() {
  return (
    <div className="gap-spacing-6 p-spacing-6 flex min-h-0 flex-1 flex-col">
      <div className="bg-secondary h-spacing-10 w-spacing-64 rounded-spacing-3" />
      <div className="border-border bg-secondary h-spacing-32 rounded-spacing-4 border" />
      <div className="border-border bg-secondary h-spacing-72 rounded-spacing-4 border" />
    </div>
  )
}
