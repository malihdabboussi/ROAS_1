import { FlowsPage } from '@/features/flows/containers/FlowsPage'

export const metadata = {
  title: 'Flows | Vibey',
}

export default function Page() {
  return (
    <div className="flex h-full flex-col">
      <FlowsPage />
    </div>
  )
}
