import { motion } from 'framer-motion'
import { Slide } from './slide-primitives'

export function SlideCover() {
  return (
    <Slide>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8 }}
        className="flex flex-col items-center"
      >
        <img src="/Logos/logov2/icon-white.png" alt="Vibey" className="mb-8 h-16 w-16 opacity-80" />
        <h1 className="max-w-3xl text-center font-[family-name:var(--font-site-headline)] text-4xl font-bold tracking-tight text-white md:text-6xl lg:text-7xl">
          YOUR AI TEAM.
          <br />
          <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
            READY TO WORK.
          </span>
        </h1>
        <p className="mt-8 text-center text-lg text-white/40">
          Seed Pitch&ensp;|&ensp;$5.5M for 10%&ensp;|&ensp;$55M Post-Money
        </p>
      </motion.div>
    </Slide>
  )
}
