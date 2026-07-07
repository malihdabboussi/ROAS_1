'use client'

const ROLE_SHAPES: Record<string, string> = {
  copywriter: 'M40 10 L50 35 L40 70 L30 35 Z',
  designer: 'M40 12 L64 40 L40 68 L16 40 Z',
  analyst:
    'M16 62 L16 44 L28 44 L28 62 Z M32 62 L32 30 L44 30 L44 62 Z M48 62 L48 18 L60 18 L60 62 Z',
  developer:
    'M22 40 L36 22 L40 27 L30 40 L40 53 L36 58 Z M58 40 L44 22 L40 27 L50 40 L40 53 L44 58 Z',
  widget_builder: 'M16 22 L64 22 L64 58 L16 58 Z M22 30 L58 30 M22 40 L50 40 M22 50 L44 50',
  pm_marketing: 'M40 12 L63 26 L63 54 L40 68 L17 54 L17 26 Z',
  pm_product: 'M20 16 L60 16 L60 64 L20 64 Z M30 28 L50 28 M30 40 L50 40 M30 52 L42 52',
  pm_operations: 'M40 10 A30 30 0 1 1 39.9 10 Z M28 40 L52 40 M40 28 L40 52',
  automation_integrations_engineer: 'M46 8 L26 42 L38 42 L34 72 L58 34 L46 34 Z',
  product_manager: 'M40 8 L48 30 L72 34 L54 52 L58 74 L40 62 L22 74 L26 52 L8 34 L32 30 Z',
  qa_engineer: 'M40 10 L64 24 L64 48 Q64 66 40 72 Q16 66 16 48 L16 24 Z',
  media_producer: 'M24 14 L64 40 L24 66 Z',
  brand_manager: 'M12 40 L28 16 L52 16 L68 40 L52 64 L28 64 Z M24 40 L56 40',
  cfo: 'M16 20 L64 20 L64 60 L16 60 Z M26 32 L54 32 M26 40 L54 40 M26 48 L44 48',
  coach: 'M40 10 A14 14 0 1 1 39.9 10 Z M20 64 Q40 40 60 64',
  ads_manager: 'M16 16 L64 16 L64 54 L16 54 Z M24 26 L56 26 M24 34 L48 34 M24 44 L40 44',
  customer_support:
    'M20 32 Q20 14 40 14 Q60 14 60 32 L60 44 Q60 56 48 56 L44 56 L40 66 L36 56 L32 56 Q20 56 20 44 Z',
  customer_success: 'M40 8 L48 28 L68 28 L52 42 L58 64 L40 52 L22 64 L28 42 L12 28 L32 28 Z',
  customer_coach: 'M40 10 A20 20 0 1 1 39.9 10 Z M26 54 Q40 44 54 54 L54 70 L26 70 Z',
  hr: 'M26 28 A8 8 0 1 0 26 12 A8 8 0 1 0 26 28 Z M14 56 C14 40 26 34 26 34 C26 34 38 40 38 56 Z M54 24 A8 8 0 1 0 54 8 A8 8 0 1 0 54 24 Z M42 52 C42 36 54 30 54 30 C54 30 66 36 66 52 Z',
  atlas: 'M40 8 A32 32 0 1 1 39.9 8 Z M14 40 L66 40 M40 8 Q28 40 40 72 M40 8 Q52 40 40 72',
  viktor: 'M16 16 L40 64 L64 16 M24 16 L40 52 L56 16',
}

export function MarketingRoleEmblem({ roleKey, size }: { roleKey: string; size: 'sm' | 'lg' }) {
  const path = ROLE_SHAPES[roleKey] ?? ROLE_SHAPES.developer
  const dim = size === 'sm' ? 40 : 80
  const svgDim = Math.round(dim * 0.6)
  const blur = size === 'sm' ? 2 : 3.5
  const uid = `hre-${roleKey}-${size}`

  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full border border-white/10"
      style={{
        width: dim,
        height: dim,
        background:
          'radial-gradient(circle at 40% 35%, rgba(16,185,129,0.06) 0%, rgba(0,0,0,0) 70%), rgba(255,255,255,0.025)',
        boxShadow: `0 0 ${size === 'sm' ? 10 : 20}px rgba(16,185,129,0.12), inset 0 1px 0 rgba(255,255,255,0.06)`,
      }}
    >
      <svg viewBox="0 0 80 80" width={svgDim} height={svgDim} aria-hidden>
        <defs>
          <linearGradient id={`${uid}-g`} x1="0.2" y1="0" x2="0.8" y2="1">
            <stop offset="0%" stopColor="#6ee7b7" />
            <stop offset="50%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#059669" />
          </linearGradient>
          <filter id={`${uid}-f`}>
            <feGaussianBlur in="SourceGraphic" stdDeviation={String(blur)} result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <path d={path} fill={`url(#${uid}-g)`} filter={`url(#${uid}-f)`} />
      </svg>
    </div>
  )
}
