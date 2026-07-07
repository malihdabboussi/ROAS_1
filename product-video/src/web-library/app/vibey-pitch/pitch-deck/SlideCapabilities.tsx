import { Slide, SlideLabel, SlideTitle } from './slide-primitives'

export function SlideCapabilities() {
  const caps = [
    { label: 'Funnels', desc: 'Published to your domain, capturing leads', color: 'emerald' },
    { label: 'Email Sequences', desc: 'Sending from your verified domain', color: 'blue' },
    {
      label: 'Meta Ad Campaigns',
      desc: 'Published with images, copy, and targeting',
      color: 'purple',
    },
    { label: 'Websites', desc: 'Multi-page with nav, blog, SEO — deployed live', color: 'amber' },
    {
      label: 'Video Editing',
      desc: 'Generate and edit — trim, merge, add audio, resize',
      color: 'emerald',
    },
    {
      label: 'Financial Planning',
      desc: 'Generate financial reports and dashboards',
      color: 'blue',
    },
    { label: 'Social Content', desc: 'Scheduled to LinkedIn and Instagram', color: 'purple' },
    { label: 'Video & Images', desc: 'Generated, edited, production-ready assets', color: 'amber' },
    { label: 'Presentations', desc: 'PDF/PPTX with branded design', color: 'emerald' },
    { label: 'Coding & Custom Apps', desc: 'Built with dev agent, deployed to URL', color: 'blue' },
    {
      label: 'Chrome Extension',
      desc: 'Browse with saved cookies. Agents take actions on your accounts.',
      color: 'purple',
    },
  ] as const
  const colorMap = {
    emerald: 'border-emerald-500/20 text-emerald-400',
    blue: 'border-blue-500/20 text-blue-400',
    purple: 'border-purple-500/20 text-purple-400',
    amber: 'border-amber-500/20 text-amber-400',
  }

  return (
    <Slide>
      <SlideLabel>Capabilities</SlideLabel>
      <SlideTitle>WHAT THEY CAN DO</SlideTitle>
      <div className="mt-8 grid w-full max-w-4xl grid-cols-2 gap-2 md:grid-cols-4">
        {caps.map((o) => (
          <div
            key={o.label}
            className={`rounded-xl border bg-white/[0.02] p-3 ${colorMap[o.color]}`}
          >
            <div className="text-xs font-semibold">{o.label}</div>
            <div className="mt-1 text-[10px] text-white/40">{o.desc}</div>
          </div>
        ))}
      </div>
    </Slide>
  )
}
