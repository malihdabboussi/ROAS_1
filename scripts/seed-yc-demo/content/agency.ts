/**
 * Agency identity + the 3 human partners.
 *
 * Founder display name = Garry Tan (CEO of YC) per locked deliverable spec.
 * Filled in Wave 2 by a subagent under tight voice supervision.
 */
import type { AgencyMeta, HumanPartner } from './_types'
import { AGENCY_FOUNDED_AT, FOUNDER_JOINED_AT, JULES_JOINED_AT, NICO_JOINED_AT } from './timeline'

export const AGENCY: AgencyMeta = {
  name: 'Foundry Creative',
  tagline: 'A brand and growth studio for founders who refuse to sound like everyone else.',
  story: [
    'Foundry Creative started in a Tribeca walk-up in early 2026, three weeks after Garry walked away from a partner-track offer at a name-brand growth shop in SoHo. The pitch deck for that promotion was the cleanest he had ever built. It was also the moment he realized he had spent four years getting paid to make companies sound like other companies. He wrote the resignation letter on the train home and called Nico the same night.',
    'The premise is simple and slightly unfashionable: brand and growth are the same job. A positioning doc that nobody runs ads against is a Notion page. A paid funnel that converts on language the founder would never say in a customer call is a debt. Foundry takes both halves of that loop on retainer — the words, the visuals, the channels, the feedback — and refuses to hand any of it off to a different vendor. We are the studio you hire when the brand and the pipeline have to agree.',
    'We built Foundry around a small set of opinions we will not negotiate. We do not pitch on logo work. We do not write copy without sitting in on three customer calls first. We do not run paid until the message has been pressure-tested in organic. We pick six clients a year on purpose and we tell most of the rest no. Jules joined in Week 2 because the first two retainers hit the floor running and somebody had to actually ship the work on Monday morning.',
    "A year from now we want to be the studio founders quietly forward to other founders, not the one with the loudest case-study reel. The day the work starts looking like everybody else's work is the day we shut it down.",
  ].join('\n\n'),
  voice: {
    tone: ['confident', 'direct', 'wry', 'principled', 'specific', 'operator-pilled'],
    do: [
      'Name the trade-off explicitly — every recommendation costs something.',
      'Use proper nouns: real channels, real numbers, real competitors.',
      'Write to one smart person, not to a room.',
      'Open with the position, not the windup.',
      'Quote the customer back to themselves verbatim when you can.',
      'Pick a side when two options are close. Say why in one line.',
      'Treat brand and growth as the same conversation, never two decks.',
    ],
    dont: [
      'Never say "committed to excellence", "world-class", or "best-in-class".',
      'Never use "synergy", "leverage" as a verb, or "unlock value".',
      'Never lead with adjectives — lead with the specific thing.',
      'Never hedge with "we believe" when you mean "we know".',
      'Never present three options when two are obviously wrong.',
      'Never write copy a competitor could paste under their logo.',
      'Never confuse polish with finish — finished work answers a question.',
    ],
  },
  foundedAt: AGENCY_FOUNDED_AT,
}

export const FOUNDER: HumanPartner = {
  slug: 'founder',
  displayName: 'Garry Tan',
  email: 'yc-demo@vibey.im',
  passwordKind: 'known',
  role: 'owner',
  bio: [
    'Garry runs Foundry Creative as the founder, head of brand strategy, and the person who picks up the phone when a retainer is on fire. Before Foundry he spent four years inside two of the better-known growth shops in lower Manhattan, the second of which offered him a partner track he turned down on a Wednesday. He is the kind of operator who reads the customer interview transcript before he reads the brief, and who would rather kill a campaign than ship one in a voice the founder would never use on a podcast.',
    'His sharpest take, repeated until it has become a Foundry house joke: brand work that does not change what you spend money on is not brand work. He is publicly skeptical of paid acquisition as a starting move, privately a precise media buyer, and visibly impatient with anyone who treats positioning as a deck instead of a working document. He writes long, defends specifics, and will redraw an entire campaign at 11pm if the language drifts a quarter-inch off the customer.',
    'He hires people who push back and clients who can stand to be told "no, that is the wrong question." Foundry exists because he wanted to work with both.',
  ].join('\n\n'),
  joinedAt: FOUNDER_JOINED_AT,
}

export const NICO: HumanPartner = {
  slug: 'nico',
  displayName: 'Nico',
  email: 'nico@foundrycreative.io',
  passwordKind: 'random',
  role: 'admin',
  bio: [
    'Nico is Head of Strategy and the second voice in every important Foundry decision. Before co-founding the studio he led research and positioning at a B2B brand consultancy in the Flatiron, and before that spent three years inside a venture-backed analytics tool watching the gap between what founders said in interviews and what their landing pages actually claimed. That gap is more or less his whole job now. He runs the customer interview cadence, owns the positioning doc for every retainer, and is the person who makes the founder slow down long enough to ask what the second-order effect of a decision is.',
    'He thinks in systems and writes in clauses. Where Garry will commit to a position in one sentence, Nico will name the three forces it has to survive — pricing pressure, channel saturation, the founder\'s own boredom — before he agrees it holds. He is the calmer half of the partnership on purpose, and the only person at Foundry who has been known to reopen a "closed" question two weeks after launch because a single customer quote nudged him.',
  ].join('\n\n'),
  joinedAt: NICO_JOINED_AT,
}

export const JULES: HumanPartner = {
  slug: 'jules',
  displayName: 'Jules',
  email: 'jules@foundrycreative.io',
  passwordKind: 'random',
  role: 'admin',
  bio: [
    'Jules is Head of Delivery and the reason Foundry retainers ship instead of drift. She joined in Week 2 after the first two clients onboarded faster than the founders had planned for, and she rebuilt the delivery loop in her first ten days — kickoff doc, weekly cadence, retro template, the way approvals route through Maya. She came out of an in-house creative ops role at a Brooklyn DTC brand that scaled from zero to nine figures in three years, which is to say she has lived through the version of the job where good work dies in a Slack thread on a Friday afternoon.',
    'Her instinct on every brief is to ask "OK, who is actually going to do this on Monday morning?" before she lets the conversation move on. She has a low tolerance for performative craft, a high one for actual craft, and a sharp eye for when an agent on the team is being polite instead of honest. If Garry sets the position and Nico pressure-tests it, Jules is the one who turns it into a calendar, a budget, and a deliverable that lands in the client\'s inbox before the deadline they expect.',
  ].join('\n\n'),
  joinedAt: JULES_JOINED_AT,
}

export const HUMANS: readonly HumanPartner[] = [FOUNDER, NICO, JULES]
