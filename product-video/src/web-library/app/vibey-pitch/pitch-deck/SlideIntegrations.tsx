import { Slide, SlideLabel, SlideSub, SlideTitle } from './slide-primitives'

export function SlideIntegrations() {
  const categories = [
    { cat: 'Advertising', tools: 'Meta, Google Ads, TikTok, Reddit' },
    { cat: 'Social', tools: 'Facebook, Instagram, LinkedIn, X, YouTube' },
    { cat: 'Email', tools: 'Gmail, Mailchimp, Kit, Klaviyo, ActiveCampaign' },
    { cat: 'CRM', tools: 'HubSpot, Salesforce, GoHighLevel' },
    { cat: 'Productivity', tools: 'Google Drive/Docs/Sheets, Notion, ClickUp, Slack, Zoom' },
    { cat: 'Payments', tools: 'Stripe, PayPal, Whop' },
    { cat: 'Analytics', tools: 'Google Analytics, Search Console' },
    { cat: 'Dev', tools: 'GitHub, Vercel, Canva' },
  ]
  return (
    <Slide>
      <SlideLabel>Integrations</SlideLabel>
      <SlideTitle>36+ NATIVE INTEGRATIONS</SlideTitle>
      <SlideSub>
        Live, authenticated OAuth connections executing real actions on your behalf.
      </SlideSub>
      <div className="mt-8 grid w-full max-w-4xl grid-cols-2 gap-2 md:grid-cols-4">
        {categories.map((c) => (
          <div key={c.cat} className="border-white/8 rounded-lg border bg-white/[0.03] px-3 py-2">
            <div className="text-[11px] font-semibold text-emerald-400">{c.cat}</div>
            <div className="mt-1 text-[10px] leading-relaxed text-white/40">{c.tools}</div>
          </div>
        ))}
      </div>
      <p className="mt-4 text-center text-xs text-white/25">
        Plus Composio for hundreds of additional SaaS tools + MCP servers for custom connections.
      </p>
    </Slide>
  )
}
