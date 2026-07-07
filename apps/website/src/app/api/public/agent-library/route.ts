import { NextResponse } from 'next/server'
import { getAgentLibraryForMarketing } from '@/lib/get-agent-library-for-marketing'

export async function GET() {
  const agents = await getAgentLibraryForMarketing()
  return NextResponse.json({ agents })
}
