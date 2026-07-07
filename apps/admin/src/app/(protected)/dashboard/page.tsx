import { DashboardContainer } from '@/features/dashboard/containers/DashboardContainer'

export default function DashboardPage() {
  return (
    <div className="w-full">
      <div className="mb-spacing-6">
        <h1 className="title-h1 text-foreground">DASHBOARD</h1>
        <p className="body-2 text-muted-foreground mt-spacing-2">
          Overview of key metrics across all features
        </p>
      </div>

      <DashboardContainer />
    </div>
  )
}
