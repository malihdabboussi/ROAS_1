export const executiveHeroLayers = [
  {
    id: 'brain',
    label: 'Brain',
    word: 'memory',
    caption: 'Your company’s long-term memory. Every call, document, and decision becomes structured knowledge your agents can actually use, and it keeps organizing itself as it grows.',
    captionClass: 'executive-brief-hero-caption-tr',
    nodeClass: 'executive-brief-hero-node-top',
    connectorPath: 'M 575 160 L 612 160 L 686 96 L 724 96',
  },
  {
    id: 'agents',
    label: 'Agents',
    word: 'execution',
    caption: 'Specialist AI workers with their own roles, skills, and tools. They pull context from the Brain, do the work, and hand it to your team to review and approve.',
    captionClass: 'executive-brief-hero-caption-br',
    nodeClass: 'executive-brief-hero-node-right',
    connectorPath: 'M 660 338 L 660 374 L 736 450 L 776 450',
  },
  {
    id: 'spaces',
    label: 'Spaces',
    word: 'collaboration',
    caption: 'Shared workspaces where people and agents work side by side. Tasks, documents, and deliverables in one place, visible as the work moves.',
    captionClass: 'executive-brief-hero-caption-bl',
    nodeClass: 'executive-brief-hero-node-bottom',
    connectorPath: 'M 425 440 L 388 440 L 314 510 L 276 510',
  },
  {
    id: 'workflows',
    label: 'Workflows',
    word: 'automation',
    caption: 'Triggers that route work to the right agent, produce the output, and update the workspace, turning recurring processes into automatic flows.',
    captionClass: 'executive-brief-hero-caption-tl',
    nodeClass: 'executive-brief-hero-node-left',
    connectorPath: 'M 340 262 L 340 226 L 266 152 L 226 152',
  },
] as const

// Short arrowed arcs ending at the diagonal midpoints (NE, SE, SW, NW) between
// the cards, so the arrowheads always sit clear of the node boxes.
const ringArrowArcs = [
  'M576.2 182.6 A140 140 0 0 1 599 201',
  'M617.4 376.3 A140 140 0 0 1 599 399',
  'M423.7 417.4 A140 140 0 0 1 401 399',
  'M382.7 223.7 A140 140 0 0 1 401 201',
]

export function ExecutiveBriefHeroDiagram() {
  return (
    <div className="executive-brief-hero-diagram">
      <div className="executive-brief-hero-stage">
      <svg className="executive-brief-hero-canvas" viewBox="0 0 1000 600" fill="none" aria-hidden>
        <defs>
          <marker
            id="ebLoopArrow"
            viewBox="0 0 10 10"
            refX="7"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto"
          >
            <path d="M0 0 L10 5 L0 10 z" className="executive-brief-loop-arrowhead" />
          </marker>
        </defs>

        <circle className="executive-brief-loop-track" cx="500" cy="300" r="140" />
        {ringArrowArcs.map((d) => (
          <path key={d} className="executive-brief-loop-track" d={d} markerEnd="url(#ebLoopArrow)" />
        ))}

        {executiveHeroLayers.map((layer) => (
          <path key={layer.id} className="executive-brief-hero-connector" d={layer.connectorPath} />
        ))}
      </svg>

      <p className="executive-brief-loop-center body-3 text-text-muted">
        Every loop makes
        <br />
        the next one better
      </p>

      {executiveHeroLayers.map((layer) => (
        <div key={layer.id} className={`executive-brief-hero-node ${layer.nodeClass}`}>
          <span className="executive-brief-stack-badge">{layer.label}</span>
          <span className="body-3 text-foreground mt-2">{layer.word}</span>
        </div>
      ))}

      {executiveHeroLayers.map((layer) => (
        <p
          key={`${layer.id}-caption`}
          className={`executive-brief-hero-caption body-3 text-text-muted ${layer.captionClass}`}
        >
          {layer.caption}
        </p>
      ))}
      </div>

      <div className="executive-brief-hero-mobile">
        {executiveHeroLayers.map((layer) => (
          <div key={`${layer.id}-mobile`} className="executive-brief-hero-mobile-item">
            <span className="executive-brief-stack-badge">{layer.label}</span>
            <p className="body-3 text-text-muted mt-2 leading-relaxed">{layer.caption}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
