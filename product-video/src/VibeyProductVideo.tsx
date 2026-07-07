import React from 'react';
import { AbsoluteFill, Series } from 'remotion';
import { SCENE } from './theme';
import { SceneHook } from './scenes/SceneHook';
import { SceneProblem } from './scenes/SceneProblem';
import { SceneTeam } from './scenes/SceneTeam';
import { SceneMission } from './scenes/SceneMission';
import { SceneShip } from './scenes/SceneShip';
import { SceneAutopilot } from './scenes/SceneAutopilot';
import { SceneClose } from './scenes/SceneClose';

/**
 * Vibey Product Video — 35s / 1050 frames / 1080x1920 / 30 fps.
 * Silent (no VO); text + visuals + music bed only.
 * Hard cuts between scenes (viral scroll-stopping pattern).
 */
export const VibeyProductVideo: React.FC = () => {
  return (
    <AbsoluteFill className="dark" style={{ background: '#0A0A0A' }}>
      <Series>
        <Series.Sequence durationInFrames={SCENE.hook}>
          <SceneHook />
        </Series.Sequence>
        <Series.Sequence durationInFrames={SCENE.problem}>
          <SceneProblem />
        </Series.Sequence>
        <Series.Sequence durationInFrames={SCENE.team}>
          <SceneTeam />
        </Series.Sequence>
        <Series.Sequence durationInFrames={SCENE.mission}>
          <SceneMission />
        </Series.Sequence>
        <Series.Sequence durationInFrames={SCENE.ship}>
          <SceneShip />
        </Series.Sequence>
        <Series.Sequence durationInFrames={SCENE.autopilot}>
          <SceneAutopilot />
        </Series.Sequence>
        <Series.Sequence durationInFrames={SCENE.close}>
          <SceneClose />
        </Series.Sequence>
      </Series>
    </AbsoluteFill>
  );
};
