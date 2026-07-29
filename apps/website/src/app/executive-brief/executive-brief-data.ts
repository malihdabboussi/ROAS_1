export type BriefTabId = 'brain' | 'agents' | 'spaces' | 'workflows'

export const executivePainPoints = [
  {
    step: '01',
    title: 'Your knowledge lives in people, not the company.',
    description:
      'When someone is busy, on leave, or moves on, what they know leaves with them. New hires start from zero instead of standing on everything the company already learned.',
  },
  {
    step: '02',
    title: 'The data exists. Nothing moves it forward.',
    description:
      'Your tools are full of information, but the next step still waits on a person to notice it, copy it over, or chase it down.',
  },
  {
    step: '03',
    title: 'You can’t see what’s actually happening.',
    description:
      'Status is a person you have to interrupt, not something leadership can see at a glance. Answers take hours, not seconds.',
  },
  {
    step: '04',
    title: 'Good work gets rebuilt from scratch every time.',
    description:
      'Past content, decisions, and deliverables aren’t reused, so the same effort repeats again and again instead of compounding.',
  },
  {
    step: '05',
    title: 'Quality depends on who’s doing the work.',
    description:
      'Without a shared, repeatable way of working, process and output vary person to person, and consistency breaks as you scale.',
  },
  {
    step: '06',
    title: 'You can’t grow output without growing headcount.',
    description:
      'Skilled people spend their days on repetitive work, so scaling means hiring more of them instead of freeing the ones you have.',
  },
] as const

export const executiveBriefTabs = [
  {
    id: 'brain',
    label: 'Brain',
    title: 'Turn what your company knows into working memory.',
    summary:
      'ROAS turns your documents, calls, and decisions into structured memory. It is organized by company, customer, and person, ready before any agent acts.',
    points: [
      'Company knowledge captures how you operate and your standards.',
      'Customer knowledge holds accounts and segments, with sensitive data controlled.',
      'Personal context learns how each person works and decides.',
      'The memory keeps organizing itself as new information arrives.',
    ],
    proof:
      'You never start from a blank page. The memory sharpens with every approved decision.',
  },
  {
    id: 'agents',
    label: 'Agents',
    title: 'A team of specialists, not a generic chatbot.',
    summary:
      'Each agent has a role, skills, tools, and clear access limits. It reads the Brain before it acts on anything.',
    points: [
      'Specialists cover the work you do, from content to operations.',
      'Every agent reads the Brain first, so work starts with context.',
      'Humans review and approve while agents do the repetitive work.',
      'Feedback becomes better skills, so quality compounds over time.',
    ],
    proof:
      'The point is not to replace your people. It is to free them for the judgment work.',
  },
  {
    id: 'spaces',
    label: 'Spaces',
    title: 'One shared place where the work actually happens.',
    summary:
      'Spaces bring tasks, documents, and conversations into one shared view. People and agents work there together.',
    points: [
      'Tasks and statuses cover both human and agent work.',
      'Documents and deliverables stay attached to the work that created them.',
      'Conversations live next to the work, not across other tools.',
      'Leadership sees progress, blockers, and what needs approval.',
    ],
    proof:
      'Status becomes something you can see, not something you chase. The work stays visible as it moves.',
  },
  {
    id: 'workflows',
    label: 'Workflows',
    title: 'Recurring work that moves on its own.',
    summary:
      'Workflows connect a trigger to the right agent automatically. The Space updates without anyone pushing it along.',
    points: [
      'Triggers come from messages, forms, schedules, or connected tools.',
      'Work routes to the right agent with a clear output and review step.',
      'Tasks, documents, and notifications update automatically.',
      'Start with one or two high-value flows, then expand.',
    ],
    proof:
      'Manual stops disappear without replacing your tools. The system automates what happens between them.',
  },
] as const

