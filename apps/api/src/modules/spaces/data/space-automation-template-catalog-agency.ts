import type { SpaceAutomationTemplateSeed } from './space-automation-template-catalog.types'
import { draft } from './space-automation-template-catalog-builders'

/**
 * Agency preset flows — multi-agent pipelines for funnel and client deliverables.
 * Skills and prompts are refined collaboratively; these install as editable drafts.
 */
export const AGENCY_AUTOMATION_TEMPLATES: SpaceAutomationTemplateSeed[] = [
  {
    template_key: 'agency-funnel-build',
    featured: true,
    is_new: true,
    workflows: ['agency_ops'],
    trigger_group: 'tasks',
    sort_order: 400,
    title: 'Agency Funnel Build',
    description:
      'When a funnel brief task is created, runs copy → wireframe → design agent steps in sequence.',
    badge: 'Agency preset',
    body: draft('Agency Funnel Build', { type: 'task_created' }, [
      {
        type: 'send_to_agent',
        agent_key: 'copywriter',
        target_item_ref: 'trigger',
        prompt_template:
          'Write conversion-focused funnel copy for this client brief.\n\nTitle: {{task.title}}\n\nBrief:\n{{task.description}}\n\nDeliver headline, subhead, body sections, and CTA copy ready for wireframe and design.',
        output_type: 'document_artifact',
        continuation: 'after_task_completes',
        completed_status: 'in_progress',
      },
      {
        type: 'send_to_agent',
        agent_key: 'vibey',
        target_item_ref: 'trigger',
        prompt_template:
          'Create a funnel wireframe structure from the approved copy.\n\nRead skills/funnel-wireframe/SKILL.md before executing.\n\nClient brief:\n{{task.title}}\n{{task.description}}\n\nCopy from previous step:\n{{steps.1.output}}\n\nOutput section order, hierarchy, and layout notes — no final HTML yet.',
        output_type: 'document_artifact',
        continuation: 'after_task_completes',
        completed_status: 'in_progress',
      },
      {
        type: 'send_to_agent',
        agent_key: 'vibey',
        target_item_ref: 'trigger',
        prompt_template:
          'Build the funnel using funnel-builder skill.\n\nRead skills/funnel-builder/SKILL.md before executing.\n\nBrief:\n{{task.title}}\n{{task.description}}\n\nCopy:\n{{steps.1.output}}\n\nWireframe:\n{{steps.2.output}}\n\nProduce the HTML bundle funnel artifact.',
        output_type: 'funnel_artifact',
        continuation: 'after_task_completes',
        completed_status: 'in_review',
      },
      {
        type: 'add_comment',
        message_template:
          'Funnel pipeline complete. Copy, wireframe, and funnel artifact are linked to this task.',
      },
    ]),
  },
  {
    template_key: 'agency-funnel-build-slack',
    featured: true,
    is_new: true,
    workflows: ['agency_ops'],
    integration: 'slack',
    sort_order: 410,
    title: 'Agency Funnel Build (Slack)',
    description:
      'Starts the agency funnel pipeline when a Slack DM arrives — creates a brief task, then runs copy → wireframe → design.',
    badge: 'Needs Slack',
    body: draft(
      'Agency Funnel Build (Slack)',
      {
        type: 'external_slack_message_received',
        trigger_slug: 'SLACK_RECEIVE_DIRECT_MESSAGE',
        connected_account_id: '',
      },
      [
        {
          type: 'create_task',
          title_template: 'Funnel brief: {{trigger.text}}',
          priority: 'high',
          notes_template:
            'Slack brief from {{trigger.from}}\n\n{{trigger.text}}\n\nChannel: {{trigger.channel_id}}',
        },
        {
          type: 'send_to_agent',
          agent_key: 'copywriter',
          target_item_ref: '{{steps.1.item_id}}',
          prompt_template:
            'Write conversion-focused funnel copy for this Slack brief.\n\n{{trigger.text}}\n\nDeliver headline, subhead, body sections, and CTA copy.',
          output_type: 'document_artifact',
          continuation: 'after_task_completes',
          completed_status: 'in_progress',
        },
        {
          type: 'send_to_agent',
          agent_key: 'vibey',
          target_item_ref: '{{steps.1.item_id}}',
          prompt_template:
            'Create a funnel wireframe structure from the approved copy.\n\nRead skills/funnel-wireframe/SKILL.md before executing.\n\nSlack brief:\n{{trigger.text}}\n\nCopy:\n{{steps.2.output}}\n\nOutput section order, hierarchy, and layout notes.',
          output_type: 'document_artifact',
          continuation: 'after_task_completes',
          completed_status: 'in_progress',
        },
        {
          type: 'send_to_agent',
          agent_key: 'vibey',
          target_item_ref: '{{steps.1.item_id}}',
          prompt_template:
            'Build the funnel using funnel-builder skill.\n\nRead skills/funnel-builder/SKILL.md before executing.\n\nBrief:\n{{trigger.text}}\n\nCopy:\n{{steps.2.output}}\n\nWireframe:\n{{steps.3.output}}\n\nProduce the HTML bundle funnel artifact.',
          output_type: 'funnel_artifact',
          continuation: 'after_task_completes',
          completed_status: 'in_review',
        },
        {
          type: 'send_slack_message',
          connected_account_id: '',
          channel_id: '{{trigger.channel_id}}',
          text_template:
            'Funnel pipeline started for your brief. I will reply here when copy, wireframe, and design are ready.',
        },
      ],
    ),
  },
  {
    template_key: 'agency-roas-ad-kit-slack',
    featured: true,
    is_new: true,
    workflows: ['agency_ops'],
    integration: 'slack',
    trigger_group: 'slack',
    sort_order: 420,
    title: 'ROAS Ad Kit (Slack)',
    description:
      'When a message lands in your Slack channel, runs ad concepts → copy → human approval → ad design on Blaze.',
    badge: 'Needs Slack',
    body: draft(
      'ROAS Ad Kit (Slack)',
      {
        type: 'external_slack_message_received',
        trigger_slug: 'SLACK_CHANNEL_MESSAGE_RECEIVED',
        connected_account_id: '',
        channel_id: '',
      },
      [
        {
          type: 'create_task',
          title_template: 'ROAS ad brief: {{trigger.text}}',
          priority: 'high',
          notes_template:
            'Slack ad brief from {{trigger.from}}\n\n{{trigger.text}}\n\nChannel: {{trigger.channel_id}}',
        },
        {
          type: 'send_to_agent',
          agent_key: 'ads_manager',
          target_item_ref: '{{steps.1.item_id}}',
          prompt_template:
            'Generate ROAS ad concepts for this Slack brief.\n\nRead skills/roas-ad-concepts/SKILL.md before executing.\n\nBrief:\n{{trigger.text}}\n\nFrom: {{trigger.from}}',
          output_type: 'document_artifact',
          continuation: 'after_task_completes',
          completed_status: 'in_progress',
        },
        {
          type: 'send_to_agent',
          agent_key: 'ads_manager',
          target_item_ref: '{{steps.1.item_id}}',
          prompt_template:
            'Write ROAS Meta ad copy from the approved concepts.\n\nRead skills/roas-ad-copy/SKILL.md and references/human-written-copy.md before executing.\n\nBrief:\n{{trigger.text}}\n\nConcepts:\n{{steps.2.output}}\n\nReviewer feedback (if any):\n{{run.review_feedback}}',
          output_type: 'document_artifact',
          continuation: 'after_task_completes',
          completed_status: 'in_progress',
        },
        {
          type: 'human_gate',
          target_item_ref: '{{steps.1.item_id}}',
          assignees: [],
          waiting_status: 'in_review',
          resume_on_status: 'done',
          reject_on_status: 'needs_revision',
          on_reject_goto_step_index: 2,
          message_template:
            'Review the ad concepts and copy on this task. Move to Done when approved to run ad design, or Needs revision with feedback to send copy back to Blaze.',
        },
        {
          type: 'send_to_agent',
          agent_key: 'ads_manager',
          target_item_ref: '{{steps.1.item_id}}',
          prompt_template:
            'Render ROAS Meta ad creatives from the approved copy.\n\nRead skills/roas-ad-design/SKILL.md before executing.\n\nBrief:\n{{trigger.text}}\n\nApproved copy:\n{{steps.3.output}}',
          output_type: 'document_artifact',
          continuation: 'after_task_completes',
          completed_status: 'in_review',
        },
        {
          type: 'send_slack_message',
          channel_id: '{{trigger.channel_id}}',
          text_template:
            'ROAS ad kit complete — concepts, copy, and design are ready on the linked task.',
        },
      ],
    ),
  },
  {
    template_key: 'agency-strategic-research',
    featured: true,
    is_new: true,
    workflows: ['agency_ops'],
    trigger_group: 'tasks',
    sort_order: 430,
    title: 'Strategic Research',
    description:
      'When a task moves to Research, runs brand + competitive research, human review, sample content, and a Brain crystallization follow-up task.',
    badge: 'Agency preset',
    body: draft(
      'Strategic Research',
      { type: 'status_change', to: 'research' },
      [
        {
          type: 'send_to_agent',
          agent_key: 'vibey',
          priority: 'high',
          prompt_template:
            'Run Strategic Research for this task: {{task.title}}\n\nUse the task description/notes as the client scope: {{task.description}}\n\nSTEP 1: Research the brand and what they sell, including messaging pillars, offer positioning, proof points, tone, and brand guidelines.\nSTEP 2: Determine who they sell to. Define practical customer avatars, pain points, desired outcomes, objections, and buying triggers.\nSTEP 3: Competitive research. Identify similar brands, what they do well, what they miss, market patterns, and the unique opportunity for this client.\nSTEP 4: Ad library market research. Review Meta, Google, TikTok, and other visible ad examples where available. Incorporate hooks, angles, offers, creative patterns, and gaps into the competitive research.\nSTEP 5: Compile the research into a clear strategy document outline with how this works, what this looks like, and talking points for funnels, ads, content, landing pages, blog, and email ideas.\n\nReturn a concise strategy brief and recommended next steps for human review.',
          output_type: 'document_artifact',
          continuation: 'after_task_completes',
          completed_status: 'in_review',
          agent_collaboration: 'allowed',
          extended_brain_knowledge: true,
        },
        {
          type: 'add_comment',
          message_template:
            'Strategic Research is ready for human review.\n\nReview checklist:\n- Approve the overarching strategy, or request revisions.\n- If approved, use the sample-content step/task to demonstrate the strategy to the client.\n- If revisions are needed, add feedback here and move the task back to RESEARCH. The revision pass should combine feedback and return to Step 4: ad library and competitive research.\n- After final approval, crystallize the approved strategy to Brain manually as the overarching strategy.',
        },
        {
          type: 'send_to_agent',
          agent_key: 'vibey',
          priority: 'high',
          prompt_template:
            'Create sample snippets of content to demonstrate the approved strategy for this task: {{task.title}}\n\nUse the latest strategy context and review notes from the task. Create:\n1. Sample social posts\n2. Sample landing page section or page copy\n3. Sample blog or email content\n\nMake these client-facing examples that demonstrate the strategic direction clearly.',
          output_type: 'document_artifact',
          continuation: 'after_task_completes',
          completed_status: 'in_review',
          agent_collaboration: 'allowed',
          extended_brain_knowledge: true,
        },
        {
          type: 'add_comment',
          message_template:
            'Sample strategy content is ready for client review.\n\nClient review path:\n- If approved, crystallize the approved strategy to Brain manually as the overarching strategy.\n- If revisions are needed, add client feedback here and move the task back to RESEARCH. The revision pass should combine feedback and return to Step 4: ad library and competitive research.',
        },
        {
          type: 'create_task',
          title_template: 'Crystallize approved strategy to Brain: {{task.title}}',
          status: 'todo',
          priority: 'high',
        },
      ],
    ),
  },
]
