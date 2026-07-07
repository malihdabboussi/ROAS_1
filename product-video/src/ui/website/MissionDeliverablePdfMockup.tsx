import { FileText } from 'lucide-react';

/** 1:1 copy of `MissionDeliverablePdfMockup` from
 *  `apps/website/src/components/marketing/MarketingMissionExecutionMockup.tsx`. */
export function MissionDeliverablePdfMockup({ label }: { label: string }) {
  return (
    <div className="studio-app-preview-root w-full overflow-hidden rounded-[var(--spacing-3)]">
      <div className="card-glass w-full overflow-hidden">
        <div className="bg-deep-muted relative flex max-h-56 min-h-[13.5rem] flex-col p-4">
          <div className="border-color-glass mb-3 flex shrink-0 items-center justify-between border-b border-white/10 pb-2">
            <span className="text-app-muted text-[10px] font-semibold uppercase tracking-wider">
              Preview
            </span>
            <span className="rounded bg-red-500/90 px-1.5 py-0.5 text-[9px] font-bold text-white">
              PDF
            </span>
          </div>
          <div className="text-app-foreground min-h-0 flex-1 select-none overflow-hidden">
            <p className="body-4 text-app-foreground mb-1 font-semibold leading-tight">
              Q2 SaaS launch — 3-part nurture sequence
            </p>
            <p className="text-app-muted mb-2 text-[10px] leading-snug">
              Campaign: Q2 SaaS Launch · Tone: confident, clear, on-brand
            </p>
            <p className="body-4 mb-1 leading-snug opacity-90">
              <span className="text-app-foreground font-medium">Email 1 — Problem.</span>{' '}
              <span className="text-app-muted">
                Open on the cost of a leaky funnel: missed follow-ups, long cycles, and demos that
                never convert. Anchor on one metric your ICP already tracks.
              </span>
            </p>
            <p className="body-4 mb-1 leading-snug opacity-90">
              <span className="text-app-foreground font-medium">Email 2 — Reframe.</span>{' '}
              <span className="text-app-muted">
                Show how teams like theirs operationalize nurture without adding headcount—brief
                proof, one customer snapshot, no hype.
              </span>
            </p>
            <p className="body-4 line-clamp-2 leading-snug opacity-90">
              <span className="text-app-foreground font-medium">Email 3 — CTA.</span>{' '}
              <span className="text-app-muted">
                Single ask: book a 20-minute working session. Restate value, remove risk (what to
                expect), link above the fold.
              </span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2.5 px-3.5 py-2">
          <FileText className="text-app-muted h-4 w-4 shrink-0" />
          <span className="text-app-foreground min-w-0 truncate text-sm font-medium">{label}</span>
        </div>
      </div>
    </div>
  );
}
