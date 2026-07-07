import React from 'react';
import { V } from '../theme';
import { Clock, CheckCircle2, Circle, ChevronDown } from 'lucide-react';
import { revealByChar } from '../lib/reveal-text';

export type SubtaskStatus = 'pending' | 'in_progress' | 'done';

/**
 * 1:1 replica of apps/web/.../SubtasksSection.tsx row:
 *   px-2.5 py-1.5 gap-2 rounded-lg
 *   status icon h-3.5 w-3.5 (14px) — Clock amber / CheckCircle2 emerald / Circle muted
 *   title body-2
 *   assignee pill rounded-full bg-secondary px-1.5 py-0.5 body-3
 *   separator: border-b rgba(255,255,255,0.1)
 */
export const SubtaskRow: React.FC<{
  title: string;
  status: SubtaskStatus;
  assignee: string;
  expanded?: boolean;
  /** When set, title types in from this frame (char-by-char). */
  titleTypingFrame?: number;
  titleFramesPerChar?: number;
}> = ({
  title,
  status,
  assignee,
  expanded = false,
  titleTypingFrame,
  titleFramesPerChar = 2,
}) => {
  const { Icon, color } = statusMeta(status);
  const displayTitle =
    titleTypingFrame !== undefined
      ? revealByChar(title, titleTypingFrame, 0, titleFramesPerChar)
      : title;
  return (
    <div style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
      <div
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          borderRadius: 8,
          padding: '6px 10px',
          background: expanded ? 'rgba(16,185,129,0.1)' : 'transparent',
        }}
      >
        <Icon size={14} color={color} style={{ flexShrink: 0 }} />
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            minWidth: 0,
            flex: 1,
            color: V.dark.foreground,
            fontSize: V.text.body2, // body-2 15px
            fontFamily: V.font.body,
            textAlign: 'left',
          }}
        >
          <span
            style={{
              minWidth: 0,
              flex: 1,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {displayTitle}
          </span>
          <ChevronDown
            size={12}
            color="rgba(163,163,163,0.5)"
            style={{
              flexShrink: 0,
              transform: expanded ? 'rotate(180deg)' : 'none',
            }}
          />
        </div>
        {/* Assignee pill: rounded-full bg-secondary px-1.5 py-0.5 body-3 */}
        <div
          style={{
            flexShrink: 0,
            borderRadius: V.radius.full,
            background: V.dark.secondary,
            color: V.dark.mutedFg,
            padding: '2px 6px',
            fontSize: V.text.md, // body-3 14px
            fontFamily: V.font.body,
          }}
        >
          {assignee}
        </div>
      </div>
    </div>
  );
};

function statusMeta(status: SubtaskStatus): { Icon: typeof Clock; color: string } {
  switch (status) {
    case 'done':
      return { Icon: CheckCircle2, color: '#34D399' }; // text-emerald-400
    case 'in_progress':
      return { Icon: Clock, color: '#FBBF24' }; // text-amber-400
    case 'pending':
      return { Icon: Circle, color: 'rgba(163,163,163,0.4)' };
  }
}
