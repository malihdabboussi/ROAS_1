import React from 'react';
import { useCurrentFrame } from 'remotion';
import { revealByChar, revealByWord } from '../lib/reveal-text';

export const TypeReveal: React.FC<{
  text: string;
  mode: 'char' | 'word';
  startFrame?: number;
  /** Frames per revealed character (char mode) or per word (word mode). */
  pace: number;
  className?: string;
  style?: React.CSSProperties;
}> = ({ text, mode, startFrame = 0, pace, className, style }) => {
  const frame = useCurrentFrame();
  const shown =
    mode === 'char'
      ? revealByChar(text, frame, startFrame, pace)
      : revealByWord(text, frame, startFrame, pace);
  return (
    <span className={className} style={style}>
      {shown}
    </span>
  );
};
