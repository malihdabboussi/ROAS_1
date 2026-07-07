const ROLE_VISUAL_MAP: Record<
  string,
  { wardrobe: string[]; settings: string[]; styles: string[] }
> = {
  creative: {
    wardrobe: [
      'oversized vintage band tee with paint-splattered jeans',
      'loose linen shirt with rolled sleeves and layered necklaces',
      'colorful patterned kimono jacket over a simple black top',
      'distressed denim jacket covered in enamel pins',
    ],
    settings: [
      'sunlit art studio with canvases in the background, warm natural light',
      'graffiti-covered alley with soft afternoon light filtering through',
      'cozy creative workspace with mood boards and plants, window light',
      'rooftop with string lights at golden hour, city skyline bokeh',
    ],
    styles: [
      'Lifestyle documentary portrait, 50mm lens, shallow depth of field, film grain.',
      'Editorial portrait, warm analog tones, Kodak Portra 400 feel.',
      'Candid street photography style, 35mm lens, natural light, authentic energy.',
    ],
  },
  technical: {
    wardrobe: [
      'clean black hoodie with a subtle tech logo',
      'minimal dark crewneck and wireless earbuds around neck',
      'fitted henley shirt with sleeves pushed up',
      'smart-casual dark polo, clean and understated',
    ],
    settings: [
      'modern home office with dual monitors softly blurred behind, cool ambient light',
      'minimalist desk setup with mechanical keyboard visible, soft window light from the side',
      'dimly lit workspace with monitor glow providing accent light, moody atmosphere',
      'clean modern coworking space with exposed brick, natural daylight',
    ],
    styles: [
      'Clean editorial headshot, 85mm lens, shallow depth of field, crisp detail.',
      'Moody environmental portrait, cool tones, single side light source.',
      'Modern tech-industry editorial, natural light, muted color palette.',
    ],
  },
  strategic: {
    wardrobe: [
      'tailored navy blazer over a white crewneck tee',
      'well-fitted charcoal turtleneck, minimal accessories',
      'crisp button-down shirt with sleeves rolled to elbows, no tie',
      'structured blazer with a subtle pattern over a simple top',
    ],
    settings: [
      'modern open-plan office with floor-to-ceiling windows, city view bokeh',
      'sleek conference room with clean lines, soft overhead lighting',
      'upscale café corner table, natural window light from the left',
      'executive lounge with leather chairs and warm ambient lighting',
    ],
    styles: [
      'High-end editorial headshot, 85mm lens, ring light catch in eyes, clean gradient background.',
      'Environmental executive portrait, warm palette, confident but approachable.',
      'Lifestyle editorial, 70mm lens, shallow depth of field, muted luxury tones.',
    ],
  },
  support: {
    wardrobe: [
      'friendly casual polo shirt in a warm color',
      'soft knit sweater with a welcoming vibe',
      'clean button-down shirt, approachable and tidy',
      'simple crew-neck tee with a lanyard around neck',
    ],
    settings: [
      'bright modern customer service center, clean and welcoming',
      'warm café-style workspace with natural light and plants',
      'friendly open office with team photos on the wall behind',
      'clean desk with a headset nearby, warm overhead lighting',
    ],
    styles: [
      'Warm candid portrait, natural smile, 50mm lens, soft daylight, approachable energy.',
      'Friendly headshot, bright tones, shallow depth of field, genuine eye contact.',
      'Lifestyle portrait, warm golden-hour light, relaxed and inviting atmosphere.',
    ],
  },
  operations: {
    wardrobe: [
      'smart-casual dark blazer over a graphic tee',
      'clean utility vest over a fitted long-sleeve shirt',
      'modern athleisure meets business casual, minimal watch',
      'structured jacket with subtle texture, no tie',
    ],
    settings: [
      'organized workspace with whiteboards and sticky notes behind, natural light',
      'industrial-chic coworking space with exposed ducts and warm accents',
      'standing desk setup in a modern loft office, afternoon light',
      'outdoor urban courtyard between buildings, directional late-afternoon sun',
    ],
    styles: [
      'Documentary-style environmental portrait, 35mm lens, natural light, authentic feel.',
      'Urban editorial, warm afternoon tones, candid confident expression.',
      'Modern workplace portrait, clean composition, 85mm lens, soft bokeh.',
    ],
  },
}

const ROLE_KEYWORDS: Record<string, string[]> = {
  creative: [
    'design',
    'creative',
    'art',
    'copy',
    'writer',
    'content',
    'brand',
    'video',
    'media',
    'social',
    'graphic',
  ],
  technical: [
    'develop',
    'engineer',
    'tech',
    'code',
    'data',
    'automat',
    'integrat',
    'devops',
    'architect',
    'system',
  ],
  strategic: [
    'strateg',
    'ceo',
    'cto',
    'cmo',
    'cfo',
    'coo',
    'director',
    'vp',
    'founder',
    'executive',
    'chief',
    'leader',
    'head of',
    'manager',
    'marketing',
    'growth',
    'product',
  ],
  support: ['support', 'success', 'coach', 'help', 'service', 'care', 'community', 'onboard'],
  operations: [
    'operation',
    'project',
    'logistics',
    'process',
    'workflow',
    'coordinat',
    'admin',
    'analyst',
    'research',
    'recruit',
    'hr',
  ],
}

function resolveVisualCategory(role: string): string {
  const lower = role.toLowerCase()
  for (const [category, keywords] of Object.entries(ROLE_KEYWORDS)) {
    if (keywords.some((kw) => lower.includes(kw))) return category
  }
  return 'creative'
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!
}

export function buildAgentPortraitPrompt(
  name: string,
  role: string,
  styleDescription?: string,
): string {
  const category = resolveVisualCategory(role)
  const visual = ROLE_VISUAL_MAP[category]!
  const wardrobe = pick(visual.wardrobe)
  const setting = pick(visual.settings)
  const style = pick(visual.styles)
  const personality = styleDescription ? ` ${styleDescription}.` : ''
  return `${style} Portrait of ${name}, a ${role} in their early 30s.${personality} Wearing ${wardrobe}. ${setting}. Natural confident expression. Upper body only, chest-up portrait, no legs.`
}
