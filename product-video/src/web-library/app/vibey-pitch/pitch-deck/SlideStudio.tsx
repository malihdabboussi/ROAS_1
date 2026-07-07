import { Globe, Mail, Monitor, Target } from 'lucide-react'
import { Slide, SlideLabel, SlideSub, SlideTitle } from './slide-primitives'

export function SlideStudio() {
  return (
    <Slide>
      <SlideLabel>How It Works</SlideLabel>
      <SlideTitle>STUDIO</SlideTitle>
      <SlideSub>Your war room. You and your AI team, building in real time.</SlideSub>
      <div className="mt-8 grid w-full max-w-3xl grid-cols-2 gap-4 md:grid-cols-4">
        {[
          { icon: Globe, label: 'Funnels', desc: 'Deployed to your domain' },
          { icon: Mail, label: 'Email Sequences', desc: 'From your verified domain' },
          { icon: Target, label: 'Meta Ads', desc: 'Published with images & targeting' },
          { icon: Monitor, label: 'Websites & Apps', desc: 'Multi-page with SEO' },
        ].map((item) => (
          <div
            key={item.label}
            className="border-white/8 flex flex-col items-center gap-3 rounded-xl border bg-white/[0.03] p-4 text-center"
          >
            <item.icon size={24} className="text-emerald-400/80" />
            <div className="text-sm font-semibold text-white">{item.label}</div>
            <div className="text-[11px] text-white/40">{item.desc}</div>
          </div>
        ))}
      </div>
      <p className="mt-6 max-w-lg text-center text-xs text-white/30">
        See everything you&apos;re working on — landing pages, email sequences, ad campaigns — and
        iterate by talking. The artifact updates live.
      </p>
    </Slide>
  )
}
