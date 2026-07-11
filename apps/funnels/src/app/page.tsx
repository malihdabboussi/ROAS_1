import { redirect } from 'next/navigation'
import { resolveMarketingSiteUrl } from '@/lib/platform-urls'

export default function Home() {
  redirect(resolveMarketingSiteUrl())
}
