export const COMPARE_SLUGS = ['vs-chatgpt', 'vs-manus', 'vs-clickfunnels'] as const

export type CompareSlug = (typeof COMPARE_SLUGS)[number]

export type CompareDifferentiationIcon =
  | 'layers'
  | 'brain'
  | 'rocket'
  | 'users'
  | 'target'
  | 'layout-template'
  | 'workflow'
  | 'message-square'
  | 'link2'
  | 'wand2'

export type CompareDifferentiationCard = {
  icon: CompareDifferentiationIcon
  title: string
  /** Three lines of body copy (line breaks only, not paragraphs), then space + emerald punchline. */
  bodyLines: [string, string, string]
  punchline: string
}

export type CompareDifferentiation = {
  /** Two thesis lines, each shown in its own card above the grid. */
  headlineCards: [string, string]
  subhead: string
  cards: CompareDifferentiationCard[]
}

/** Must match `FeatureMockupKind` in feature mockups (studio, funnels, …). */
export type CompareShowcaseVisual =
  | 'studio'
  | 'funnels'
  | 'brain'
  | 'team'
  | 'ads'
  | 'integrations'
  | 'enterprise-hq'

export type CompareShowcaseRow = {
  title: string
  body: string
  visual: CompareShowcaseVisual
}

export type CompareShowcase = {
  sectionTitle: string
  sectionSubtitle: string
  rows: CompareShowcaseRow[]
}

export type ComparePageDefinition = {
  slug: CompareSlug
  metaTitle: string
  metaDescription: string
  kicker: string
  title: string
  subtitle: string
  bullets: string[]
  matrix: {
    rows: { capability: string; vibey: string; them: string }[]
  }
  whenToUse: {
    vibey: { title: string; points: string[]; summary: string }
    them: { title: string; points: string[]; summary: string }
  }
  differentiation: CompareDifferentiation
  showcase: CompareShowcase
  closingCta: { headline: string; subhead: string }
}