export const executiveUseCases = [
  {
    id: 'widget',
    label: 'Website widget',
    title: 'An agent on your site that answers every visitor.',
    summary:
      'Put an agent on your website, trained on everything your company knows, so visitors get answers the moment they ask. Every conversation captures the lead and teaches the Customer Brain who they are.',
    steps: [
      'Train the Brain on your products, services, and FAQs.',
      'Create an agent that answers in your company voice.',
      'Embed it on your site as a ROAS widget.',
      'Each chat captures the lead to your CRM and feeds the Customer Brain.',
    ],
    result: 'Visitors get instant answers, and every chat becomes a lead you already understand.',
  },
  {
    id: 'inbox',
    label: 'Inbox on autopilot',
    title: 'Every email answered in your voice.',
    summary:
      'Train an agent on your context and connect your inbox. It drafts a reply to every message, and a human approves the ones that matter.',
    steps: [
      'Connect the inbox and train the agent on your context.',
      'A new email arrives and the agent reads the Brain.',
      'It drafts a reply in your voice.',
      'You approve, and it sends.',
    ],
    result: 'Email handled in minutes, not hours, without losing your tone.',
  },
  {
    id: 'leads',
    label: 'Lead follow-up',
    title: 'Every new lead followed up in minutes.',
    summary:
      'When a lead comes in, an agent replies, answers their questions, and updates the CRM. No lead goes cold while someone is busy.',
    steps: [
      'A new lead arrives from a form or campaign.',
      'An agent reads the Brain and the lead details.',
      'It sends a personal follow-up and answers questions.',
      'It logs the result and updates the CRM.',
    ],
    result: 'Every lead gets a fast, personal reply, day or night.',
  },
  {
    id: 'proposals',
    label: 'Proposals & quotes',
    title: 'Proposals and quotes drafted from a single request.',
    summary:
      'When a request comes in, an agent drafts the proposal or quote from your pricing, templates, and past deals. A human approves before it goes out.',
    steps: [
      'A request or enquiry comes in.',
      'An agent pulls your pricing and templates.',
      'It drafts the proposal or quote.',
      'You approve, and it sends.',
    ],
    result: 'Polished proposals out in minutes, not days.',
  },
  {
    id: 'meetings',
    label: 'Meetings into tasks',
    title: 'Every call turns into assigned work.',
    summary:
      'Each meeting transcript becomes tasks, routed to the right person or agent by responsibility, so nothing said on a call gets lost.',
    steps: [
      'A call ends and the transcript is ingested.',
      'The agent pulls out decisions and action items.',
      'Tasks are created in the right Space.',
      'Each task routes to the right human or agent.',
    ],
    result: 'Nothing from a call slips, and work is assigned before you leave the room.',
  },
  {
    id: 'onboarding',
    label: 'Onboarding & research',
    title: 'New clients and accounts, fully briefed on day one.',
    summary:
      'When a new client or account starts, an agent researches them and their context and assembles the onboarding package. Your team starts fully briefed.',
    steps: [
      'A new client or account kicks off onboarding.',
      'An agent researches them and their market.',
      'It builds a task with the full picture.',
      'It drafts the plan and next steps for review.',
    ],
    result: 'A complete, researched onboarding package, ready the day they sign.',
  },
  {
    id: 'reports',
    label: 'Reports & status',
    title: 'Answers on where things stand, on demand.',
    summary:
      'An agent pulls from your Spaces and Brain to answer status questions and produce recurring reports. No one has to chase updates.',
    steps: [
      'Connect your Spaces and the data that matters.',
      'Ask for a status update or a report.',
      'The agent pulls the live context.',
      'It posts the update or sends the report.',
    ],
    result: 'Instant answers on where things stand, and reports that write themselves.',
  },
  {
    id: 'content',
    label: 'Content & outreach',
    title: 'LinkedIn posts and Instagram carousels, drafted on brand.',
    summary:
      'Agents draft your LinkedIn posts, Instagram carousels, newsletters, and outreach from the Brain in your voice. Your team reviews and ships instead of starting from a blank page.',
    steps: [
      'The Brain holds your voice, offers, and audience.',
      'You ask for a post, a carousel, or a campaign.',
      'An agent drafts it on brand, ready to schedule.',
      'A human reviews and ships.',
    ],
    result: 'A steady stream of posts, carousels, and emails, drafted in minutes.',
  },
] as const

