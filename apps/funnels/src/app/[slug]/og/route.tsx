import { ImageResponse } from 'next/og'
import { getServiceClient } from '@/lib/supabase'

type Params = { params: Promise<{ slug: string }> }

export async function GET(_request: Request, { params }: Params) {
  const { slug } = await params
  const supabase = getServiceClient()
  const { data: funnel } = await supabase
    .from('funnels')
    .select('name, title')
    .eq('slug', slug)
    .maybeSingle()

  const title = (funnel?.title || funnel?.name || slug || 'Vibey').toString()

  return new ImageResponse(
    <div
      style={{
        height: '100%',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        background:
          'linear-gradient(135deg, rgba(15,23,42,1) 0%, rgba(37,99,235,1) 50%, rgba(168,85,247,1) 100%)',
        padding: '64px',
        color: 'white',
      }}
    >
      <div style={{ fontSize: 32, opacity: 0.9 }}>Vibey Website</div>
      <div style={{ fontSize: 72, lineHeight: 1.05, fontWeight: 700, maxWidth: '90%' }}>
        {title}
      </div>
      <div style={{ fontSize: 28, opacity: 0.85 }}>Generated with Vibey</div>
    </div>,
    {
      width: 1200,
      height: 630,
    },
  )
}
