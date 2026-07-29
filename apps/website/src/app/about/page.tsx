import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { Footer } from '@/components/Footer'

export const metadata: Metadata = {
  title: 'About | ROAS',
  description:
    'ROAS is an AI operating system for running a business — built by Sefy Tofan to give every founder and operator the power of a full team, without the headcount.',
  openGraph: {
    title: 'About | ROAS',
    description:
      'ROAS is an AI operating system for running a business — built to give every founder and operator the power of a full team, without the headcount.',
    url: 'https://vibey.im/about',
    siteName: 'ROAS',
    type: 'website',
    images: [
      { url: '/Logos/logov2/icon-text-white.png', width: 1200, height: 630, alt: 'About ROAS' },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@usevibey',
    title: 'About | ROAS',
    description: 'ROAS is an AI operating system for running a business.',
  },
  alternates: { canonical: 'https://vibey.im/about' },
}

const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'ROAS',
  url: 'https://vibey.im',
  logo: 'https://vibey.im/Logos/logov2/icon-text-white.png',
  description:
    'ROAS is an AI operating system for running a business — a team of specialist AI agents with persistent memory, autonomous execution, and a built-in marketing engine.',
  founder: {
    '@type': 'Person',
    name: 'Sefy Tofan',
    jobTitle: 'Founder & CEO',
    image: 'https://vibey.im/images/authors/sefy-tofan.png',
  },
  sameAs: [
    'https://x.com/usevibey',
    'https://www.instagram.com/vibey.im/',
    'https://www.linkedin.com/company/usevibey',
    'https://www.youtube.com/@usevibey',
  ],
}

export default function AboutPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
      <main className="min-h-screen pb-24 pt-32">
        <div className="site-container">
          <div className="mx-auto max-w-3xl">
            {/* Header */}
            <div className="mb-16">
              <p className="text-color-muted body-3 mb-3 font-semibold uppercase tracking-wider">
                About
              </p>
              <h1 className="h1 mb-6 tracking-tight text-white">
                THE AI OPERATING SYSTEM FOR YOUR BUSINESS
              </h1>
              <p className="body-1 text-color-secondary leading-relaxed">
                ROAS is not a chatbot. It is not a single AI assistant. It is an operating layer —
                a team of specialist AI agents that work together, remember your brand, and execute
                real work: funnels that publish, ads that run, email sequences that send, and
                missions that ship.
              </p>
            </div>

            {/* Mission */}
            <section className="mb-16">
              <h2 className="h3 mb-4 text-white">Why we built this</h2>
              <div className="space-y-4">
                <p className="body-2 text-color-secondary leading-relaxed">
                  Every founder, marketer, and operator knows the problem: you have the vision, but
                  not the team. Hiring is expensive, slow, and risky. Generic AI tools give you text
                  you have to paste somewhere else. Neither solves the real problem — execution.
                </p>
                <p className="body-2 text-color-secondary leading-relaxed">
                  ROAS was built on a simple belief: the bottleneck isn&apos;t ideas. It&apos;s the
                  gap between thinking and doing. Between strategy and execution. Between &quot;we
                  should run ads&quot; and ads actually running.
                </p>
                <p className="body-2 text-color-secondary leading-relaxed">
                  We built ROAS to close that gap permanently — with a team of agents that know
                  your brand, remember your decisions, and get the work done.
                </p>
              </div>
            </section>

            {/* What ROAS does */}
            <section className="mb-16">
              <h2 className="h3 mb-6 text-white">What ROAS does</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {[
                  {
                    title: 'Your Team',
                    description:
                      'Specialist agents you hire, train, and manage — each with a role, memory, skills, and integrations.',
                  },
                  {
                    title: 'The Brain',
                    description:
                      'Three layers of persistent memory that compound over time. Your brand, voice, and decisions are never forgotten.',
                  },
                  {
                    title: 'Missions',
                    description:
                      'Delegate structured work with plans, subtasks, dependencies, and deliverables — tracked on a Kanban board.',
                  },
                  {
                    title: 'Autopilot',
                    description:
                      'Set your North Star, close the tab. ROAS runs the business, creates missions, retries failures, and sends daily digests.',
                  },
                  {
                    title: 'Marketing Engine',
                    description:
                      'Funnels, email sequences, Meta and Google ads, social content, lead capture, CRM, and analytics — all built in.',
                  },
                  {
                    title: 'Skills',
                    description:
                      'Teach your agents repeatable plays. The more you teach, the sharper and faster they get.',
                  },
                ].map((item) => (
                  <div
                    key={item.title}
                    className="rounded-xl p-5"
                    style={{
                      background: 'var(--bg-subtle)',
                      border: '1px solid var(--border-subtle)',
                    }}
                  >
                    <h3 className="body-2 mb-2 font-semibold text-white">{item.title}</h3>
                    <p className="body-3 text-color-muted leading-relaxed">{item.description}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* Founder */}
            <section className="mb-16">
              <h2 className="h3 mb-6 text-white">The founder</h2>
              <div
                className="flex flex-col gap-6 rounded-2xl p-6 sm:flex-row sm:items-start"
                style={{
                  background: 'var(--bg-subtle)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <div className="shrink-0">
                  <Image
                    src="/images/authors/sefy-tofan.png"
                    alt="Sefy Tofan"
                    width={80}
                    height={80}
                    className="rounded-full object-cover"
                  />
                </div>
                <div>
                  <p className="body-2 mb-0.5 font-semibold text-white">Sefy Tofan</p>
                  <p className="text-color-muted body-3 mb-3">Founder & CEO</p>
                  <p className="body-3 text-color-secondary leading-relaxed">
                    Sefy built ROAS after years of watching brilliant founders spend more time
                    managing tools, agencies, and workflows than actually building their business.
                    The vision: an AI team that doesn&apos;t just help you think — it gets the work
                    done.
                  </p>
                </div>
              </div>
            </section>

            {/* CTA */}
            <section className="text-center">
              <h2 className="h3 mb-4 text-white">Ready to run your business on AI?</h2>
              <p className="body-2 text-color-muted mb-8">
                Join founders and operators already using ROAS to execute faster than ever.
              </p>
              <Link
                href="/pricing"
                className="glow-emerald bg-emerald-accent text-on-emerald body-2 group inline-flex items-center gap-2 rounded-xl px-8 py-4 font-bold transition-all hover:brightness-110"
              >
                Get started
                <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
              </Link>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
