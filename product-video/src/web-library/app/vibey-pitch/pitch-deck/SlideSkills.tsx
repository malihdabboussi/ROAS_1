import { MarketingSkillStackMockup } from '@/components/marketing/MarketingSkillStackMockup'
import { Slide, SlideLabel } from './slide-primitives'

export function SlideSkills() {
  return (
    <Slide className="!px-4 !py-8">
      <SlideLabel>SOPs = Skills</SlideLabel>
      <h2 className="mb-2 max-w-3xl text-center font-[family-name:var(--font-site-headline)] text-2xl font-bold tracking-tight text-white md:text-4xl">
        100+ PREMADE SKILLS
      </h2>
      <p className="mb-2 max-w-xl text-center text-sm text-white/40">
        Upload a Google Drive link, a PDF, or a video. The platform reads it and builds the skill
        automatically. Then chat to optimize — refine the workflow, adjust the approach, talk
        through edge cases. The skill becomes permanent.
      </p>
      <p className="mb-6 max-w-xl text-center text-xs text-white/25">
        Each agent operates with their own skills, communication style, context, and personality.
        Just like a trained employee.
      </p>
      <div className="w-full max-w-3xl">
        <MarketingSkillStackMockup />
      </div>
    </Slide>
  )
}