export const COMPARE_PAGES: Record<CompareSlug, ComparePageDefinition> = {
  'vs-chatgpt': {
    slug: 'vs-chatgpt',
    metaTitle: 'ROAS vs. ChatGPT | ROAS',
    metaDescription:
      'ChatGPT answers prompts. ROAS runs marketing missions with artifacts, memory, and publish paths.',
    kicker: 'ROAS vs. ChatGPT',
    title: 'ROAS VS. CHATGPT',
    subtitle:
      'Use ChatGPT for research. Use ROAS when you need landing pages, sequences, and campaigns that ship from one conversation.',
    bullets: [
      'Artifact-first workspace, not a scroll of text',
      'The Workspace Brain carries voice, ICP, and learnings forward',
      'Publish funnels without leaving the thread',
    ],
    matrix: {
      rows: [
        {
          capability: 'Core job',
          vibey:
            'Runs guided marketing missions: funnels, sequences, offers, and launch assets, so work lands as shippable systems, not only back-and-forth chat.',
          them: 'General-purpose reasoning and dialogue: exceptional for open-ended questions, analysis, and brainstorming without a dedicated GTM workspace.',
        },
        {
          capability: 'Outputs & deliverables',
          vibey:
            'Structured artifacts: landing pages, nurture emails, PDFs, ad drafts, and previews you iterate inside the product before handoff.',
          them: 'Primarily unstructured text in a thread. Formatting, hosting, and assembly in other tools are on you.',
        },
        {
          capability: 'Context & memory',
          vibey:
            'The Workspace Brain persists brand voice, ICP, positioning, and constraints so the next page or email starts aligned, not from zero.',
          them: 'Conversation-scoped context unless you repeat or summarize; not built as a long-lived marketing memory layer.',
        },
        {
          capability: 'Path to live',
          vibey:
            'Preview, refine, then publish with hosted funnels and domain mapping when you are ready, without rebuilding elsewhere.',
          them: 'No native funnel host or domain story; you copy outputs into your stack and wire publishing yourself.',
        },
        {
          capability: 'How teams work',
          vibey:
            'Multi-agent missions and shared workspace patterns aimed at growth and marketing execution across handoffs.',
          them: 'A single assistant persona per chat, powerful, but not structured as a marketing org operating model.',
        },
        {
          capability: 'Research & depth',
          vibey:
            'Research in service of a deliverable, positioning, copy, and structure that land in artifacts you can publish.',
          them: 'Deep open-ended reasoning, synthesis, and exploration without a built-in path to hosted marketing output.',
        },
        {
          capability: 'Brand consistency',
          vibey:
            'The Workspace Brain and org policies push voice, constraints, and ICP context into the next page or sequence.',
          them: 'Consistency depends on what you restate each session; no first-class marketing memory graph.',
        },
        {
          capability: 'Hosting & domains',
          vibey:
            'Funnel hosting and domain mapping are part of the product story when you are ready to go live.',
          them: 'No native funnel host; you export ideas and wire infrastructure elsewhere.',
        },
        {
          capability: 'Speed for GTM teams',
          vibey:
            'Minutes from brief to draft funnel plus parallel paths for email, creative, and handoff.',
          them: 'Fast answers in chat; time-to-live pages still depends on your downstream stack and manual assembly.',
        },
      ],
    },
    whenToUse: {
      them: {
        title: 'Use ChatGPT when you need',
        points: [
          'Fast answers, reasoning, and tight explanations without a marketing workspace',
          'Brainstorming, ideation, and learning something new in conversation',
          'Drafts and outlines you will reshape in other tools',
          'Open-ended research where the output is insight, not a hosted asset',
          'Everyday assistant-style help that stays in the thread',
        ],
        summary:
          'ChatGPT excels at speed, breadth, and accessibility for general thinking, not at shipping your funnel.',
      },
      vibey: {
        title: 'Use ROAS when you need',
        points: [
          'Landing pages, emails, PDFs, and ads as structured artifacts, not only text',
          'One place for strategy, copy, preview, and handoff across a campaign',
          'The Workspace Brain so voice, ICP, and constraints carry to the next build',
          'A path from conversation to hosted funnels and mapped domains',
          'Multi-agent workflows tuned to how growth teams actually execute',
        ],
        summary:
          'ROAS excels at depth, completeness, and execution when revenue work has to ship, not just be discussed.',
      },
    },
    differentiation: {
      headlineCards: ['Most AI answers in text.', 'ROAS answers with campaigns you can ship.'],
      subhead: 'What makes ROAS different',
      cards: [
        {
          icon: 'layers',
          title: 'Artifact workspace vs. chat transcript',
          bodyLines: [
            'ChatGPT: answers live in chat; you copy and rebuild elsewhere.',
            'Shipping means format, paste, and wire hosting yourself.',
            'ROAS: pages, emails, PDFs, drafts inside one workspace.',
          ],
          punchline: 'Less “wall of text.” More ready-to-ship GTM work.',
        },
        {
          icon: 'brain',
          title: 'The Workspace Brain vs. chat-scoped context',
          bodyLines: [
            'Chats drop context unless you repeat voice, offer, and ICP.',
            'The Workspace Brain keeps positioning and constraints across sessions.',
            'Your next funnel and email reuse that same layer.',
          ],
          punchline: 'Your brand and offer stay attached to the work, not just the thread.',
        },
        {
          icon: 'rocket',
          title: 'Path to publish vs. paste-it-yourself assembly',
          bodyLines: [
            'ChatGPT won’t host your funnel or map your domain.',
            'ROAS links chat to preview and publish in the product.',
            'Built for live pages-not only prose in a sidebar.',
          ],
          punchline: 'From conversation toward hosted pages, not only copy blocks.',
        },
        {
          icon: 'users',
          title: 'Multi-agent missions vs. one assistant persona',
          bodyLines: [
            'One assistant thread can do a lot with one model.',
            'GTM still spans copy, layout, sequencing, and handoffs.',
            'ROAS runs multi-agent missions tuned for marketing execution.',
          ],
          punchline: 'Built like a small team, not a single chatbot.',
        },
      ],
    },
    showcase: {
      sectionTitle: 'What ROAS does better',
      sectionSubtitle:
        'ROAS goes beyond long chat threads through artifact-first design, pages, sequences, and memory that persist for your next launch.',
      rows: [
        {
          title: 'Ship landing pages, emails, and PDFs from one thread',
          body: 'Describe the offer once. ROAS structures work as real marketing artifacts with preview and iteration, not only paragraphs you copy into other tools.',
          visual: 'studio',
        },
        {
          title: 'Brand and ICP that carry forward',
          body: 'Stop re-explaining voice and positioning every session. The Workspace Brain keeps what matters on record so the next funnel and nurture stay on-brand.',
          visual: 'brain',
        },
        {
          title: 'See the funnel before you publish',
          body: 'Iterate layout and copy in-product, then connect hosted pages and domains when the system is ready, without rebuilding the story in another tool.',
          visual: 'funnels',
        },
        {
          title: 'One workspace for growth, founder, and agency handoffs',
          body: 'Share campaigns, artifacts, and context so execution stays aligned when more than one person touches the launch.',
          visual: 'team',
        },
        {
          title: 'Ads that match the same offer narrative',
          body: 'Keep paid creative tied to the landing and email story so prospects see one coherent arc from click to conversion.',
          visual: 'ads',
        },
        {
          title: 'Plays nicely with your stack',
          body: 'Bring integrations and handoffs into the same mission so exports are not where the truth lives.',
          visual: 'integrations',
        },
      ],
    },
    closingCta: {
      headline: 'Do what ChatGPT can’t with ROAS',
      subhead:
        'Join marketers who moved from long threads to artifacts, memory, and funnels that actually ship.',
    },
  },
  'vs-manus': {
    slug: 'vs-manus',
    metaTitle: 'ROAS vs. Manus | ROAS',
    metaDescription:
      'Manus is a broad computer-use agent. ROAS is a marketing specialist with funnels, brain memory, and GTM artifacts.',
    kicker: 'ROAS vs. Manus',
    title: 'ROAS VS. MANUS',
    subtitle:
      'Both feel like “an AI that does the work.” ROAS narrows the scope to revenue teams: funnels, campaigns, and brand memory out of the box.',
    bullets: [
      'Opinionated marketing data model, not generic browser automation',
      'Funnel preview + publish native to the product',
      'HQ-ready workspaces for multi-team orgs',
    ],
    matrix: {
      rows: [
        {
          capability: 'What it optimizes for',
          vibey:
            'Revenue workflows: offers, funnels, campaigns, and creative assets with a marketing-native data model and preview.',
          them: 'Broad computer-use and task completion across sites and tools, excellent when the goal is not specifically GTM.',
        },
        {
          capability: 'What you get back',
          vibey:
            'Funnel-oriented artifacts with in-product preview and publish paths, not only exports from a generic environment.',
          them: 'Files, steps, or browser outcomes depending on the mission, less opinionated about landing pages, email, or launch structure.',
        },
        {
          capability: 'Guidance & positioning',
          vibey:
            'Campaign- and offer-aware defaults so messaging and structure map to how marketers ship.',
          them: 'User-directed goals only; no built-in marketing ontology unless you specify it every time.',
        },
        {
          capability: 'Memory model',
          vibey:
            'The Workspace Brain plus org-facing patterns: voice, constraints, and learnings meant to carry across campaigns.',
          them: 'Session or project context suited to the task tree at hand, not specialized for brand continuity across funnels.',
        },
        {
          capability: 'Best fit',
          vibey:
            'Growth teams, founders, and marketers who need pages, sequences, and launches in one specialist workspace.',
          them: 'Operators and knowledge workers who need a flexible agent for varied tasks outside a marketing spine.',
        },
        {
          capability: 'Task autonomy',
          vibey:
            'Autonomy inside a GTM playbook: missions resolve to pages, emails, and launches your team can run.',
          them: 'Broad autonomy across browsers and tools; outcomes are task-shaped, not funnel-shaped, unless you engineer it.',
        },
        {
          capability: 'Output polish',
          vibey:
            'Presentation-ready marketing assets with preview, hierarchy, and copy tuned for conversion.',
          them: 'Polish depends on the mission; you may still format and package outputs for stakeholders yourself.',
        },
        {
          capability: 'Repeatability',
          vibey:
            'Repeatable campaign scaffolding for presentations, webinars, paid + email, without rewriting the plan each time.',
          them: 'Repeatability is DIY: you re-spec goals and steps for every new mission.',
        },
        {
          capability: 'Where work lives',
          vibey:
            'Central marketing HQ with artifacts, memory, and permissions oriented around revenue teams.',
          them: 'Work scatters across sessions, files, and browser contexts tied to the project at hand.',
        },
      ],
    },
    whenToUse: {
      them: {
        title: 'Use Manus when you need',
        points: [
          'Tasks that hop across many web apps with no marketing spine',
          'General computer-use missions you steer step by step',
          'Arbitrary automation where packaging as a funnel is not the goal',
          'Exports, files, and sandbox outcomes from flexible agent runs',
          'Depth on ops and knowledge work outside a GTM playbook',
        ],
        summary:
          'Manus excels at breadth, autonomy, and execution across the open web, not at a dedicated marketing workspace.',
      },
      vibey: {
        title: 'Use ROAS when you need',
        points: [
          'Funnels, launches, and nurture treated as first-class deliverables',
          'Preview, iterate, and publish inside a marketing-native product',
          'Brand, offer, and ICP memory that persists across campaigns',
          'HQ-ready collaboration for growth, founder, and marketing teams',
          'Repeatable plays for presentations, webinars, ads, and email, without reinventing the scaffold',
        ],
        summary:
          'ROAS excels at specialized GTM execution: systems that ship when revenue work is the job.',
      },
    },
    differentiation: {
      headlineCards: [
        'General agents automate tasks.',
        'ROAS automates how marketing gets built.',
      ],
      subhead: 'What makes ROAS different',
      cards: [
        {
          icon: 'target',
          title: 'GTM depth vs. open-ended computer use',
          bodyLines: [
            'Manus runs real tasks across the web and your tools.',
            'ROAS narrows to offers, funnels, campaigns, and assets.',
            'Marketing-native scope-not open-ended “do anything.”',
          ],
          punchline: 'Same AI era; different job description.',
        },
        {
          icon: 'layout-template',
          title: 'Funnel-native workspace vs. generic outputs',
          bodyLines: [
            'Broad agents: files, screenshots, or steps from the run.',
            'ROAS: preview, iterate, and publish funnels in one flow.',
            'You see the page and sequence-not only sandbox exports.',
          ],
          punchline: 'Optimized for launches, not for arbitrary browsing.',
        },
        {
          icon: 'brain',
          title: 'Marketing memory vs. project/session context',
          bodyLines: [
            'General agents: context for this mission only.',
            'The Workspace Brain: voice, ICP, positioning, constraints.',
            'Persists across funnels, email, and the next campaign.',
          ],
          punchline: 'Memory that matches how GTM teams actually work.',
        },
        {
          icon: 'workflow',
          title: 'Campaign plays vs. one-off missions',
          bodyLines: [
            'Flexible agent: new plan every time you aim it.',
            'ROAS bakes in plays for presentations, launches, and nurture.',
            'Less reinventing scaffolding on every run.',
          ],
          punchline: 'Less “define the mission.” More “run the play.”',
        },
      ],
    },
    showcase: {
      sectionTitle: 'What ROAS does better',
      sectionSubtitle:
        'Same agentic feel, scoped to revenue teams with funnels, campaigns, and org-ready workspaces instead of generic browser missions.',
      rows: [
        {
          title: 'Describe the campaign; get artifacts, not only steps',
          body: 'Studio-style missions return landing pages, sequences, and files you can preview, not only a log of actions taken in a browser.',
          visual: 'studio',
        },
        {
          title: 'Funnel preview and publish in the same product',
          body: 'Pair conversation with hosted funnel paths and domains when you are ready, without treating the page as an export.',
          visual: 'funnels',
        },
        {
          title: 'Marketing memory that survives the mission',
          body: 'Brain-layer context carries voice, ICP, and constraints into the next launch, not only the current task tree.',
          visual: 'brain',
        },
        {
          title: 'HQ-ready workspace for campaigns and agents',
          body: 'Run multi-agent missions and handoffs in one marketing-native hub built for org scale.',
          visual: 'enterprise-hq',
        },
        {
          title: 'Align paid, organic, and lifecycle messaging',
          body: 'Keep creative direction consistent when ads, pages, and email are part of the same workspace.',
          visual: 'ads',
        },
        {
          title: 'Integrations without losing the thread',
          body: 'Hand off to your stack while the narrative of the campaign stays attached in ROAS.',
          visual: 'integrations',
        },
      ],
    },
    closingCta: {
      headline: 'Do what open-web agents don’t specialize in with ROAS',
      subhead: 'Join growth teams who picked a marketing workspace over generic task automation.',
    },
  },
  'vs-clickfunnels': {
    slug: 'vs-clickfunnels',
    metaTitle: 'ROAS vs. ClickFunnels | ROAS',
    metaDescription:
      'ClickFunnels centers drag-and-drop pages. ROAS centers conversation, AI layout, and instant iteration.',
    kicker: 'ROAS vs. ClickFunnels',
    title: 'ROAS VS. CLICKFUNNELS',
    subtitle:
      'Classic builders excel when you enjoy tweaking sections. ROAS excels when you want to describe the funnel and get a live page immediately.',
    bullets: [
      'No grid lock: revise structure by talking',
      'Same thread handles copy, design, and downstream emails',
      'AI-generated layout with code-backed preview',
    ],
    matrix: {
      rows: [
        {
          capability: 'How you build',
          vibey:
            'Describe audience, offer, and outcome; iterate structure and copy in language with a live preview, not only the section list.',
          them: 'Drag-and-drop canvas and components: powerful when you like hands-on layout and already know the funnel shape.',
        },
        {
          capability: 'Time to first page',
          vibey:
            'Minutes from intent to a draft you can refine in-thread, with AI-proposed hierarchy and messaging.',
          them: 'Depends on template choice, styling, and manual assembly before the page feels “yours.”',
        },
        {
          capability: 'Iteration loop',
          vibey:
            'Natural-language edits across copy and structure without hunting every widget setting.',
          them: 'Manual edits per block, style, and breakpoint: fast for experts, slower when you want rapid rewrites.',
        },
        {
          capability: 'Pages + nurture together',
          vibey:
            'Landing and lifecycle content stay in one connected workspace so messaging does not drift across tabs.',
          them: 'Email and pages may live in separate flows or products; alignment is mostly operational discipline.',
        },
        {
          capability: 'Who it rewards',
          vibey:
            'Marketers who think in offers and ICP and want AI to propose, then tighten, not only fill slots.',
          them: 'Teams trained on the editor who want pixel control and predictable component patterns.',
        },
        {
          capability: 'Starting point',
          vibey:
            'Starts from strategy language (offer, audience, outcome), then proposes structure you refine by talking.',
          them: 'Starts from canvas and components; strategy lives in your head or separate docs.',
        },
        {
          capability: 'Experimentation velocity',
          vibey:
            'Rewrite sections, reorder blocks, and test messaging in minutes inside the same thread.',
          them: 'Velocity tied to how fast you can manipulate the editor and duplicate pages manually.',
        },
        {
          capability: 'Analytics & iteration',
          vibey: 'Tie learnings back into the same mission so the next variant inherits context.',
          them: 'Analytics may live per product; reconnecting insight to copy often means manual updates.',
        },
        {
          capability: 'Onboarding curve',
          vibey:
            'Speak like a marketer; the system translates intent into layout proposals you steer.',
          them: 'Learn builder conventions, shortcuts, and template patterns before you feel fast.',
        },
      ],
    },
    whenToUse: {
      them: {
        title: 'Use ClickFunnels when you need',
        points: [
          'Pixel-level control in a drag-and-drop canvas you already know',
          'Teams trained on sections, styles, and marketplace templates',
          'Funnels you assemble by hand with predictable components',
          'Landing and email workflows that are fine living in separate silos',
          'Layouts where every breakpoint is set manually',
        ],
        summary: 'ClickFunnels rewards builders who want the editor as their primary interface.',
      },
      vibey: {
        title: 'Use ROAS when you need',
        points: [
          'Offer- and audience-led pages you shape by talking, not only dragging',
          'AI-proposed structure with live preview instead of template roulette',
          'Landing copy and nurture sequences kept in one connected thread',
          'Rapid rewrites when messaging and hierarchy change often',
          'A marketer-first loop when intent matters more than the widget tree',
        ],
        summary: 'ROAS rewards teams who want conversation-led iteration without grid lock.',
      },
    },
    differentiation: {
      headlineCards: [
        'Classic builders start with the canvas.',
        'ROAS starts with what you want to sell.',
      ],
      subhead: 'What makes ROAS different',
      cards: [
        {
          icon: 'message-square',
          title: 'Conversation-led vs. canvas-led',
          bodyLines: [
            'ClickFunnels: assemble sections and styles in the canvas.',
            'ROAS: describe offer, audience, and outcome in language first.',
            'Reshape structure and copy by talking-not widget hunting.',
          ],
          punchline: 'Intent first; layout follows.',
        },
        {
          icon: 'link2',
          title: 'One thread for page + nurture vs. split workflows',
          bodyLines: [
            'Pages and email drift when they live in separate tools.',
            'ROAS keeps funnel, messaging, and sequences in one workspace.',
            'Positioning stays coherent through follow-up.',
          ],
          punchline: 'One narrative thread, not three tabs that disagree.',
        },
        {
          icon: 'wand2',
          title: 'AI-proposed structure vs. template picking alone',
          bodyLines: [
            'Templates still mean picking sections and hierarchy yourself.',
            'ROAS proposes layout and copy from your strategy.',
            'Refine in language-not only manual tweaks.',
          ],
          punchline: 'Strategy drives the first draft, not the template gallery.',
        },
        {
          icon: 'brain',
          title: 'Learned brand context vs. static fields',
          bodyLines: [
            'Builders save fields-they don’t infer ICP or voice.',
            'A memory layer carries tone and constraints forward.',
            'Applies to the next page or email automatically.',
          ],
          punchline: 'Brand rules ride along with every build.',
        },
      ],
    },
    showcase: {
      sectionTitle: 'What ROAS does better',
      sectionSubtitle:
        'Turn strategy into structure with language, then refine the funnel without living inside the section list.',
      rows: [
        {
          title: 'Talk the funnel into existence',
          body: 'Start from audience, offer, and goal. ROAS proposes layout and copy iteratively so you steer with prompts, not only drag targets and template slots.',
          visual: 'studio',
        },
        {
          title: 'Live preview without grid lock',
          body: 'See the page take shape as you describe changes, then tighten details without hunting every nested setting.',
          visual: 'funnels',
        },
        {
          title: 'Brand and offer memory on every variant',
          body: 'The Workspace Brain keeps voice and constraints attached when you spin new pages or sequences.',
          visual: 'brain',
        },
        {
          title: 'Pages plus nurture in one connected loop',
          body: 'Keep landing copy and lifecycle email aligned in one workspace so your funnel and follow-ups tell one story end-to-end.',
          visual: 'integrations',
        },
        {
          title: 'Team-ready when more than one person ships',
          body: 'Share the same mission, artifacts, and context so designers, founders, and growth stay aligned.',
          visual: 'team',
        },
        {
          title: 'From builder mode to paid media handoff',
          body: 'Move from page drafts to ad creative in the same narrative thread with fewer mismatched messages.',
          visual: 'ads',
        },
      ],
    },
    closingCta: {
      headline: 'Do what the canvas alone can’t pace with ROAS',
      subhead:
        'Join founders who lead with offers and audience, and let AI handle structure, copy, and iteration.',
    },
  },
}

export function getComparePage(slug: string): ComparePageDefinition | undefined {
  if (COMPARE_SLUGS.includes(slug as CompareSlug)) {
    return COMPARE_PAGES[slug as CompareSlug]
  }
  return undefined
}
