import { Slide, SlideLabel, SlideTitle, StatCard } from './slide-primitives'

export function SlideMarket() {
  return (
    <Slide>
      <SlideLabel>The Market</SlideLabel>
      <SlideTitle>WHY NOW</SlideTitle>
      <div className="mt-10 grid w-full max-w-3xl grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard value="$10.9B" label="Agentic AI Market 2026" accent="emerald" />
        <StatCard value="$199B" label="Projected by 2034" accent="blue" />
        <StatCard value="44%" label="CAGR Over 9 Years" accent="purple" />
        <StatCard value="5→40%" label="Enterprise AI Agents" accent="amber" />
      </div>
      <div className="mt-6 text-center text-[10px] text-white/25">
        Source: Precedence Research, Gartner
      </div>
      <div className="mt-6 max-w-2xl space-y-2 text-sm text-white/40">
        <p>
          Fastest-growing tech category since cloud — spending velocity 340% higher than RPA&apos;s
          peak
        </p>
        <p>
          93% of business leaders believe scaling AI agents in 12 months creates competitive
          advantage <span className="text-white/20">(Capgemini)</span>
        </p>
        <p>
          1,445% surge in multi-agent system inquiries Q1 2024 → Q2 2025{' '}
          <span className="text-white/20">(Gartner)</span>
        </p>
        <p>
          SaaS collapsing into AI-native — Salesforce launched Agentforce, HubSpot repositioning
        </p>
      </div>
    </Slide>
  )
}
