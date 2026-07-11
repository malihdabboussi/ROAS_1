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
    <div className="flex min-h-0 flex-1 flex-col gap-6 p-6">
      <div className="bg-secondary h-10 w-64 rounded-[12px]" />
      <div className="border-border bg-secondary h-28 rounded-[24px] border" />
      <div className="border-border bg-secondary h-72 rounded-[24px] border" />
    </div>
  )
}
