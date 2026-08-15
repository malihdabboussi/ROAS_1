export type CreateTypePickerId = 'funnel' | 'ad' | 'script' | 'sequence' | 'social'

export interface CreateTypePickerOption {
  id: string
  label: string
  description: string
  prompt: string
  systemContext: string
}

export interface CreateTypePickerCatalog {
  title: string
  intro: string
  options: CreateTypePickerOption[]
}

export const CREATE_TYPE_PICKERS: Record<CreateTypePickerId, CreateTypePickerCatalog> = {
  funnel: {
    title: 'What kind of funnel would you like?',
    intro: 'Pick a starting template. Pixel will build the pages for that type.',
    options: [
      {
        id: 'lead-magnet',
        label: 'Lead magnet',
        description: 'Opt-in, offer, and thank-you pages to capture leads.',
        prompt: 'Create a lead magnet funnel for ',
        systemContext:
          'QUICK ACTION — FUNNEL: Create a real funnel with create_funnel. The user already chose lead magnet. Build the page flow for that type and return the created funnel artifact from the tool receipt.',
      },
      {
        id: 'call-booking',
        label: 'Call booking',
        description: 'Book strategy calls or discovery sessions.',
        prompt: 'Create a call booking funnel for ',
        systemContext:
          'QUICK ACTION — FUNNEL: Create a real funnel with create_funnel. The user already chose call booking. Build the page flow for that type and return the created funnel artifact from the tool receipt.',
      },
      {
        id: 'webinar',
        label: 'Webinar',
        description: 'Registration and replay pages for live events.',
        prompt: 'Create a webinar funnel for ',
        systemContext:
          'QUICK ACTION — FUNNEL: Create a real funnel with create_funnel. The user already chose webinar. Build the page flow for that type and return the created funnel artifact from the tool receipt.',
      },
      {
        id: 'vsl',
        label: 'VSL',
        description: 'Video sales letter with a single conversion path.',
        prompt: 'Create a VSL funnel for ',
        systemContext:
          'QUICK ACTION — FUNNEL: Create a real funnel with create_funnel. The user already chose VSL. Build the page flow for that type and return the created funnel artifact from the tool receipt.',
      },
      {
        id: 'custom',
        label: 'Custom',
        description: 'Start blank and build any funnel flow you need.',
        prompt: 'Create a custom funnel for ',
        systemContext:
          'QUICK ACTION — FUNNEL: Create a real funnel with create_funnel. The user already chose custom. Confirm the page flow if it is still missing, then return the created funnel artifact from the tool receipt.',
      },
    ],
  },
  ad: {
    title: 'What kind of ad would you like?',
    intro: 'Choose creative, copy, or both before Pixel starts.',
    options: [
      {
        id: 'creative',
        label: 'Ad creative',
        description: 'A visual ad you can run or iterate on.',
        prompt: 'Create ad creative for ',
        systemContext:
          'QUICK ACTION — AD: The user already chose ad creative. Create the ad with create_ad. Write copy in the client voice and return the created ad artifact from the tool receipt.',
      },
      {
        id: 'copy',
        label: 'Ad copy',
        description: 'Headlines, primary text, and CTA without a new visual.',
        prompt: 'Write ad copy for ',
        systemContext:
          'QUICK ACTION — AD: The user already chose ad copy. Create the ad with create_ad, focused on copy. Keep identity callouts specific and return the created ad artifact from the tool receipt.',
      },
      {
        id: 'both',
        label: 'Creative and copy',
        description: 'A complete ad with visual and copy together.',
        prompt: 'Create an ad with creative and copy for ',
        systemContext:
          'QUICK ACTION — AD: The user already chose creative and copy. Create the ad with create_ad and return the created ad artifact from the tool receipt.',
      },
    ],
  },
  script: {
    title: 'What kind of script would you like?',
    intro: 'Choose the format so the structure matches the job.',
    options: [
      {
        id: 'ad',
        label: 'Ad script',
        description: 'Hook-first script for a paid ad.',
        prompt: 'Write an ad script for ',
        systemContext:
          'QUICK ACTION — SCRIPT: The user already chose an ad script. Create it as a native document with create_docx. Structure it hook-first with clear shot or beat directions, and return the created document artifact from the tool receipt.',
      },
      {
        id: 'vsl',
        label: 'VSL script',
        description: 'Longer video sales letter with a conversion path.',
        prompt: 'Write a VSL script for ',
        systemContext:
          'QUICK ACTION — SCRIPT: The user already chose a VSL script. Create it as a native document with create_docx and return the created document artifact from the tool receipt.',
      },
      {
        id: 'social',
        label: 'Social script',
        description: 'Short-form script for organic social.',
        prompt: 'Write a social script for ',
        systemContext:
          'QUICK ACTION — SCRIPT: The user already chose a social script. Create it as a native document with create_docx and return the created document artifact from the tool receipt.',
      },
    ],
  },
  sequence: {
    title: 'What kind of email sequence would you like?',
    intro: 'Pick the flow Pixel should write.',
    options: [
      {
        id: 'webinar-pre',
        label: 'Webinar pre',
        description: 'Reminders and setup emails before the live event.',
        prompt: 'Create a webinar pre-sequence for ',
        systemContext:
          'QUICK ACTION — EMAIL SEQUENCE: The user already chose webinar pre. Create a real sequence with create_sequence and return the created sequence artifact from the tool receipt.',
      },
      {
        id: 'webinar-post',
        label: 'Webinar post',
        description: 'Follow-up after the live session.',
        prompt: 'Create a webinar post-sequence for ',
        systemContext:
          'QUICK ACTION — EMAIL SEQUENCE: The user already chose webinar post. Create a real sequence with create_sequence and return the created sequence artifact from the tool receipt.',
      },
      {
        id: 'replay',
        label: 'Replay',
        description: 'Drive replay views after the event.',
        prompt: 'Create a replay email sequence for ',
        systemContext:
          'QUICK ACTION — EMAIL SEQUENCE: The user already chose replay. Create a real sequence with create_sequence and return the created sequence artifact from the tool receipt.',
      },
      {
        id: 'reactivation',
        label: 'Reactivation',
        description: 'Re-engage cold or stalled leads.',
        prompt: 'Create a reactivation email sequence for ',
        systemContext:
          'QUICK ACTION — EMAIL SEQUENCE: The user already chose reactivation. Create a real sequence with create_sequence and return the created sequence artifact from the tool receipt.',
      },
      {
        id: 'custom',
        label: 'Custom',
        description: 'Any other sequence flow.',
        prompt: 'Create an email sequence for ',
        systemContext:
          'QUICK ACTION — EMAIL SEQUENCE: The user already chose a custom sequence. Confirm the flow if it is still missing, then create it with create_sequence and return the created sequence artifact from the tool receipt.',
      },
    ],
  },
  social: {
    title: 'What kind of social post would you like?',
    intro: 'Choose the format before Pixel writes it.',
    options: [
      {
        id: 'single',
        label: 'Single post',
        description: 'One image or copy block.',
        prompt: 'Create a single social post for ',
        systemContext:
          'QUICK ACTION — SOCIAL POST: The user already chose a single post. Create it with create_social_post and return the created post artifact from the tool receipt.',
      },
      {
        id: 'carousel',
        label: 'Carousel',
        description: 'A swipeable set of cards.',
        prompt: 'Create a social carousel for ',
        systemContext:
          'QUICK ACTION — SOCIAL POST: The user already chose carousel. Create it with create_social_post and return the created post artifact from the tool receipt.',
      },
      {
        id: 'story',
        label: 'Story',
        description: 'Vertical story format.',
        prompt: 'Create a social story for ',
        systemContext:
          'QUICK ACTION — SOCIAL POST: The user already chose story. Create it with create_social_post and return the created post artifact from the tool receipt.',
      },
    ],
  },
}
