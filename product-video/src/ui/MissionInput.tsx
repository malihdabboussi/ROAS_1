import React from 'react';
import { Paperclip, FolderOpen, Flag, Mic } from 'lucide-react';
import {
  MISSION_CAPTURE_TEXT_MAX_CHARS,
  QUICK_CAPTURE_PLACEHOLDER,
} from '../mission-constants';

/**
 * Static / presentational slice of apps/web/.../MissionQuickCapture.tsx
 * (idle footer, no dropdowns, no cloud, no recording).
 */
export const MissionInput: React.FC<{
  typedText: string;
  caretVisible?: boolean;
  campaignLabel?: string;
}> = ({ typedText, caretVisible = false, campaignLabel = 'Coaching' }) => {
  const empty = typedText.length === 0;
  const inputValue = typedText;

  return (
    <section className="dark">
      <div className="input-glass rounded-spacing-3 relative flex flex-col">
        <div className="flex-1 px-4 pt-3">
          <div
            className={`body-2 caret-accent max-h-[200px] min-h-[60px] w-full resize-none bg-transparent focus:outline-none whitespace-pre-wrap break-words ${
              empty ? 'text-muted-foreground' : 'text-foreground'
            }`}
          >
            {empty ? QUICK_CAPTURE_PLACEHOLDER : inputValue}
            {caretVisible && !empty && (
              <span
                style={{
                  marginLeft: 2,
                  display: 'inline-block',
                  height: '1.2em',
                  width: 2,
                  verticalAlign: 'text-bottom',
                  background: 'rgb(16, 185, 129)',
                }}
                aria-hidden
              />
            )}
          </div>
        </div>

        <div className="flex items-center justify-between px-3 py-2">
          <div className="flex items-center gap-1">
            <button
              type="button"
              className="button-glass-neutral flex h-8 w-8 items-center justify-center rounded-full"
              aria-label="Attach files"
            >
              <Paperclip className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              className="button-glass-neutral text-primary flex h-8 items-center gap-1.5 rounded-full px-2.5"
              aria-label="Campaign"
            >
              <FolderOpen className="h-3.5 w-3.5" />
              <span className="typo-caption max-w-[100px] truncate font-medium">{campaignLabel}</span>
            </button>
            <button
              type="button"
              className="button-glass-neutral flex h-8 w-8 items-center justify-center rounded-full"
              aria-label="Priority"
            >
              <Flag className="h-3.5 w-3.5 text-amber-400" />
            </button>
          </div>

          <div className="flex items-center gap-1">
            <span className="body-4 text-muted-foreground tabular-nums">
              {inputValue.length.toLocaleString()}/{MISSION_CAPTURE_TEXT_MAX_CHARS.toLocaleString()}
            </span>
            <button
              type="button"
              className="button-glass-neutral flex h-8 w-8 items-center justify-center rounded-full"
              aria-label="Voice input"
            >
              <Mic className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              className="button-glass-neutral flex h-8 w-8 items-center justify-center rounded-full disabled:opacity-30"
              aria-label="Send mission"
              disabled={!inputValue.trim()}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
