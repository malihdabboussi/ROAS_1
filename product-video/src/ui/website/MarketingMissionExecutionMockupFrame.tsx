import React from 'react';
import { Img, useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { FeatureFloatingMockShell } from './FeatureFloatingMockShell';
import { MissionDeliverablePdfMockup } from './MissionDeliverablePdfMockup';
import { MissionQuickCaptureChrome } from './MissionQuickCaptureChrome';

/** Frame-driven port of
 *  `apps/website/src/components/marketing/MarketingMissionExecutionMockup.tsx`.
 *  All timing is computed from `useCurrentFrame()` instead of setTimeout cycles,
 *  so playback is deterministic in Remotion. DOM + tokens are preserved. */

export const MISSION_MARKETING_DEMO_BRIEF =
  'Create a 3-part nurture sequence for our Q2 SaaS launch. Focus on conversion and maintaining our brand voice.';

const SUBTASK_META = [
  { id: '1', title: 'Research & Planning', desc: 'Analyzing brief and workspace context' },
  { id: '2', title: 'Content Drafting', desc: 'Generating 3-part nurture sequence' },
  { id: '3', title: 'Quality Assurance', desc: 'Reviewing alignment with brand voice' },
];

const BRIEF_CHAR_FRAMES = 1;
const BRIEF_HOLD = 18;
const PLANNING_FRAMES = 36;
const SUBTASK_APPEAR_FRAMES = 28;
const SUBTASK_COMPLETE_FRAMES = 22;
const DONE_HOLD = 120;

const BRIEF_TYPE_END = MISSION_MARKETING_DEMO_BRIEF.length * BRIEF_CHAR_FRAMES;
const PLANNING_END = BRIEF_TYPE_END + BRIEF_HOLD + PLANNING_FRAMES;
const SUBTASK_STRIDE = SUBTASK_APPEAR_FRAMES + SUBTASK_COMPLETE_FRAMES;
const EXECUTION_END = PLANNING_END + SUBTASK_META.length * SUBTASK_STRIDE;

export const MISSION_EXECUTION_DURATION = EXECUTION_END + DONE_HOLD;

type Phase = 'brief' | 'planning' | 'execution' | 'done';

function computeState(frame: number): {
  phase: Phase;
  briefText: string;
  isCEOPlanning: boolean;
  visibleSubtasks: number;
  completedIds: string[];
  caretVisible: boolean;
} {
  const briefChars = Math.min(
    MISSION_MARKETING_DEMO_BRIEF.length,
    Math.max(0, Math.floor(frame / BRIEF_CHAR_FRAMES)),
  );
  const briefText = MISSION_MARKETING_DEMO_BRIEF.slice(0, briefChars);

  if (frame < BRIEF_TYPE_END + BRIEF_HOLD) {
    return {
      phase: 'brief',
      briefText,
      isCEOPlanning: false,
      visibleSubtasks: 0,
      completedIds: [],
      caretVisible: Math.floor(frame / 8) % 2 === 0,
    };
  }

  if (frame < PLANNING_END) {
    return {
      phase: 'planning',
      briefText: MISSION_MARKETING_DEMO_BRIEF,
      isCEOPlanning: true,
      visibleSubtasks: 0,
      completedIds: [],
      caretVisible: false,
    };
  }

  if (frame < EXECUTION_END) {
    const execFrame = frame - PLANNING_END;
    const visibleSubtasks = Math.min(
      SUBTASK_META.length,
      Math.floor(execFrame / SUBTASK_STRIDE) + 1,
    );
    const completedIds: string[] = [];
    for (let i = 0; i < SUBTASK_META.length; i++) {
      const completeAt = i * SUBTASK_STRIDE + SUBTASK_APPEAR_FRAMES;
      if (execFrame >= completeAt) {
        const meta = SUBTASK_META[i];
        if (meta) completedIds.push(meta.id);
      }
    }
    return {
      phase: 'execution',
      briefText: MISSION_MARKETING_DEMO_BRIEF,
      isCEOPlanning: false,
      visibleSubtasks,
      completedIds,
      caretVisible: false,
    };
  }

  return {
    phase: 'done',
    briefText: MISSION_MARKETING_DEMO_BRIEF,
    isCEOPlanning: false,
    visibleSubtasks: SUBTASK_META.length,
    completedIds: SUBTASK_META.map((s) => s.id),
    caretVisible: false,
  };
}

export const MarketingMissionExecutionMockupFrame: React.FC<{
  portraits: string[];
  vibeyPortraitUrl: string;
  /** Offset this child's frame if the mockup is nested in a `Sequence`. */
  frameOffset?: number;
}> = ({ portraits, vibeyPortraitUrl, frameOffset = 0 }) => {
  const frame = useCurrentFrame() - frameOffset;
  const { fps } = useVideoConfig();
  const state = computeState(frame);

  const planningPulse = frame - (BRIEF_TYPE_END + BRIEF_HOLD);
  const planningOpacity = state.isCEOPlanning
    ? interpolate(planningPulse, [0, 8], [0, 1], { extrapolateRight: 'clamp' })
    : 0;
  const planningScale = state.isCEOPlanning
    ? interpolate(planningPulse, [0, 12], [0.95, 1], { extrapolateRight: 'clamp' })
    : 0.95;
  const planningRotate = frame * 2; // deg

  const deliverableFrame = frame - EXECUTION_END;
  const deliverableOpacity =
    state.phase === 'done'
      ? interpolate(deliverableFrame, [0, 12], [0, 1], { extrapolateRight: 'clamp' })
      : 0;
  const deliverableY =
    state.phase === 'done'
      ? interpolate(deliverableFrame, [0, 12], [10, 0], { extrapolateRight: 'clamp' })
      : 10;

  return (
    <FeatureFloatingMockShell className="compare-hero-card-shell--auto-height !min-h-[480px] h-full min-h-0 w-full flex-1 flex-col">
      <div className="relative z-[1] flex h-full min-h-0 w-full flex-col">
        <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-4 pt-6">
          <div className="flex w-full flex-col gap-4">
            {state.isCEOPlanning ? (
              <div
                className="flex items-center gap-3 rounded-xl border border-purple-500/20 bg-purple-500/5 p-4"
                style={{
                  opacity: planningOpacity,
                  transform: `scale(${planningScale})`,
                }}
              >
                <div className="relative">
                  <div className="border-color-glass h-10 w-10 shrink-0 overflow-hidden rounded-full border">
                    <Img src={vibeyPortraitUrl} alt="" className="h-full w-full object-cover" />
                  </div>
                  <div
                    className="pointer-events-none absolute -inset-1 rounded-full border border-dashed border-purple-500/30"
                    style={{ transform: `rotate(${planningRotate}deg)` }}
                  />
                </div>
                <div>
                  <p className="text-[11px] font-bold text-white/90">Vibey CEO is planning...</p>
                  <p className="text-[10px] text-white/40">
                    Breaking brief into specialized subtasks
                  </p>
                </div>
              </div>
            ) : null}

            {state.phase === 'done' ? (
              <div
                style={{
                  opacity: deliverableOpacity,
                  transform: `translateY(${deliverableY}px)`,
                }}
              >
                <MissionDeliverablePdfMockup label="Q2_Nurture_Sequence.pdf" />
              </div>
            ) : state.visibleSubtasks > 0 ? (
              <div className="space-y-3">
                {SUBTASK_META.slice(0, state.visibleSubtasks).map((task, i) => {
                  const isCompleted = state.completedIds.includes(task.id);
                  const isWorking = !isCompleted && i === state.visibleSubtasks - 1;
                  const portraitUrl = portraits[i] ?? portraits[0];
                  const subtaskFrame = frame - (PLANNING_END + i * SUBTASK_STRIDE);
                  const appear = spring({
                    frame: Math.max(0, subtaskFrame),
                    fps,
                    config: { damping: 20, stiffness: 200, mass: 0.5 },
                  });
                  const opacity = interpolate(appear, [0, 1], [0, 1]);
                  const y = interpolate(appear, [0, 1], [20, 0]);

                  const shimmerFrame = frame;
                  const shimmerX = isWorking
                    ? `${((shimmerFrame * 2.2) % 200) - 100}%`
                    : '-100%';

                  return (
                    <div
                      key={task.id}
                      className={`glass-card relative overflow-hidden rounded-xl border p-4 ${
                        isWorking
                          ? 'border-white/20 bg-white/[0.05]'
                          : 'border-white/5 bg-white/[0.02]'
                      }`}
                      style={{
                        opacity,
                        transform: `translateY(${y}px)`,
                      }}
                    >
                      <div className="flex items-center gap-4">
                        <div className="relative shrink-0">
                          <div
                            className={`border-color-glass h-10 w-10 overflow-hidden rounded-lg border ${
                              isCompleted
                                ? 'border-emerald-500/40 ring-1 ring-emerald-500/25'
                                : isWorking
                                  ? 'border-white/25'
                                  : 'border-white/10'
                            }`}
                          >
                            {portraitUrl ? (
                              <Img
                                src={portraitUrl}
                                alt=""
                                className={`h-full w-full object-cover ${
                                  isCompleted ? 'opacity-50' : 'opacity-100'
                                }`}
                              />
                            ) : null}
                          </div>
                          {isCompleted ? (
                            <div className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-[#0a0a0a] bg-emerald-500/90 text-white shadow-sm">
                              <CheckCircle2 className="h-3 w-3" strokeWidth={2.5} />
                            </div>
                          ) : null}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <span
                              className={`text-[12px] font-bold ${
                                isCompleted ? 'text-white/40' : 'text-white/90'
                              }`}
                            >
                              {task.title}
                            </span>
                            {isWorking ? (
                              <span className="flex shrink-0 items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-emerald-400">
                                <Loader2
                                  size={10}
                                  style={{ transform: `rotate(${frame * 12}deg)` }}
                                />
                                Working
                              </span>
                            ) : null}
                          </div>
                          <p
                            className={`text-[10px] ${
                              isCompleted ? 'text-white/20' : 'text-white/40'
                            }`}
                          >
                            {task.desc}
                          </p>
                        </div>
                      </div>
                      {isWorking ? (
                        <div
                          className="absolute bottom-0 left-0 h-0.5 w-full bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent"
                          style={{ transform: `translateX(${shimmerX})` }}
                        />
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ) : null}
          </div>
        </div>

        <div className="shrink-0 px-6 pb-6 pt-2">
          <MissionQuickCaptureChrome
            briefText={state.briefText}
            phase={state.phase}
            caretVisible={state.caretVisible}
          />
        </div>
      </div>
    </FeatureFloatingMockShell>
  );
};
