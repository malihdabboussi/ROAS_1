'use client'

import { ArrowRight } from 'lucide-react'
import { MarketingAtlasVoiceMockup } from '@/components/marketing/MarketingAtlasVoiceMockup'
import { MarketingMemoryStackMockup } from '@/components/marketing/MarketingMemoryStackMockup'
import { MarketingRawToSignalMockup } from '@/components/marketing/MarketingRawToSignalMockup'
import { WaitlistAwareLink } from '@/components/WaitlistAwareLink'

function ArticleMockup({ children }: { children: React.ReactNode }) {
  return (
    <div className="glass-card border-section overflow-hidden rounded-2xl border">{children}</div>
  )
}

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

export function TheBrainArticle() {
  return (
    <div className="flex flex-col gap-10 md:gap-12">
      {/* ── Opening ── */}
      <div className="flex flex-col gap-5">
        <p className="body-2 text-color-secondary leading-relaxed">
          In 1953, a surgeon in Hartford removed a 27-year-old's hippocampus. The procedure was
          experimental. It worked, in the sense that the seizures stopped.
        </p>
        <p className="body-2 text-color-secondary leading-relaxed">
          What it took instead: the ability to form new memories.
        </p>
        <p className="body-2 text-color-secondary leading-relaxed">
          Henry Molaison could hold a conversation, solve a puzzle, learn a new motor skill through
          repetition. His intelligence was intact. His vocabulary, his reasoning, his personality,
          all of it. But introduce yourself, leave the room, come back, and he'd shake your hand as
          if you'd never met. Every experience that followed the surgery was gone by the next day.
          Every morning, his world reset.
        </p>
        <p className="body-2 text-color-secondary leading-relaxed">
          Henry was studied for fifty-five years. He became the most analyzed person in the history
          of neuroscience. What his case revealed was not that memory is a convenience. It's that
          without the ability to accumulate experience, intelligence becomes a closed loop. Always
          capable. Never growing.
        </p>
        <p className="body-2 text-color-secondary leading-relaxed">
          The reason this matters is not Henry. It's what it reveals about every AI tool you've ever
          used.
        </p>
      </div>

      <SectionDivider />

      {/* ── Section: The Organizational Memory Problem ── */}
      <div className="flex flex-col gap-5">
        <h2 className="h3 text-white">The problem that predates AI by fifty years</h2>
        <p className="body-2 text-color-secondary leading-relaxed">
          Long before anyone worried about context windows, organizations had a memory problem.
        </p>
        <p className="body-2 text-color-secondary leading-relaxed">
          McKinsey built a global knowledge management system so that insights from a project in
          Seoul could inform work in São Paulo three years later. Law firms built precedent
          databases so junior associates could access decades of argued cases without reinventing
          strategy from scratch. The best advertising agencies built brand books that weren't just
          style guides but living records of what worked, what failed, and why, so that when a
          creative director moved on, the intelligence didn't move with them.
        </p>
        <p className="body-2 text-color-secondary leading-relaxed">
          The organizations that solved this compounded. The ones that didn't paid for it in
          repeated mistakes, in new hires who spent six months learning lessons the last hire
          already learned, in campaigns that failed for reasons the team had already identified two
          years ago but never written down anywhere anyone would look.
        </p>
        <p className="body-2 text-color-secondary leading-relaxed">
          This is what's usually called institutional knowledge. It's the most undervalued asset in
          every organization that has it and the most expensive liability in every organization that
          doesn't. It lives in the heads of your best people. And when they leave, it walks out the
          door with them.
        </p>
        <Pull>The AI workforce has exactly the same problem, and almost nobody is solving it.</Pull>
        <p className="body-2 text-color-secondary leading-relaxed">
          When you run AI agents, whether that's a copywriter agent, an analyst agent, a strategist,
          an ads manager, each one starts every session from zero. Not because the model isn't
          capable, but because nothing it learned about you last week survived the tab closing. The
          copywriter agent you spent three rounds of feedback training on your tone has,
          effectively, never met you. The analyst who compiled your competitor research last quarter
          doesn't know it exists. Every time you open a new session, you're paying the same
          re-briefing tax again.
        </p>
        <p className="body-2 text-color-secondary leading-relaxed">
          This is not a user experience problem. It's an architectural one.
        </p>
      </div>

      <SectionDivider />

      {/* ── Section: Context vs Memory ── */}
      <div className="flex flex-col gap-5">
        <h2 className="h3 text-white">Context is not memory. The difference is everything.</h2>
        <p className="body-2 text-color-secondary leading-relaxed">
          Think about what a copywriter who has been with a brand for three years actually knows,
          compared to a new copywriter handed the same brief and the same brand guide.
        </p>
        <p className="body-2 text-color-secondary leading-relaxed">
          The new copywriter has all the documented rules. The experienced one has something
          entirely different. They know that the brand guide says "conversational" but what the
          founder actually reacts to is precision. They know that the audience responds to
          specificity and goes cold when things get abstract. They know which campaigns
          underperformed and why, not from a report, but from being in the room when the results
          came in. They know the real red lines, not the stated ones. They know the brand the way a
          person who has lived inside it knows it.
        </p>
        <p className="body-2 text-color-secondary leading-relaxed">
          That's not context. That's memory. And you cannot replicate it by handing someone a better
          document.
        </p>
        <p className="body-2 text-color-secondary leading-relaxed">
          The reflex most people have is to write longer prompts. Front-load more information. Paste
          the guidelines, the past campaigns, the audience research, all of it into the chat at once
          and hope something coherent comes out the other end.
        </p>
        <p className="body-2 text-color-secondary leading-relaxed">
          This is the right instinct applied to the wrong architecture. What you're doing is
          converting memory into context. And context, by definition, is present-tense. It exists
          for this session only. It doesn't accumulate. It doesn't compound. The next time you open
          a chat, you're back to zero.
        </p>
        <Pull>
          Pasting a document every morning is not the same as someone having absorbed it. The output
          will tell you exactly which one you've done.
        </Pull>
        <p className="body-2 text-color-secondary leading-relaxed">
          The distinction shows up immediately in quality. Content produced with pasted context is
          technically on-brand. It follows the stated rules. It's also subtly wrong in ways that are
          hard to articulate: a tone that's slightly off, a headline that would work for any brand
          in the category, a call to action that's missing the particular urgency that works for
          this audience. The rules are there. The knowledge isn't.
        </p>
      </div>

      <ArticleMockup>
        <MarketingMemoryStackMockup />
      </ArticleMockup>

      {/* ── Section: Three Layers ── */}
      <div className="flex flex-col gap-5">
        <h2 className="h3 text-white">
          Why three separate layers, and why collapsing them is fatal
        </h2>
        <p className="body-2 text-color-secondary leading-relaxed">
          When I was building the memory system into what would become The Brain, the question I
          kept running into wasn't technical. It was conceptual. What is the thing we're actually
          trying to store?
        </p>
        <p className="body-2 text-color-secondary leading-relaxed">
          Vibey isn't a chatbot. It isn't a single AI assistant. It's a coordinated swarm of
          specialist agents that together form something closer to a functioning team than a tool. A
          copywriter. An analyst. A strategist. An ads manager. Each one with their own domain,
          their own expertise, their own way of approaching work. The Brain is the memory
          infrastructure underneath all of them. It's what they draw from when they work. Without
          it, each agent starts from zero. With it, every agent carries everything the swarm has
          ever learned about your business.
        </p>
        <p className="body-2 text-color-secondary leading-relaxed">
          The moment you have a swarm instead of a single agent, the memory problem gets harder.
          It's not just "what does the agent know." It's "what does{' '}
          <em className="text-white">this</em> agent know, what does the system know, and what does
          this campaign require." Those are three separate questions. And I realized early in
          testing that trying to answer all three with one context dump was producing exactly the
          output you'd expect from something that had been given all the right information but
          didn't actually know anything.
        </p>
        <p className="body-2 text-color-secondary leading-relaxed">
          The deeper problem with context-as-memory is not just that it resets. It's that most
          people treat all context as the same kind of thing. Brand guidelines go in with campaign
          briefs. Audience research goes in with competitor analysis. Tone instructions go in with
          offer details. Everything lands in one window and the model tries to hold it
          simultaneously.
        </p>
        <p className="body-2 text-color-secondary leading-relaxed">
          This is why even well-prompted output often feels like it was written by someone who read
          all the right materials and understood none of them deeply. Because the context that
          should inform the work in three distinct ways is being flattened into one undifferentiated
          input.
        </p>
        <p className="body-2 text-color-secondary leading-relaxed">
          The reality is that context lives in three places, and each one has a completely different
          lifespan, purpose, and failure mode when absent.
        </p>

        <p className="body-2 font-semibold leading-relaxed text-white">The first is who you are.</p>
        <p className="body-2 text-color-secondary leading-relaxed">
          Your voice. Your positioning. The things you'd never say. What you've learned about your
          audience over years of selling to them. This layer is not specific to any campaign. It's
          not specific to any month. It's the accumulated understanding of your brand, the kind that
          takes time to build and is usually stored in the heads of two or three people who've been
          around long enough.
        </p>
        <p className="body-2 text-color-secondary leading-relaxed">
          When this layer is missing, the failure mode is inconsistency. Not obvious inconsistency.
          Subtle inconsistency. Copy that's technically on-tone but lands slightly wrong. A headline
          that any brand could use. An email that could have been written for a competitor with five
          words changed. The rules are followed. The intelligence isn't there.
        </p>

        <p className="body-2 font-semibold leading-relaxed text-white">
          The second is what your specialist knows.
        </p>
        <p className="body-2 text-color-secondary leading-relaxed">
          This is distinct from your brand. A great copywriter doesn't just know your voice, they
          bring domain expertise that's independent of any specific client: the psychological
          patterns that convert across categories, the frameworks that structure an argument people
          actually finish reading, the specific ways that headlines fail and why, the
          counter-intuitive things that consistently work on cold audiences versus warm ones.
        </p>
        <p className="body-2 text-color-secondary leading-relaxed">
          This expertise deepens independently of brand knowledge. It gets sharper with every piece
          of work produced, every test run, every campaign analyzed. A great copywriter at year
          three is not just more familiar with your brand, they are genuinely better at their craft
          in ways that have nothing to do with you.
        </p>
        <p className="body-2 text-color-secondary leading-relaxed">
          When this layer is missing, the failure mode is depth. The output is correct without being
          good. It applies the right framework without knowing which framework fits this audience.
          It follows best practices without understanding why those practices work and when they
          don't. The difference between technically correct marketing and marketing that actually
          moves people is almost entirely this layer.
        </p>

        <p className="body-2 font-semibold leading-relaxed text-white">
          The third is what this project requires.
        </p>
        <p className="body-2 text-color-secondary leading-relaxed">
          The offer you're running right now. The audience segment you're targeting this month. The
          creative that's been in market for thirty days and is showing fatigue. The price point
          you're testing. The angle that came out of last week's customer call. This context is
          temporary. It's specific. It expires. And it's the most immediate input into any piece of
          work you're producing.
        </p>
        <p className="body-2 text-color-secondary leading-relaxed">
          When this layer is missing, the failure mode is relevance. Work gets produced that's
          technically excellent and addresses the wrong thing. Copy for an offer that's no longer
          the priority. An ad angle that ignores the objection your sales team has been hearing all
          week. Research that answers the last question instead of the current one.
        </p>

        <Pull>
          When all three land in one context window, the model optimizes for each of them
          mediocrely. The voice gets diluted. The expertise becomes a thin imitation. The project
          specifics crowd out everything else. The output is good enough to ship and not good enough
          to work.
        </Pull>

        <p className="body-2 text-color-secondary leading-relaxed">
          The Brain keeps them separate by design. Each layer lives in its own structure, compounds
          independently, and gets retrieved based on what the current task actually requires. When
          your copywriter works on a landing page, they don't receive your brand book, your audience
          research, and your current offer all at once and try to synthesize them in real time. They
          draw on brand knowledge they've already absorbed, craft they've already developed, and
          project context that's specific to this campaign. The distinction is subtle until you see
          the output side by side.
        </p>
      </div>

      <ArticleMockup>
        <MarketingRawToSignalMockup />
      </ArticleMockup>

      {/* ── Section: Identity ── */}
      <div className="flex flex-col gap-5">
        <h2 className="h3 text-white">The problem with flat memory</h2>
        <p className="body-2 text-color-secondary leading-relaxed">
          When we were deep in building the Brain, we kept running into a wall that we couldn't name
          for a while. We could store documents. We could extract preferences. We could capture
          decisions and log corrections. But something was still missing.
        </p>
        <p className="body-2 text-color-secondary leading-relaxed">
          The 12-month employee who develops real intuition about your business doesn't just
          accumulate facts over time. Think about what they've actually built after a year of close
          collaboration. They can tell from the phrasing of a one-line Slack message whether you're
          excited or frustrated. They can hear in your feedback whether you hate something or
          whether you're just unsure. They can sense when something is technically correct but wrong
          in a way that's almost impossible to articulate. That's not information retrieval.{' '}
          <strong className="text-white">
            That's pattern recognition built on accumulated emotional texture.
          </strong>{' '}
          And it's entirely different from having read everything you've ever written.
        </p>
        <p className="body-2 text-color-secondary leading-relaxed">
          The neuroscientist Joe Dispenza has a framework for how identity forms that maps almost
          exactly onto this problem. His observation: a memory by itself is just a thought. But a
          memory with an emotion attached becomes an experience, something you can return to, feel
          again, something that lives in you differently than a fact. And when you've practiced that
          experience enough times, it becomes a habit. Enough habits form a belief. Enough beliefs
          form a perspective. Enough perspectives accumulate into what we call identity.
        </p>
        <p className="body-2 text-color-secondary leading-relaxed">
          That ladder, from experience to habit to belief to perspective to identity, is what we
          were actually trying to build when we designed the Brain. Not a file store. Not a
          preference log. An identity. Something that accumulates enough signal about how you think,
          what you care about, and what actually matters to you underneath what you say, that the
          agents develop not just knowledge of your business but a genuine representation of it.
        </p>
        <p className="body-2 text-color-secondary leading-relaxed">
          There's a moment in Ready Player One where Parzival (the main character) enters the
          curator library and walks through archived memories of James Halliday (the game's
          creator), not summaries of what happened, but the moments themselves. The texture of them.
          What Halliday cared about, how he moved through problems, what he was afraid of. That kind
          of richness is what separates a biography from actually knowing someone. And it's what
          most knowledge systems stop well short of.
        </p>
        <p className="body-2 text-color-secondary leading-relaxed">
          The Brain is an attempt to close that gap. Every piece of feedback you give, every
          correction, every time you say "this doesn't sound like me," you're not updating a
          preference entry. You're contributing to an identity. The agent isn't learning a new rule.
          It's building a more complete picture of what you actually are, as opposed to what your
          brand document says you are. Over time, those two things converge. And when they do, the
          work starts feeling like it came from inside your business instead of from a system that
          was briefed about it.
        </p>
      </div>

      <ArticleMockup>
        <MarketingAtlasVoiceMockup />
      </ArticleMockup>

      {/* ── Section: Atlas ── */}
      <div className="flex flex-col gap-5">
        <h2 className="h3 text-white">The librarian who learns</h2>
        <p className="body-2 text-color-secondary leading-relaxed">
          Understanding this shaped the entire harness we built around the Brain. But it also opened
          the dor to a deeper realization. A system capable of building identity can't itself be
          passive. You can't accumulate emotional texture through a write endpoint. The keeper of
          the Brain had to be something that learns.
        </p>
        <p className="body-2 text-color-secondary leading-relaxed">
          Here's what most memory systems for AI actually are: a write endpoint and a read endpoint
          wrapped in a prompt. You send something in. You retrieve something out. The intelligence
          of what to keep, how to structure it, what to surface and when. That's left to the user or
          hardcoded in the system. It doesn't grow. It doesn't think. It files.
        </p>
        <p className="body-2 text-color-secondary leading-relaxed">
          The question I kept coming back to while building this was: what if the keeper of the
          Brain wasn't a system? What if it was an agent?
        </p>
        <p className="body-2 text-color-secondary leading-relaxed">
          The Curator in Ready Player One isn't a search interface. He's a character who has spent
          decades inside James Halliday's memories and knows them in a way no index ever could. He
          can tell you not just what happened but why it mattered. What Halliday was feeling. What
          it meant in context. The archive is alive because the person guarding it is.
        </p>
        <p className="body-2 text-color-secondary leading-relaxed">
          That's what Atlas (each user brain scholar) is. Not a prompt wrapper around a memory API.
          A real agent with his own Brain, his own skills, his own accumulated understanding of your
          business built up over time, just like every other agent in the swarm. He learns from
          context. He gets sharper the more he works with your knowledge. He notices when something
          you just told him contradicts something you established three months ago. He understands
          why you make the corrections you make, and carries that understanding into how he handles
          what comes next.
        </p>
        <p className="body-2 text-color-secondary leading-relaxed">
          When you upload a document, Atlas doesn't just extract facts and file them. He integrates
          the new information into what the Brain already knows, flags contradictions, and considers
          what's now outdated. When you correct an agent's output, Atlas understands the correction
          as a signal, not just about this piece of work, but about the pattern it reveals. What you
          actually care about. What you mean when you say things a certain way.
        </p>
        <Pull>
          A library is only as good as the librarian who knows what's in it. We made ours an agent.
        </Pull>
        <p className="body-2 text-color-secondary leading-relaxed">
          This is the piece most memory architectures miss entirely. They treat the library as
          infrastructure, passive, dumb, waiting to be queried. We treated it as a role. And the
          role required someone capable of judgment, not just retrieval.
        </p>
      </div>

      {/* ── Section: Compounding ── */}
      <div className="flex flex-col gap-5">
        <h2 className="h3 text-white">The invisible dividend most people never collect</h2>
        <p className="body-2 text-color-secondary leading-relaxed">
          Once you have an agent guarding the Brain, something changes about what accumulation
          means. It's no longer just storage. Every correction you make gets read by Atlas as a
          signal, not just about the piece of work, but about the pattern underneath it. What you
          actually care about. Where your real standards are, as opposed to your stated ones. That
          signal feeds back into how he structures what the Brain knows about you.
        </p>
        <p className="body-2 text-color-secondary leading-relaxed">
          Follow Dispenza's ladder from here and you can see exactly what builds over time. Enough
          corrections around the same thing becomes a belief the Brain holds about your brand.
          Enough beliefs form a perspective that every agent inherits when they work. Enough
          perspectives accumulated over months of real work is what we mean when we say the Brain
          has an identity for your business. Not a document. Not a rule set. A genuine point of view
          that shapes output without you having to explain it.
        </p>
        <p className="body-2 text-color-secondary leading-relaxed">
          This is what most people never get from AI because most systems stop at storage. They
          don't have an Atlas. They don't have a loop where corrections become beliefs and beliefs
          become perspective. They have a write endpoint and a read endpoint, and both stay equally
          dumb no matter how long you use them.
        </p>
        <Pull>
          The ceiling on what AI can do for your business is not the model. It's what the model
          knows about you. That's a different problem, and it has a different solution.
        </Pull>
        <p className="body-2 text-color-secondary leading-relaxed">
          The more your agents work, the less you have to explain. The less you explain, the more
          time goes into the work itself. The more work gets done, the more the Brain learns what
          good output looks like for your business specifically, not in general, not for businesses
          like yours, for you.
        </p>
        <p className="body-2 text-color-secondary leading-relaxed">
          This is not AI getting smarter in some generic sense. It's your agents developing an
          identity that represents your business. Specifically. Irreversibly. In the same way that
          the value of a great long-term hire can't be transferred to someone new even if you give
          the new person everything they ever wrote down.
        </p>
      </div>

      <SectionDivider />

      {/* ── Section: Practical ── */}
      <div className="flex flex-col gap-5">
        <h2 className="h3 text-white">What this actually looks like</h2>
        <p className="body-2 text-color-secondary leading-relaxed">
          You upload documents to the Brain. Brand guides, strategy decks, past campaigns, customer
          research, meeting recordings, competitor analysis, the notes from a call you had last
          Tuesday. The Brain doesn't store them as files. It processes them, extracts the knowledge
          inside, and organizes it across the three layers we talked about: what's true about your
          brand, what's true about each specialist's domain, what's true about this campaign.
        </p>
        <p className="body-2 text-color-secondary leading-relaxed">
          When your copywriter agent works on a landing page, it doesn't receive a folder of
          documents to read. It draws from the brand layer, voice, positioning, what's been
          established about your audience over time. Your analyst agent working on a performance
          report draws from campaign history automatically. Your strategist agent pulls from all
          three. None of them ask you to re-explain. The Brain routes the right knowledge to the
          right agent based on what the task requires.
        </p>
        <p className="body-2 text-color-secondary leading-relaxed">
          You can also talk directly to the Brain. Not to search a database, but to have a real
          conversation: what do my agents know about my audience right now? What's missing from the
          brand layer? That context is wrong, fix it. The Brain holds those conversations, updates
          what the agents know, and carries the correction into every piece of work that follows.
        </p>
        <p className="body-2 text-color-secondary leading-relaxed">
          What changes immediately: you stop re-explaining things that should already be known. Your
          copywriter Vibey agent doesn't need to be told who you're writing for. Your analyst
          doesn't need last quarter's report pasted in. Your strategist doesn't ask questions that
          anyone who's been paying attention would already know the answer to.
        </p>
        <p className="body-2 text-color-secondary leading-relaxed">
          What changes over time is harder to describe but easier to feel. The work stops feeling
          like it was produced by something that read your materials. It starts feeling like it was
          produced by someone who understands your business. That's a different thing entirely, and
          most people have never gotten it from AI before, not because it wasn't possible, but
          because the architecture to support it didn't exist.
        </p>
        <p className="body-2 font-medium leading-relaxed text-white">
          Your agents remember. The work compounds. The output gets better, not because you optimize
          your prompts, but because the system accumulates what it knows about you.
        </p>
      </div>

      {/* ── CTA ── */}
      <div className="border-color-glass bg-color-subtle flex flex-col gap-5 rounded-xl border p-8 text-center">
        <h2 className="h3 text-white">SEE THE BRAIN IN ACTION</h2>
        <p className="body-2 text-color-secondary mx-auto max-w-lg leading-relaxed">
          Feed it your brand, your research, your past work. Watch your agents stop asking questions
          they should already know the answer to.
        </p>
        <WaitlistAwareLink
          href="/features/the-brain"
          className="chip-glass-emerald body-3 inline-flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3 font-semibold"
        >
          Explore The Brain
          <ArrowRight size={16} />
        </WaitlistAwareLink>
      </div>
    </div>
  )
}
