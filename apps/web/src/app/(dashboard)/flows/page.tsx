import { FlowsPage } from '@/features/flows/containers/FlowsPage'

export const metadata = {
  title: 'Flows | ROAS',
}

export default function Page() {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <FlowsPage />
    </div>
  )
}