export const securityPhases = {
  now: {
    title: 'Available today',
    items: [
      'Runs on infrastructure partners covered by SOC 2, HIPAA, GDPR, and ISO.',
      'Start with scoped data, so a pilot never needs your most sensitive records.',
      'Human review on every customer-facing output before it goes out.',
      'Leadership controls what enters each layer of the Brain.',
    ],
  },
  roadmap: {
    title: 'In progress',
    items: [
      'ROAS platform certifications: SOC 2 Type 2, HIPAA, GDPR, and ISO 27001.',
      'Deeper integrations with your core systems as pilots expand.',
      'Wider automation across more of your operations over time.',
    ],
  },
  rollout: [
    {
      phase: 'Phase 1',
      title: 'Start where data is least sensitive',
      description:
        'Stand up the first workflows on low-risk data and prove the output quality with humans in the loop.',
    },
    {
      phase: 'Phase 2',
      title: 'Expand once trust is proven',
      description:
        'Move into deeper systems and more sensitive workflows as certifications and Phase 1 results are in hand.',
    },
  ],
} as const

export const proofStories = [
  {
    id: 'adley',
    name: 'Adley Kinsman',
    handle: '@adley',
    initial: 'A',
    image: '/proof/adley.jpg',
    context: 'Creator and CEO of Viralish',
    title: 'Content across every platform, in her voice.',
    body: 'The Brain learned her voice and back catalog. Agents draft posts, scripts, and emails in her tone for review in one Space.',
    outcome:
      'One creator voice became a reusable content engine for a 9-person team across posts, scripts, and email.',
    stats: [
      { value: '7M+', label: 'followers' },
      { value: '1-3B', label: 'views/month' },
      { value: '9-person', label: 'team running on ROAS' },
    ],
  },
  {
    id: 'brian',
    name: 'Brian Mark',
    handle: '@therealbrianmark',
    initial: 'B',
    image: '/proof/brian.jpg',
    context: 'Business coach',
    title: 'His whole method, working while he sleeps.',
    body: 'Brian trained the Brain on his courses and frameworks and put a coach agent on his site. Every conversation fed his Customer Brain.',
    outcome: '10,000+ people coached in 72 hours without adding headcount.',
    stats: [
      { value: '697K', label: 'followers' },
      { value: '5-person', label: 'team running on ROAS' },
    ],
  },
  {
    id: 'roas',
    name: 'ROAS',
    handle: null,
    initial: 'R',
    image: '/proof/roas.png',
    context: 'Marketing agency',
    title: 'More clients, no new hires.',
    body: 'A repeatable workflow builds each client package the moment a deal closes, with a dedicated Space per client.',
    outcome:
      '5x client capacity without new hires, because every new deal produced a ready-to-run client package automatically.',
    stats: [
      { value: '5x', label: 'client capacity' },
      { value: '0', label: 'new hires' },
      { value: '10-person', label: 'team' },
    ],
  },
  {
    id: 'hadassah',
    name: 'Hadassah Medical Center Limassol',
    handle: null,
    initial: 'H',
    image: '/proof/hadassah.png',
    context: 'Medical center launch · Limassol, Cyprus',
    title: 'A greenfield launch, built compliance-first.',
    body: 'Hadassah started with no marketing stack, fragmented accounts, and strict medical data rules. ROAS built a shared Brain from their service catalog and clinical input, stood up patient-facing agents and funnels, and wired leads through a compliance boundary before anything touches the patient system — with IT, clinical, and marketing working in one Space.',
    outcome:
      'A new medical center moved from fragmented launch inputs to one governed go-to-market system.',
    stats: [
      { value: '0 → 1', label: 'launch system' },
      { value: '3', label: 'teams aligned' },
      { value: 'Compliance-first', label: 'rollout' },
    ],
  },
] as const

export const pilotTimeline = [
  {
    step: '01',
    title: 'Pick one or two workflows',
    description: 'Choose high-friction paths where the work repeats and the value is clear.',
  },
  {
    step: '02',
    title: 'Seed the essential data',
    description: 'Load the SOPs, templates, and recent context the agents need, not everything at once.',
  },
  {
    step: '03',
    title: 'Launch one Space and one agent',
    description: 'With clear review checkpoints, so a human approves before anything reaches a customer.',
  },
  {
    step: '04',
    title: 'Measure the result',
    description: 'Track time saved, quality, and turnaround, and prove the value in 60 to 90 days.',
  },
  {
    step: '05',
    title: 'Expand with a compliance gate',
    description: 'Add more workflows and deeper systems once the first wins and certifications are in place.',
  },
] as const

