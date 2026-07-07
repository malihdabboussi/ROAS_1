import { motion } from 'framer-motion'
import { agents } from './agent-data'
import { AgentAvatar, Slide, SlideLabel } from './slide-primitives'

export function SlideTeamScatter() {
  const scatterPositions = [
    { top: '8%', left: '12%', rotate: -3 },
    { top: '5%', left: '45%', rotate: 2 },
    { top: '10%', left: '75%', rotate: -1 },
    { top: '30%', left: '5%', rotate: 4 },
    { top: '28%', left: '30%', rotate: -2 },
    { top: '25%', left: '58%', rotate: 3 },
    { top: '32%', left: '85%', rotate: -4 },
    { top: '52%', left: '15%', rotate: 1 },
    { top: '50%', left: '42%', rotate: -3 },
    { top: '55%', left: '68%', rotate: 2 },
    { top: '70%', left: '8%', rotate: -2 },
    { top: '72%', left: '35%', rotate: 3 },
    { top: '68%', left: '60%', rotate: -1 },
    { top: '75%', left: '82%', rotate: 4 },
  ]
  return (
    <Slide>
      <SlideLabel>But Here&apos;s The Thing</SlideLabel>
      <h2 className="max-w-4xl text-center font-[family-name:var(--font-site-headline)] text-3xl font-bold tracking-tight text-white md:text-5xl lg:text-6xl">
        YOU DON&apos;T JUST GET ONE.
        <br />
        <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
          YOU GET AN ENTIRE TEAM.
        </span>
      </h2>
      <p className="mt-4 max-w-xl text-center text-sm text-white/40">
        20+ specialist agents. Each with their own brain, skills, tools, and expertise that
        compounds over time. Not one AI with different prompts — a team of specialists. Like a real
        company.
      </p>
      <div className="relative mt-6 h-[300px] w-full max-w-4xl md:h-[360px]">
        {scatterPositions.map((pos, i) => {
          const agent = agents[i % agents.length]!
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.07, duration: 0.4, ease: 'easeOut' }}
              className="absolute"
              style={{ top: pos.top, left: pos.left, transform: `rotate(${pos.rotate}deg)` }}
            >
              <div className="flex flex-col items-center gap-1">
                <AgentAvatar src={agent.image_url} name={agent.default_name} size={44} />
                <span className="text-[10px] font-medium text-white/40">{agent.default_name}</span>
              </div>
            </motion.div>
          )
        })}
      </div>
    </Slide>
  )
}
