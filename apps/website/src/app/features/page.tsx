import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, Brain, Files, Users } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Footer } from '@/components/Footer'

export const metadata: Metadata = {
  title: 'Features | Vibey',
  description: 'The Brain, Agents, and Spaces. Everything your organization needs to run on AI.',
}

const features: { href: string; title: string; subtitle: string; icon: LucideIcon }[] = [
  { href: '/features/the-brain', title: 'The Brain', subtitle: 'Your domain knowledge, executable by AI', icon: Brain },
  { href: '/features/your-team', title: 'Agents', subtitle: 'AI agents that work alongside your team', icon: Users },
  { href: '/features/spaces', title: 'Spaces', subtitle: 'Tasks, docs, channels, and flows in one place', icon: Files },
  // { href: '/features/studio', title: 'Studio', subtitle: 'Build alongside your agents in real time', icon: MessageSquare },
  // { href: '/features/documents', title: 'Documents', subtitle: 'Studio, Space, Missions, and Drive in one Docs view', icon: Files },
  // { href: '/features/missions', title: 'Missions', subtitle: 'Delegate work and review deliverables', icon: Target },
  // { href: '/features/autopilot', title: 'Autopilot', subtitle: 'Close the tab. Wake up to finished work.', icon: Zap },
  // { href: '/features/skills', title: 'Skills', subtitle: 'Teach your agents repeatable plays', icon: BookOpen },
  // { href: '/features/integrations', title: 'Integrations', subtitle: '35+ platforms your agents can use', icon: Plug },
  // { href: '/features/capabilities', title: 'Capabilities', subtitle: 'Funnels, email, ads, video, apps, and more', icon: Server },
]

export default function FeaturesPage() {
  return (
    <>
      <main className="min-h-screen pt-28 pb-20">
        <div className="site-container">
          <div className="mx-auto max-w-3xl text-center mb-16">
            <h1 className="h1 uppercase tracking-tight text-white">FEATURES</h1>
            <p className="text-color-muted body-1 mt-4">
              Three pillars. One platform. The Brain, Agents, and Spaces working together.
            </p>
          </div>

          <div className="mx-auto max-w-4xl grid gap-4 sm:grid-cols-2">
            {features.map((f) => {
              const Icon = f.icon
              return (
                <Link
                  key={f.href}
                  href={f.href}
                  className="glass-card glass-card-hover group flex items-start gap-4 rounded-2xl p-6 transition-colors"
                >
                  <div className="feature-icon-chip h-10 w-10 shrink-0">
                    <Icon size={20} className="text-secondary" />
                  </div>
                  <div className="flex-1">
                    <h2 className="h4 text-white">{f.title}</h2>
                    <p className="text-color-muted body-3 mt-1 leading-relaxed">{f.subtitle}</p>
                  </div>
                  <ArrowRight size={16} className="text-color-dim mt-1 shrink-0 transition-transform group-hover:translate-x-1" />
                </Link>
              )
            })}
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
