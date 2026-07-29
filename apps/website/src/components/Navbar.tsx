'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import {
  BookOpen,
  Brain,
  ChevronDown,
  CreditCard,
  Files,
  FileText,
  Menu,
  MessageSquare,
  Plug,
  Server,
  Target,
  Users,
  X,
  Zap,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { SiteLogo } from '@/components/SiteLogo'
import { WebsiteThemeToggle } from '@/components/WebsiteThemeToggle'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || ''

const featureLinks: { href: string; label: string; subtitle: string; icon: LucideIcon }[] = [
  {
    href: '/features/the-brain',
    label: 'The Brain',
    subtitle: 'Your domain knowledge, executable by AI',
    icon: Brain,
  },
  {
    href: '/features/your-team',
    label: 'Agents',
    subtitle: 'AI agents that work alongside your team',
    icon: Users,
  },
  {
    href: '/features/spaces',
    label: 'Spaces',
    subtitle: 'Tasks, docs, channels, and flows in one place',
    icon: Files,
  },
  // {
  //   href: '/features/studio',
  //   label: 'Studio',
  //   subtitle: 'Build alongside your agents in real time',
  //   icon: MessageSquare,
  // },
  // {
  //   href: '/features/documents',
  //   label: 'Documents',
  //   subtitle: 'Studio, Space, Missions, and Drive in one Docs view',
  //   icon: Files,
  // },
  // {
  //   href: '/features/missions',
  //   label: 'Missions',
  //   subtitle: 'Delegate work and review deliverables',
  //   icon: Target,
  // },
  // {
  //   href: '/features/autopilot',
  //   label: 'Autopilot',
  //   subtitle: 'Close the tab. Wake up to finished work.',
  //   icon: Zap,
  // },
  // {
  //   href: '/features/skills',
  //   label: 'Skills',
  //   subtitle: 'Teach your agents repeatable plays',
  //   icon: BookOpen,
  // },
  // {
  //   href: '/features/integrations',
  //   label: 'Integrations',
  //   subtitle: '35+ platforms your agents can use',
  //   icon: Plug,
  // },
  // {
  //   href: '/features/capabilities',
  //   label: 'Capabilities',
  //   subtitle: 'Funnels, email, ads, video, apps, and more',
  //   icon: Server,
  // },
]

const resourceLinks: {
  href: string
  label: string
  subtitle: string
  icon: LucideIcon
  external?: boolean
}[] = [
  { href: '/blog', label: 'Blog', subtitle: 'Updates, news, and insights', icon: FileText },
  {
    href: 'https://docs.vibey.im',
    label: 'Documentation',
    subtitle: 'Guides, API reference, and more',
    icon: BookOpen,
    external: true,
  },
]

