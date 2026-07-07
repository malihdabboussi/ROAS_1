'use client'

import { ArrowRight } from 'lucide-react'
import { WaitlistAwareLink } from '@/components/WaitlistAwareLink'

function SectionDivider() {
  return <div className="border-color-glass w-full shrink-0 border-t" aria-hidden />
}

function Pull({ children }: { children: React.ReactNode }) {
  return (
    <p className="border-color-glass body-2 border-l-2 pl-5 font-medium leading-relaxed text-white">
      {children}
    </p>
  )
}

export function TheHarnessArticle() {
  return (
    <div className="flex flex-col gap-10 md:gap-12">
      {/* ── Opening ── */}
      <div className="flex flex-col gap-5">
        <p className="body-2 text-color-secondary leading-relaxed">
          There's a question I kept asking myself in the early days of building Vibey that I
          couldn't quite shake: what are we actually building here?
        </p>
        <p className="body-2 text-color-secondary leading-relaxed">
          Not in the product sense. I knew the product. I knew the features, the agents, the mission
          system, the Brain. I mean the deeper question: what category of thing is this? Because the
          answer to that question shapes everything. It shapes what you build, what you measure,
          what you call success.
        </p>
        <p className="body-2 text-color-secondary leading-relaxed">
          For a while, the easiest answer was "an AI team." A group of specialist agents you manage
          like employees. That was accurate. But it wasn't complete. And the gap between accurate
          and complete turned out to matter more than I expected.
        </p>
      </div>

      <SectionDivider />

      {/* ── Biology ── */}
      <div className="flex flex-col gap-5">
        <h2 className="h3 text-white">What biology figured out</h2>
        <p className="body-2 text-color-secondary leading-relaxed">
          A neuron is impressive. It receives signals, processes them, fires outputs. It has memory,
          sensitivity, the ability to adapt. By any measure, it is a capable thing.
        </p>
        <p className="body-2 text-color-secondary leading-relaxed">
          A brain is a different category of thing entirely.
        </p>
        <p className="body-2 text-color-secondary leading-relaxed">
          Not because the neurons got better. The same neuron that exists in your brain exists in a
          worm's nervous system. The difference isn't the unit. It's what the units can do when they
          are organized. A hundred billion neurons connected through a precise architecture of
          layered coordination produce something that no individual neuron contains or implies:
          consciousness, creativity, abstract reasoning, the ability to model the future and act on
          it.
        </p>
        <p className="body-2 text-color-secondary leading-relaxed">
          Biology discovered this principle long before humans named it. A cell is capable. An organ
          is something cells couldn't become alone. A body is something no organ could produce. Each
          layer of organization creates capabilities that simply don't exist at the layer below. You
          can't predict the human immune system by studying a single white blood cell. You can't
          predict language by studying a single neuron. The emergent properties only appear at the
          level of the organized whole.
        </p>
        <Pull>The unit doesn't determine the ceiling. The organization does.</Pull>
        <p className="body-2 text-color-secondary leading-relaxed">
          What makes this possible is not the components themselves. It's the infrastructure that
          organizes them: the signaling pathways, the feedback loops, the specialization of roles,
          the coordination mechanisms that let a liver cell and a neuron and a muscle cell each
          contribute to a single coherent outcome without any one of them understanding the whole.
        </p>
        <p className="body-2 text-color-secondary leading-relaxed">
          Biology calls this infrastructure a body. I call it a harness.
        </p>
      </div>

      <SectionDivider />

      {/* ── Organizations ── */}
      <div className="flex flex-col gap-5">
        <h2 className="h3 text-white">What organizations figured out</h2>
        <p className="body-2 text-color-secondary leading-relaxed">
          Humans applied the same principle to coordination, and called it an organization.
        </p>
        <p className="body-2 text-color-secondary leading-relaxed">
          One person can do certain things. Add nine more people and you don't just get ten times
          the output. You get division of labor, specialization, compounding expertise, parallel
          execution. Things that were impossible for one person become possible because different
          people carry different capabilities. The organization is the harness. It determines what
          the ten can do that the one couldn't.
        </p>
        <p className="body-2 text-color-secondary leading-relaxed">
          I ran a marketing agency that scaled to over 80 people, and I watched this happen in real
          time. At 10, the informal coordination that worked when we were five started breaking.
          Decisions fell through the gaps between people. Work got done twice or not at all. We
          added process, and it helped, until it didn't.
        </p>
        <p className="body-2 text-color-secondary leading-relaxed">
          At 25, the process we'd built stopped scaling. Everyone was technically doing their job,
          but the jobs weren't connecting the way they needed to. We added management layers, people
          whose entire role was to translate between the people doing the work and the people
          setting the direction. That bought us another stretch.
        </p>
        <p className="body-2 text-color-secondary leading-relaxed">
          By the time we crossed 75, communication overhead had become a real cost. Keeping everyone
          aligned on what we were actually trying to do required meetings about meetings. The
          information people needed to make good decisions was sitting in someone else's head,
          inaccessible, unrouted. The work was fine. The coordination was the problem.
        </p>
        <p className="body-2 text-color-secondary leading-relaxed">
          Each threshold had the same root cause. The harness hadn't kept up with the team. The
          infrastructure for organizing the work, routing the right information to the right people,
          and keeping everyone pointed at the same outcome had broken under the weight of growth.
          The people were capable. The harness wasn't.
        </p>
        <p className="body-2 text-color-secondary leading-relaxed">
          The organizations that scale past each threshold aren't the ones with the best individual
          people. They're the ones with the best harness. The clearest division of roles. The most
          effective information routing. The strongest feedback loops between what's happening and
          what decisions get made. The tightest alignment between each person's work and the outcome
          the whole system is trying to create.
        </p>
        <p className="body-2 text-color-secondary leading-relaxed">
          Every great organization in history has been, at its core, a harness. A system for
          organizing capable individuals around a cause that none of them could have achieved alone.
          That's what McKinsey built. That's what Amazon built. That's what every functional
          military, government, and institution is at its foundation.
        </p>
        <Pull>
          An organization doesn't increase individual capability. It creates collective capability.
          Those are not the same thing.
        </Pull>
        <p className="body-2 text-color-secondary leading-relaxed">
          The question is: what organizes them? What decides who does what, in what order, with what
          information, toward what end? The answer to that question is the harness. And whether the
          harness is good or bad determines whether the organization succeeds or fails, regardless
          of how capable the individuals inside it are.
        </p>
      </div>

      <SectionDivider />

      {/* ── The Digital Equivalent ── */}
      <div className="flex flex-col gap-5">
        <h2 className="h3 text-white">The building blocks of the digital realm</h2>
        <p className="body-2 text-color-secondary leading-relaxed">
          The internet created something new in the last thirty years. Not just connectivity, but a
          layer of capability that didn't exist before: compute, storage, APIs, language models,
          data pipelines, integrations, publishing channels, payment rails, creative tools. Each one
          a building block. Each one impressive on its own. Each one profoundly limited in
          isolation.
        </p>
        <p className="body-2 text-color-secondary leading-relaxed">
          When large language models arrived, the first instinct was to build one very capable agent
          and give it as many of these building blocks as possible. One agent. Lots of tools. Better
          prompts. The idea was that a sufficiently capable model with a sufficiently long list of
          capabilities would be able to do most things.
        </p>
        <p className="body-2 text-color-secondary leading-relaxed">
          This is the neuron trying to be a brain.
        </p>
        <p className="body-2 text-color-secondary leading-relaxed">
          It's not wrong that a single agent with tools is more powerful than a single agent
          without. But it doesn't matter how many tools you give one agent, the ceiling it hits is
          the ceiling of what one thing can coherently hold and execute. The context collapses. The
          coordination disappears. The depth at any given task gets shallower as the breadth gets
          wider. You end up with something that can attempt many things and master none of them.
        </p>
        <p className="body-2 text-color-secondary leading-relaxed">
          The same thing happens with organizations when you try to do everything with one person.
          You can hire the most capable person in the world and load them with every responsibility,
          but you'll hit a ceiling that has nothing to do with their capability. It's the ceiling of
          one mind coordinating everything at once.
        </p>
        <p className="body-2 text-color-secondary leading-relaxed">
          The answer isn't a better person. It's an organization. And the answer in AI isn't a
          better model. It's a harness.
        </p>
      </div>

      <SectionDivider />

      {/* ── What a harness actually is ── */}
      <div className="flex flex-col gap-5">
        <h2 className="h3 text-white">What a harness actually is</h2>
        <p className="body-2 text-color-secondary leading-relaxed">
          The word gets used loosely, so I want to be precise about what I mean.
        </p>
        <p className="body-2 text-color-secondary leading-relaxed">
          A harness is not the agents. Not the tools. Not the model. A harness is the infrastructure
          that organizes all of those things toward an outcome: what each agent knows, what it can
          do, how it receives work, how it hands work off, how the results get reviewed and
          incorporated, and how the whole system stays aligned with what it's actually trying to
          achieve.
        </p>
        <p className="body-2 text-color-secondary leading-relaxed">
          In a human organization, this infrastructure is invisible. It's the org chart, the
          communication protocols, the approval flows, the shared memory in the form of
          documentation and institutional knowledge, the management layer that converts strategy
          into assignments. You don't see it in any single person. You see it in how the people work
          together.
        </p>
        <p className="body-2 text-color-secondary leading-relaxed">
          In Vibey, it's the same. The harness is what you don't see when you're watching an agent
          produce a deliverable. It's the CEO agent, the orchestration layer that decomposes your
          brief into subtasks and assigns the right specialist to each one. It's the mission system
          that serializes the work so the designer waits for the copywriter, who waits for the
          researcher. It's the Brain, the shared memory infrastructure, that gives each agent the
          specific context it needs for its piece without flooding it with everything the system
          knows. It's the North Star, the governing strategy that defines what success looks like
          and what the system will never do, that keeps every autonomous decision aligned with what
          you're actually trying to build. It's the scoring system that compounds the quality of
          work over time.
        </p>
        <Pull>
          The harness is what makes the whole capable of things the parts cannot do alone. It is,
          precisely, the organizing principle.
        </Pull>
        <p className="body-2 text-color-secondary leading-relaxed">
          When you give a mission to Vibey, you're not prompting a model. You're briefing a CEO who
          runs a planning process, assembles a team, assigns work, manages dependencies, reviews
          outputs, and routes the results back to you. The model is in there somewhere. But the
          model is not the product. The harness is the product.
        </p>
      </div>

      <SectionDivider />

      {/* ── What this means in practice ── */}
      <div className="flex flex-col gap-5">
        <h2 className="h3 text-white">What this changes</h2>
        <p className="body-2 text-color-secondary leading-relaxed">
          When I finally understood what we were building, the product decisions that had felt hard
          became obvious.
        </p>
        <p className="body-2 text-color-secondary leading-relaxed">
          Why do agents have domains? Because specialization is not a preference, it's a structural
          requirement. A copywriter who can also deploy code is not twice as useful, it's half as
          coherent. Domain boundaries exist for the same reason a liver doesn't try to pump blood:
          specialization is what makes coordination possible.
        </p>
        <p className="body-2 text-color-secondary leading-relaxed">
          Why does memory have three layers instead of one? Because what you know about your brand,
          what your specialist knows about their craft, and what this campaign requires right now
          are three different kinds of knowledge with three different lifespans. Mixing them
          collapses the signal. Separating them lets each flow to where it's needed.
        </p>
        <p className="body-2 text-color-secondary leading-relaxed">
          Why does the North Star exist? Because a system with autonomous decision-making capability
          without a governing principle will drift. Strategy isn't bureaucracy. It's the signal that
          keeps every node in the system pointed in the same direction.
        </p>
        <p className="body-2 text-color-secondary leading-relaxed">
          None of these decisions come from best practices in AI product design. They come from how
          organizations actually work. Because that's what we're building. Not AI products. An
          organizational infrastructure for the digital realm.
        </p>
        <p className="body-2 text-color-secondary leading-relaxed">
          Human organizations hit those scaling thresholds at 10, 25, 75, 150 because each one
          represents a failure of the harness to keep up with the team's growth. The coordination
          mechanisms that worked for ten people break at twenty-five. The ones that worked at
          twenty-five break at seventy-five. Each time, the solution wasn't better people. It was a
          better harness. A digital organization built on the right infrastructure doesn't have to
          hit those ceilings in the same way, because the harness scales with you. But only if you
          build it correctly from the start.
        </p>
        <Pull>
          The ceiling on what one person can achieve isn't their capability. It's what they can
          organize. Vibey moves that ceiling.
        </Pull>
        <p className="body-2 text-color-secondary leading-relaxed">
          A solo operator running Vibey is not a solo operator using AI. They are a founder running
          a team. The team happens to be AI. The harness happens to be software. But the leverage is
          organizational, and the organizational leverage is the same leverage that let ten people
          do what one person couldn't, and let a hundred do what ten couldn't.
        </p>
        <p className="body-2 text-color-secondary leading-relaxed">
          The question I couldn't answer in the beginning, "what category of thing is this?" has a
          clear answer now.
        </p>
        <p className="body-2 font-medium leading-relaxed text-white">
          It's a harness for building organizations in the digital realm. The agents are the people.
          The infrastructure is the company. And what the system can do together is something none
          of the parts could have predicted.
        </p>
      </div>

      {/* ── CTA ── */}
      <div className="border-color-glass bg-color-subtle flex flex-col gap-5 rounded-xl border p-8 text-center">
        <h2 className="h3 text-white">BUILD YOUR ORGANIZATION</h2>
        <p className="body-2 text-color-secondary mx-auto max-w-lg leading-relaxed">
          Hire your first specialist. Set your North Star. See what your team can build when the
          harness is in place.
        </p>
        <WaitlistAwareLink
          href="/waitlist"
          className="chip-glass-emerald body-3 inline-flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3 font-semibold"
        >
          Join Vibey Beta
          <ArrowRight size={16} />
        </WaitlistAwareLink>
      </div>
    </div>
  )
}
