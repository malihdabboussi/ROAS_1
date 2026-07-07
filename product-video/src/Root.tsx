import './index.css';
import { Composition } from 'remotion';
import { VibeyProductVideo } from './VibeyProductVideo';
import { VIDEO } from './theme';

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="VibeyProductVideo"
        component={VibeyProductVideo}
        durationInFrames={VIDEO.durationInFrames}
        fps={VIDEO.fps}
        width={VIDEO.width}
        height={VIDEO.height}
      />
    </>
  );
};
