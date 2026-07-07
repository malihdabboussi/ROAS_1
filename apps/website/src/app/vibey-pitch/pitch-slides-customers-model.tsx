'use client'

import { motion } from 'framer-motion'
import { Slide, SlideLabel, SlideTitle } from './pitch-slide-ui'

type UseCaseStory = {
  name: string
  role: string
  imageSrc: string
  imagePosition?: string
  about: string
  brain: string
  agents: string
  spaces: string
  proof: string
}

const USE_CASE_STORIES: Record<'adley' | 'brian' | 'roas' | 'neel', UseCaseStory> = {
  adley: {
    name: 'Adley',
    role: 'Content Creator',
    imageSrc: '/pitch/adley.png',
    imagePosition: 'object-top',
    about:
      "Large-audience creator and entrepreneur. Puts out content across every platform and can't afford to sound like a bot.",
    brain: 'Uploaded her videos, captions, and past content',
    agents: 'Wrote posts, scripts, and emails in her voice',
    spaces: 'Content calendar, drafts, and launch tracker in one place',
    proof: '1-3 billion impressions per month',
  },
  brian: {
    name: 'Brian',
    role: 'Enterprise Operator',
    imageSrc: '/pitch/brian-mark.png',
    imagePosition: 'object-top',
    about:
      'Runs a high-ticket service business at $9,500/month. Not here for marketing. Vibey is how he runs the company.',
    brain: 'Connected Stripe, PayPal, Whoop and loaded his SOPs',
    agents: 'Handle client reporting, follow-ups, and recurring ops without him',
    spaces: 'Client management, revenue tracking, ops, and client coaching bot',
    proof:
      '10,000+ messages in the first 72 hours. New data on every customer. The entire client journey feeding his AI.',
  },
  roas: {
    name: 'ROAS',
    role: 'Agency Owner',
    imageSrc: '/pitch/case-study/slack-onboard.png',
    imagePosition: 'object-center',
    about:
      'Runs multiple client engagements. Onboarding was the part that never got fixed - manual, slow, different every time.',
    brain: 'Loaded his process, service tiers, and discovery framework',
    agents: 'Build client-specific onboarding packages the moment a deal closes',
    spaces: 'Every client has their own workspace with tasks, status, and deliverables',
    proof: '5x agency capacity. Zero new hires.',
  },
  neel: {
    name: 'Neel Dhingra',
    role: 'Real Estate Coach',
    imageSrc: '/pitch/case-study/neel-stage.png',
    imagePosition: 'object-center',
    about:
      'Online coach and live event host. Forward Event needed a full campaign built fast - ads, registration, emails, social, all of it.',
    brain: 'Loaded the event brief, audience, and his brand voice',
    agents: 'Built ads, registration page, emails, and social content mid-campaign',
    spaces: 'Every asset and channel in one view',
    proof: '8,000+ registrations. 1,000-person event sold out.',
  },
}

function UseCaseStorySlide({ story }: { story: UseCaseStory }) {
  return (
    <Slide className="!py-4">
      <SlideLabel>Customers</SlideLabel>
      <SlideTitle>USE CASE: {story.name.toUpperCase()}</SlideTitle>

      <div className="mt-5 grid w-full max-w-6xl gap-6 max-md:mt-3 max-md:gap-3 md:grid-cols-[0.95fr_1.05fr]">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.02] ring-1 ring-white/[0.06]"
        >
          <img
            src={story.imageSrc}
            alt={story.name}
            className={`h-[320px] w-full object-cover max-md:h-[210px] ${story.imagePosition ?? 'object-center'}`}
          />
          <div className="border-t border-white/[0.08] px-4 py-3">
            <p className="text-lg font-bold text-white">{story.name}</p>
            <p className="text-sm text-emerald-300/85">{story.role}</p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.33 }}
          className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 ring-1 ring-white/[0.06] max-md:p-4"
        >
          <p className="text-sm leading-relaxed text-white/70 max-md:text-[13px]">{story.about}</p>

          <ul className="mt-4 space-y-2.5 text-[13px] leading-relaxed text-white/80 max-md:mt-3 max-md:space-y-2 max-md:text-[12px]">
            <li className="flex items-start gap-2">
              <span className="mt-0.5">🧠</span>
              <span>
                <span className="font-semibold text-white">Brain</span> - {story.brain}
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5">🤖</span>
              <span>
                <span className="font-semibold text-white">Agents</span> - {story.agents}
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5">🗂</span>
              <span>
                <span className="font-semibold text-white">Spaces</span> - {story.spaces}
              </span>
            </li>
          </ul>

          <p className="mt-5 border-t border-white/[0.08] pt-3 text-sm font-semibold text-amber-300 max-md:mt-3 max-md:text-[13px]">
            {story.proof}
          </p>
        </motion.div>
      </div>
    </Slide>
  )
}