export function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [openDesktop, setOpenDesktop] = useState<'features' | 'resources' | null>(null)
  const navRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setOpenDesktop(null)
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  return (
    <nav
      ref={navRef}
      className="nav-site-header border-section fixed left-0 right-0 top-0 z-[100] border-b backdrop-blur-md"
    >
      <div className="site-container flex items-center justify-between py-3">
        <Link href="/" className="flex items-center">
          <SiteLogo className="!h-10 w-auto sm:!h-11" />
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          <div className="relative">
            <button
              type="button"
              onClick={() => setOpenDesktop((v) => (v === 'features' ? null : 'features'))}
              className="text-color-muted body-3 flex items-center gap-1 rounded-lg px-3 py-2 font-medium transition-colors hover:text-[var(--text-primary)]"
            >
              Features
              <ChevronDown
                size={16}
                className={`transition-transform ${openDesktop === 'features' ? 'rotate-180' : ''}`}
              />
            </button>
            {openDesktop === 'features' && (
              <div
                className="border-color-glass bg-color-surface absolute left-1/2 top-full z-50 mt-1 -translate-x-1/2 rounded-xl border p-3 shadow-2xl backdrop-blur-3xl backdrop-saturate-150"
                style={{ width: 440 }}
              >
                <div className="space-y-1">
                  {featureLinks.map((f) => {
                    const Icon = f.icon
                    return (
                      <Link
                        key={f.href}
                        href={f.href}
                        onClick={() => setOpenDesktop(null)}
                        className="flex items-start gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-[var(--bg-subtle-hover)]"
                      >
                        <Icon size={16} className="text-color-muted mt-0.5 shrink-0" />
                        <div>
                          <span className="body-3 block font-medium text-[var(--text-primary)]">
                            {f.label}
                          </span>
                          <span className="text-color-dim block text-[12px] leading-snug whitespace-nowrap">
                            {f.subtitle}
                          </span>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="relative">
            <button
              type="button"
              onClick={() => setOpenDesktop((v) => (v === 'resources' ? null : 'resources'))}
              className="text-color-muted body-3 flex items-center gap-1 rounded-lg px-3 py-2 font-medium transition-colors hover:text-[var(--text-primary)]"
            >
              Resources
              <ChevronDown
                size={16}
                className={`transition-transform ${openDesktop === 'resources' ? 'rotate-180' : ''}`}
              />
            </button>
            {openDesktop === 'resources' && (
              <div
                className="border-color-glass bg-color-surface absolute left-0 top-full z-50 mt-1 rounded-xl border p-3 shadow-2xl backdrop-blur-3xl backdrop-saturate-150"
                style={{ width: 280 }}
              >
                <div className="space-y-1">
                  {resourceLinks.map((l) => {
                    const Icon = l.icon
                    const inner = (
                      <>
                        <Icon size={16} className="text-color-muted mt-0.5 shrink-0" />
                        <div>
                          <span className="body-3 block font-medium text-[var(--text-primary)]">
                            {l.label}
                          </span>
                          <span className="text-color-dim block text-[12px] leading-snug">
                            {l.subtitle}
                          </span>
                        </div>
                      </>
                    )
                    return l.external ? (
                      <a
                        key={l.href}
                        href={l.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => setOpenDesktop(null)}
                        className="flex items-start gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-[var(--bg-subtle-hover)]"
                      >
                        {inner}
                      </a>
                    ) : (
                      <Link
                        key={l.href}
                        href={l.href}
                        onClick={() => setOpenDesktop(null)}
                        className="flex items-start gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-[var(--bg-subtle-hover)]"
                      >
                        {inner}
                      </Link>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* <Link
            href="/pricing"
            className="text-color-muted body-3 rounded-lg px-3 py-2 font-medium transition-colors hover:text-[var(--text-primary)]"
          >
            Pricing
          </Link> */}
        </div>

        <div className="hidden items-center gap-2 md:flex">
          <WebsiteThemeToggle />
          <a
            href={`${APP_URL}/login`}
            className="chip-glass-neutral body-3 rounded-lg px-4 py-1.5 font-medium"
          >
            Log in
          </a>
          <a
            href="https://app.vibey.im/login"
            className="chip-glass-emerald body-3 rounded-lg px-4 py-1.5 font-semibold"
          >
            Get Early Access
          </a>
        </div>

        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="text-color-muted p-2 md:hidden"
          aria-label="Toggle menu"
        >
          {menuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {menuOpen && (
        <>
          <div
            className="fixed inset-0 z-[-1] bg-black/40 backdrop-blur-sm md:hidden"
            onClick={() => setMenuOpen(false)}
            aria-hidden
          />
          <div className="animate-fade-up border-color-glass bg-deep-backdrop max-h-[85vh] space-y-1 overflow-y-auto border-t px-6 py-6 backdrop-blur-2xl md:hidden">
            <p className="text-color-dim body-4 font-semibold uppercase tracking-wider">Features</p>
            {featureLinks.map((f) => {
              const Icon = f.icon
              return (
                <Link
                  key={f.href}
                  href={f.href}
                  onClick={() => setMenuOpen(false)}
                  className="text-color-muted body-2 flex items-center gap-2 font-medium transition-colors hover:text-[var(--text-primary)]"
                >
                  <Icon size={14} className="shrink-0" />
                  {f.label}
                </Link>
              )
            })}
            <p className="text-color-dim body-4 pt-5 font-semibold uppercase tracking-wider">
              Resources
            </p>
            {resourceLinks.map((link) => {
              const Icon = link.icon
              return link.external ? (
                <a
                  key={link.href}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setMenuOpen(false)}
                  className="text-color-muted body-2 flex items-center gap-2 font-medium transition-colors hover:text-[var(--text-primary)]"
                >
                  <Icon size={14} className="shrink-0" />
                  {link.label}
                </a>
              ) : (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className="text-color-muted body-2 flex items-center gap-2 font-medium transition-colors hover:text-[var(--text-primary)]"
                >
                  <Icon size={14} className="shrink-0" />
                  {link.label}
                </Link>
              )
            })}
            {/* <Link
              href="/pricing"
              onClick={() => setMenuOpen(false)}
                  className="text-color-muted body-2 flex items-center gap-2 font-medium transition-colors hover:text-[var(--text-primary)]"
            >
              <CreditCard size={14} className="shrink-0" />
              Pricing
            </Link> */}
            <div className="flex items-center justify-between py-3 md:hidden">
              <span className="body-4 font-semibold uppercase tracking-wider text-color-dim">
                Theme
              </span>
              <WebsiteThemeToggle />
            </div>
            <div className="border-color-glass space-y-3 border-t pt-4">
              <a
                href={`${APP_URL}/login`}
                className="text-color-muted body-2 block transition-colors hover:text-[var(--text-primary)]"
              >
                Log in
              </a>
              <a
                href="https://app.vibey.im/login"
                onClick={() => setMenuOpen(false)}
                className="chip-glass-emerald block w-full rounded-lg py-3 text-center font-semibold"
              >
                Get Early Access
              </a>
            </div>
          </div>
        </>
      )}
    </nav>
  )
}
