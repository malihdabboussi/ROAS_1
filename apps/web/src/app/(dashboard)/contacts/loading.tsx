import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'

export default function ContactsLoading() {
  return (
    <div className="flex h-full items-center justify-center">
      <VibeyLoadingOrb text="Loading Contacts..." state="processing" size="lg" />
    </div>
  )
}