export function SlideUseCaseAdley() {
  return <UseCaseStorySlide story={USE_CASE_STORIES.adley} />
}

export function SlideUseCaseBrian() {
  return <UseCaseStorySlide story={USE_CASE_STORIES.brian} />
}

export function SlideUseCaseRoas() {
  return <UseCaseStorySlide story={USE_CASE_STORIES.roas} />
}

export function SlideUseCaseNeel() {
  return <UseCaseStorySlide story={USE_CASE_STORIES.neel} />
}

// ─── Slide 32: Business Model ────────────────────────────────────────────────

export function SlideModel() {
  const tiers = [
    {
      name: 'Base',
      price: '$297/month',
      fit: 'Great for solo founders and small teams',
      points: [
        'Core agents',
        'One company brain',
        'Individual workspace',
        'Unlimited users',
        '10,000 credits to start',
      ],
      accent: 'from-blue-500/[0.1] via-transparent to-transparent',
      ring: 'ring-blue-500/20',
      border: 'border-blue-500/25',
    },
    {
      name: 'Scale',
      price: '$1,997/month',
      fit: 'Great for agencies or large teams',
      points: [
        'All agents',
        'Unlimited brains',
        'Unlimited users',
        'Unlimited workspaces',
        '100,000 credits to start',
        'Reseller rights',
      ],
      accent: 'from-emerald-500/[0.12] via-transparent to-transparent',
      ring: 'ring-emerald-500/25',
      border: 'border-emerald-500/30',
    },
    {
      name: 'Enterprise',
      price: 'Starting at $9,500/month',
      fit: 'Great for fast growing teams and organizations that need dedicated support, custom integrations, and rapid growth',
      points: [
        'Customized support and onboarding',
        'Weekly calls with support',
        '200,000 credits to start',
        'Custom whitelabel portal',
        'Feature requests',
      ],
      accent: 'from-purple-500/[0.12] via-transparent to-transparent',
      ring: 'ring-purple-500/20',
      border: 'border-purple-500/25',
    },
  ] as const

  return (
    <Slide className="!py-4">
      <SlideLabel>Business Model</SlideLabel>
      <SlideTitle>THE MODEL</SlideTitle>

      <div className="mt-6 grid w-full max-w-6xl gap-4 lg:grid-cols-3">
        {tiers.map((tier, i) => (
          <motion.div
            key={tier.name}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.32 + i * 0.1 }}
            className={`relative flex h-full flex-col rounded-2xl border ${tier.border} bg-gradient-to-br ${tier.accent} p-5 ring-1 ${tier.ring}`}
          >
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/50">
              {tier.name}
            </p>
            <h3 className="mt-1 font-[family-name:var(--font-site-headline)] text-2xl font-bold leading-tight text-white">
              {tier.price}
            </h3>

            <ul className="mt-4 space-y-2 text-[12px] leading-relaxed text-white/65">
              {tier.points.map((point) => (
                <li key={point} className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-300/85" />
                  <span>{point}</span>
                </li>
              ))}
            </ul>

            <p className="mt-4 border-t border-white/[0.08] pt-3 text-[11px] font-medium text-white/45">
              {tier.fit}
            </p>
          </motion.div>
        ))}
      </div>
    </Slide>
  )
}

// ─── Slide 33: Traction ──────────────────────────────────────────────────────

export function SlideTraction() {
  return (
    <Slide className="!py-4">
      <SlideLabel>Traction</SlideLabel>
      <SlideTitle className="max-w-5xl text-balance max-md:!text-[1.55rem]">
        $20K MRR + A MASSIVE PIPELINE OF OPPORTUNITY
      </SlideTitle>

      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="mt-8 w-full max-w-4xl rounded-2xl border border-amber-400/20 bg-amber-500/[0.04] p-6 ring-1 ring-amber-500/10 max-md:mt-4 max-md:p-4"
      >
        <ul className="mx-auto w-full max-w-3xl space-y-2.5 text-left text-xl leading-relaxed text-white/88 max-md:space-y-2 max-md:text-[1.05rem] md:text-2xl">
          {[
            '100+ beta users',
            '2 enterprise clients with their entire team on board',
            'Adley/Viralish June launch (hundreds of users)',
            'Tennis Europe Association',
            '$1B national staffing company',
            'ROAS.co digital partner pipeline expansion',
          ].map((item) => (
            <li key={item} className="flex items-start gap-3">
              <span className="mt-3 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-300/90" />
              <span className="leading-snug">{item}</span>
            </li>
          ))}
        </ul>
      </motion.div>
    </Slide>
  )
}
