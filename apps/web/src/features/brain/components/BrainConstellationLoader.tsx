import {
  BRAIN_CONSTELLATION_LINKS,
  BRAIN_CONSTELLATION_NODES,
  BRAIN_CONSTELLATION_VIEWBOX,
} from './brain-constellation-layout'

interface BrainConstellationLoaderProps {
  text?: string
}

/**
 * Pure-SVG stand-in for the force graph: no images, no canvas, no animation
 * loop, so it paints on the first frame while the real graph loads.
 */
export function BrainConstellationLoader({
  text = 'Loading Brain…',
}: BrainConstellationLoaderProps) {
  return (
    <div className="gap-spacing-4 flex h-full flex-col items-center justify-center">
      <svg
        className="brain-loader"
        viewBox={`0 0 ${BRAIN_CONSTELLATION_VIEWBOX} ${BRAIN_CONSTELLATION_VIEWBOX}`}
        role="img"
        aria-label={text}
      >
        <g className="brain-loader-rotor">
          {BRAIN_CONSTELLATION_LINKS.map((link) => (
            <line
              key={`${link.x1}-${link.y1}-${link.x2}-${link.y2}`}
              className="brain-loader-link"
              x1={link.x1}
              y1={link.y1}
              x2={link.x2}
              y2={link.y2}
            />
          ))}
          {BRAIN_CONSTELLATION_NODES.map((node) => (
            <circle
              key={`${node.x}-${node.y}-${node.r}`}
              className={`brain-loader-node brain-loader-node-${node.tone} brain-loader-delay-${node.delayStep}`}
              cx={node.x}
              cy={node.y}
              r={node.r}
            />
          ))}
        </g>
      </svg>
      <p className="body-2 text-shimmer-gradient">{text}</p>
    </div>
  )
}
