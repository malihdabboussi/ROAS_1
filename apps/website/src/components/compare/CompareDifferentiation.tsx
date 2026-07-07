import {
  Brain,
  Layers,
  LayoutTemplate,
  Link2,
  MessageSquare,
  Rocket,
  Target,
  Wand2,
  Users,
  Workflow,
} from 'lucide-react'
import { AnimateOnScroll } from '@/components/AnimateOnScroll'
import { CompareWaitlistButton } from '@/components/compare/CompareWaitlistButton'
import type { CompareDifferentiationCard, CompareDifferentiationIcon } from '@/lib/compare-content'

function DifferentiationIcon({ name }: { name: CompareDifferentiationIcon }) {
  const className = 'text-color-muted h-6 w-6 shrink-0'
  const stroke = 1.5
  switch (name) {
    case 'layers':
      return <Layers className={className} strokeWidth={stroke} />
    case 'brain':
      return <Brain className={className} strokeWidth={stroke} />
    case 'rocket':
      return <Rocket className={className} strokeWidth={stroke} />
    case 'users':
      return <Users className={className} strokeWidth={stroke} />
    case 'target':
      return <Target className={className} strokeWidth={stroke} />
    case 'layout-template':
      return <LayoutTemplate className={className} strokeWidth={stroke} />
    case 'workflow':
      return <Workflow className={className} strokeWidth={stroke} />
    case 'message-square':
      return <MessageSquare className={className} strokeWidth={stroke} />
    case 'link2':
      return <Link2 className={className} strokeWidth={stroke} />
    case 'wand2':
      return <Wand2 className={className} strokeWidth={stroke} />
    default: {
      const _x: never = name
      return _x
    }
  }
}

function DifferentiationCard(props: { card: CompareDifferentiationCard }) {
  return (
    <div className="glass-card border-section flex gap-4 rounded-2xl border p-5 md:p-6">
      <div className="border-color-glass bg-color-subtle-bright flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border">
        <DifferentiationIcon name={props.card.icon} />
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="h4 mb-3 text-white">{props.card.title}</h3>
        <p className="text-text-muted body-3 mb-5 whitespace-pre-line leading-snug">
          {props.card.bodyLines.join('\n')}
        </p>
        <p className="body-3 text-emerald-accent font-semibold leading-snug">
          {props.card.punchline}
        </p>
      </div>
    </div>
  )
}

export function CompareDifferentiation(props: {
  headlineCards: [string, string]
  subhead: string
  cards: CompareDifferentiationCard[]
}) {
  return (
    <section className="section-padding border-section relative border-t">
      <AnimateOnScroll>
        <div className="site-container">
          <div className="mx-auto max-w-5xl">
            <header className="mx-auto mb-14 max-w-3xl text-center md:mb-16">
              <h2 className="h2 mb-4 tracking-tight text-white">
                <span className="block">{props.headlineCards[0]}</span>
                <span className="mt-3 block md:mt-4">{props.headlineCards[1]}</span>
              </h2>
              <p className="text-text-muted body-2 leading-relaxed">{props.subhead}</p>
            </header>

            <div className="mb-12 grid gap-6 md:grid-cols-2 md:gap-8">
              {props.cards.map((card) => (
                <DifferentiationCard key={card.title} card={card} />
              ))}
            </div>
            <div className="flex justify-center">
              <CompareWaitlistButton className="chip-glass-emerald body-3 rounded-full px-10 py-3 font-semibold">
                Join Waitlist
              </CompareWaitlistButton>
            </div>
          </div>
        </div>
      </AnimateOnScroll>
    </section>
  )
}
