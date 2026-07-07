import { Img, staticFile } from 'remotion';
import React from 'react';

type Variant = 'icon-white' | 'icon-black' | 'wordmark-white' | 'wordmark-black';

const SRC: Record<Variant, string> = {
  'icon-white': 'Logos/logov2/icon-white.png',
  'icon-black': 'Logos/logov2/icon-black.png',
  'wordmark-white': 'Logos/logov2/icon-text-white-moregap.png',
  'wordmark-black': 'Logos/logov2/icon-text-black-moregap.png',
};

export const VibeyLogo: React.FC<{
  variant?: Variant;
  height?: number;
  style?: React.CSSProperties;
}> = ({ variant = 'wordmark-white', height = 80, style }) => {
  return (
    <Img
      src={staticFile(SRC[variant])}
      style={{ height, width: 'auto', ...style }}
    />
  );
};
