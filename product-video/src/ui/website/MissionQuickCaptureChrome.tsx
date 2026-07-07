import { Paperclip, FolderOpen, Flag, Mic } from 'lucide-react';

/** 1:1 port of `MissionQuickCaptureChrome` from
 *  `apps/website/src/components/marketing/MarketingMissionExecutionMockup.tsx`.
 *  `textarea` replaced with a readonly presentational `div` so Remotion renders a
 *  blinking caret controlled via a `caretVisible` prop (no browser focus). */

const MISSION_CAPTURE_TEXT_MAX_CHARS = 10_000;
const QUICK_CAPTURE_PLACEHOLDER = 'Tell me what to run...';

function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ');
}

export function MissionQuickCaptureChrome(props: {
  briefText: string;
  phase: 'brief' | 'planning' | 'execution' | 'done';
  compact?: boolean;
  caretVisible?: boolean;
}) {
  const { briefText, phase, compact, caretVisible } = props;
  const inputValue = briefText;
  const demoCampaignName = 'Q2 SaaS Launch';
  const iconBtn = compact ? 'h-7 w-7' : 'h-8 w-8';
  const iconSz = compact ? 'h-3 w-3' : 'h-3.5 w-3.5';
  const empty = inputValue.length === 0;

  return (
    <div
      className={cn(
        'input-glass rounded-spacing-3 relative flex flex-col',
        compact && 'rounded-lg',
      )}
    >
      <div className={cn('flex-1', compact ? 'px-3 pt-2' : 'px-4 pt-3')}>
        <div
          className={cn(
            'placeholder-muted w-full resize-none whitespace-pre-wrap break-words bg-transparent text-white caret-[rgb(var(--accent-emerald-rgb))] outline-none',
            compact
              ? 'body-3 max-h-[72px] min-h-[38px] leading-snug'
              : 'body-2 max-h-[200px] min-h-[60px]',
            empty && 'text-white/40',
          )}
        >
          {empty ? QUICK_CAPTURE_PLACEHOLDER : inputValue}
          {caretVisible && !empty ? (
            <span
              aria-hidden
              style={{
                display: 'inline-block',
                verticalAlign: 'text-bottom',
                width: 2,
                height: '1.2em',
                marginLeft: 2,
                background: 'rgb(var(--accent-emerald-rgb))',
              }}
            />
          ) : null}
        </div>
      </div>

      <div className={cn('flex items-center justify-between px-3', compact ? 'py-1.5' : 'py-2')}>
        <div className="flex items-center gap-1">
          <button
            type="button"
            tabIndex={-1}
            aria-hidden
            className={cn(
              'button-glass-neutral flex cursor-default items-center justify-center rounded-full',
              iconBtn,
            )}
          >
            <Paperclip className={iconSz} />
          </button>

          <button
            type="button"
            tabIndex={-1}
            aria-hidden
            className={cn(
              'button-glass-neutral flex cursor-default items-center gap-1.5 rounded-full text-white',
              compact ? 'h-7 px-2' : 'h-8 px-2.5',
            )}
          >
            <FolderOpen className={`${iconSz} shrink-0`} />
            <span className="typo-caption max-w-[88px] truncate font-medium md:max-w-[100px]">
              {demoCampaignName}
            </span>
          </button>

          <button
            type="button"
            tabIndex={-1}
            aria-hidden
            className={cn(
              'button-glass-neutral flex cursor-default items-center justify-center rounded-full',
              iconBtn,
            )}
          >
            <Flag className={`${iconSz} text-amber-400`} />
          </button>
        </div>

        <div className="flex items-center gap-1">
          <span
            className={cn('text-color-muted tabular-nums', compact ? 'typo-caption' : 'body-4')}
          >
            {inputValue.length.toLocaleString()}/
            {MISSION_CAPTURE_TEXT_MAX_CHARS.toLocaleString()}
          </span>
          <button
            type="button"
            tabIndex={-1}
            aria-hidden
            className={cn(
              'button-glass-neutral flex cursor-default items-center justify-center rounded-full',
              iconBtn,
            )}
          >
            <Mic className={iconSz} />
          </button>
          <button
            type="button"
            tabIndex={-1}
            aria-hidden
            disabled={empty || phase === 'done'}
            className={cn(
              'button-glass-neutral flex cursor-default items-center justify-center rounded-full disabled:opacity-30',
              iconBtn,
            )}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
