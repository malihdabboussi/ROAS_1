'use client'

import { useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { AnimateOnScroll } from '@/components/AnimateOnScroll'
import {
  executiveBriefTabs,
  executivePainPoints,
  executiveUseCases,
  pilotTimeline,
  proofStories,
  securityPhases,
  type BriefTabId,
} from './executive-brief-data'
import { BriefPullQuote, BriefSectionIntro, BriefStepList } from './ExecutiveBriefPrimitives'
import { ExecutiveBriefHeroDiagram } from './ExecutiveBriefHeroDiagram'
import { ExecutiveBriefBrainVisual } from './ExecutiveBriefBrainVisual'
import { MarketingOrgChartMockup } from '@/components/marketing/MarketingOrgChartMockup'
import { SpacesHeroMockup } from '@/components/marketing/SpacesHeroMockup'
import { MarketingSpaceAutomationsMockup } from '@/components/marketing/MarketingSpaceAutomationsMockup'
import {
  MARKETING_AGENT_LIBRARY_FALLBACK,
  VIBEY_MARKETING_PORTRAIT_FALLBACK,
} from '@/lib/agent-library-fallback'

const tabVisuals: Record<BriefTabId, React.ReactNode> = {
  brain: <ExecutiveBriefBrainVisual />,
  agents: (
    <MarketingOrgChartMockup
      libraryAgents={MARKETING_AGENT_LIBRARY_FALLBACK}
      vibeyPortraitUrl={VIBEY_MARKETING_PORTRAIT_FALLBACK}
    />
  ),
  spaces: (
    <SpacesHeroMockup
      libraryAgents={MARKETING_AGENT_LIBRARY_FALLBACK}
      vibeyPortraitUrl={VIBEY_MARKETING_PORTRAIT_FALLBACK}
      sizeVariant="brief"
    />
  ),
  workflows: <MarketingSpaceAutomationsMockup libraryAgents={MARKETING_AGENT_LIBRARY_FALLBACK} />,
}

export function ExecutiveBriefContent() {
  const [activeTab, setActiveTab] = useState<BriefTabId>('brain')
  const active = executiveBriefTabs.find((tab) => tab.id === activeTab) ?? executiveBriefTabs[0]
  const [activeUseCase, setActiveUseCase] = useState<string>(executiveUseCases[0].id)
  const useCase =
    executiveUseCases.find((uc) => uc.id === activeUseCase) ?? executiveUseCases[0]

  return (
    <main className="executive-brief-page bg-color-deep relative overflow-hidden">
      {/* Hero */}
      <section className="executive-brief-hero-shell executive-brief-section-hero relative z-10 overflow-hidden">
        <div className="hero-dot-grid pointer-events-none absolute inset-0 opacity-40" aria-hidden />
        <div className="hero-beam-glow pointer-events-none" aria-hidden />
        <div className="executive-brief-hero-shell-inner relative z-10">
          <AnimateOnScroll>
            <div className="site-container">
              <div className="executive-brief-hero-title-block">
                <h1 className="h1 executive-brief-hero-title tracking-tight text-foreground uppercase">
                  <span className="executive-brief-hero-line">Your systems hold everything.</span>
                  <span className="executive-brief-hero-line executive-brief-hero-accent">
                    ROAS finally ties them together.
                  </span>
                </h1>
              </div>

              <ExecutiveBriefHeroDiagram />
            </div>
          </AnimateOnScroll>
        </div>
      </section>

      {/* Pain points */}
      <section className="section-padding executive-brief-section-pain relative z-10">
        <div className="site-container">
          <AnimateOnScroll>
            <BriefSectionIntro
              align="center"
              title="Most enterprises we work with feel the same pains."
            />
          </AnimateOnScroll>

          <div className="executive-brief-pain-grid mt-12">
            {executivePainPoints.map((pain) => (
              <article key={pain.step} className="executive-brief-pain-item">
                <p className="display-price text-secondary">{pain.step}</p>
                <h2 className="h4 text-foreground mt-4">{pain.title}</h2>
                <p className="body-3 text-text-muted mt-3 leading-relaxed">{pain.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Statement band */}
      <section className="executive-brief-statement-band relative z-10">
        <AnimateOnScroll>
          <div className="site-container">
            <figure className="executive-brief-statement">
              <blockquote className="h3 text-foreground">
                ROAS isn’t here to replace your people. It’s here to take the repetitive 90% off
                their plate, so they can finally do the 10% you actually hired them for.
              </blockquote>
              <figcaption className="text-text-muted body-2 mt-4 leading-relaxed">
                The judgment, the decisions, the relationships. The work only a human should own.
              </figcaption>
            </figure>
          </div>
        </AnimateOnScroll>
      </section>

      {/* Explore tabs */}
      <section id="explore" className="section-padding executive-brief-section-explore relative z-10">
        <div className="site-container">
          <AnimateOnScroll>
            <BriefSectionIntro
              align="center"
              title="Memory, execution, workspace, and handoffs, in one operating model."
              description="Four layers that work as one system, turning what your company knows into work that actually moves."
            />
          </AnimateOnScroll>

          <div
            className="solution-marketing-showcase-tabs mt-10"
            role="tablist"
            aria-label="ROAS operating model"
          >
            {executiveBriefTabs.map((tab) => {
              const isActive = tab.id === active.id
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setActiveTab(tab.id)}
                  className={
                    isActive
                      ? 'solution-marketing-showcase-tab solution-marketing-showcase-tab-active'
                      : 'solution-marketing-showcase-tab'
                  }
                >
                  {tab.label}
                </button>
              )
            })}
          </div>

          <AnimateOnScroll>
            <div className="executive-brief-tab-panel">
              <div className="executive-brief-tab-info">
                <h2 className="h3 text-foreground">{active.title}</h2>
                <p className="text-text-muted body-2 mt-4 leading-relaxed">{active.summary}</p>
                <BriefStepList items={active.points} />
                <div className="mt-8">
                  <BriefPullQuote>{active.proof}</BriefPullQuote>
                </div>
              </div>
              <div className={`executive-brief-tab-visual executive-brief-tab-visual-${active.id}`}>
                {tabVisuals[active.id]}
              </div>
            </div>
          </AnimateOnScroll>
        </div>
      </section>

      {/* Real use cases */}
      <section id="use-cases" className="section-padding executive-brief-section-usecases relative z-10">
        <div className="site-container">
          <AnimateOnScroll>
            <BriefSectionIntro
              align="center"
              title="Real workflows teams have built on ROAS."
              description="A few of the ways customers put the Brain, agents, and Spaces to work. Pick one to see how it runs."
            />
          </AnimateOnScroll>

          <div className="executive-brief-usecases mt-12">
            <div
              className="executive-brief-usecase-tabs"
              role="tablist"
              aria-label="ROAS use cases"
            >
              {executiveUseCases.map((uc) => {
                const isActive = uc.id === useCase.id
                return (
                  <button
                    key={uc.id}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => setActiveUseCase(uc.id)}
                    className={
                      isActive
                        ? 'executive-brief-usecase-tab executive-brief-usecase-tab-active'
                        : 'executive-brief-usecase-tab'
                    }
                  >
                    {uc.label}
                  </button>
                )
              })}
            </div>

            <div className="executive-brief-usecase-panel">
              <h3 className="h3 text-foreground">{useCase.title}</h3>
              <p className="text-text-muted body-2 mt-4 leading-relaxed">{useCase.summary}</p>

              <ol className="executive-brief-usecase-steps">
                {useCase.steps.map((step, index) => (
                  <li key={step} className="executive-brief-usecase-step">
                    <div className="executive-brief-workflow-node">
                      <span className="executive-brief-workflow-index">{index + 1}</span>
                    </div>
                    <span className="body-3 text-text-muted leading-relaxed">{step}</span>
                  </li>
                ))}
              </ol>

              <div className="mt-8">
                <BriefPullQuote>{useCase.result}</BriefPullQuote>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Self-improvement statement */}
      <section className="executive-brief-statement-band relative z-10">
        <AnimateOnScroll>
          <div className="site-container">
            <figure className="executive-brief-statement">
              <blockquote>
                <span className="body-1 text-text-muted block">
                  Most software does the same thing forever.
                </span>
                <span className="h3 text-foreground mt-2 block">
                  ROAS gets better at your work the longer it runs it.
                </span>
              </blockquote>
              <figcaption className="text-text-muted body-2 mt-4 leading-relaxed">
                Every workflow it runs becomes new memory and a suggestion for the next one to build,
                so your operation compounds instead of repeating.
              </figcaption>
            </figure>
          </div>
        </AnimateOnScroll>
      </section>

      {/* Proof / results */}
      <section id="proof" className="section-padding executive-brief-section-proof relative z-10">
        <div className="site-container">
          <AnimateOnScroll>
            <BriefSectionIntro
              title="Different industries, the same operating model."
              description="Here is what teams have done once their knowledge, agents, and work lived in one place."
            />
          </AnimateOnScroll>

          <div className="executive-brief-proof-stories mt-12">
            {proofStories.map((story, index) => (
              <AnimateOnScroll key={story.id}>
                <article
                  className={
                    index % 2 === 1
                      ? 'executive-brief-proof-row executive-brief-proof-row-reverse'
                      : 'executive-brief-proof-row'
                  }
                >
                  <div className="executive-brief-proof-text">
                    <p className="body-3 text-text-muted font-semibold uppercase tracking-wide">
                      {story.context}
                    </p>
                    <h3 className="h3 text-foreground mt-3">{story.title}</h3>
                    <p className="text-text-muted body-2 mt-4 leading-relaxed">{story.body}</p>
                    <div className="mt-6">
                      <BriefPullQuote>{story.outcome}</BriefPullQuote>
                    </div>
                  </div>

                  <div
                    className={
                      story.id === 'roas' || story.id === 'hadassah'
                        ? 'executive-brief-proof-card executive-brief-proof-card-logo-story'
                        : 'executive-brief-proof-card'
                    }
                  >
                    {(story.id === 'roas' || story.id === 'hadassah') && story.image ? (
                      <div className="executive-brief-proof-logo-block" aria-hidden>
                        <img src={story.image} alt="" className="executive-brief-proof-logo-mark" />
                      </div>
                    ) : null}
                    <div
                      className={
                        story.id === 'roas' || story.id === 'hadassah'
                          ? 'executive-brief-proof-id executive-brief-proof-id-stacked'
                          : 'executive-brief-proof-id'
                      }
                    >
                      {story.id !== 'roas' && story.id !== 'hadassah' ? (
                        <div
                          className={`executive-brief-proof-media executive-brief-proof-media-${story.id}`}
                          aria-hidden
                        >
                          <span className="executive-brief-proof-initial">{story.initial}</span>
                          {story.image ? (
                            <img
                              src={story.image}
                              alt=""
                              className="executive-brief-proof-photo"
                              onError={(event) => event.currentTarget.remove()}
                            />
                          ) : null}
                        </div>
                      ) : null}
                      <div>
                        <p className="body-2 text-foreground font-semibold">{story.name}</p>
                        <p className="body-3 text-text-muted">{story.handle ?? story.context}</p>
                        <div className="executive-brief-proof-profile-meta">
                          {story.stats.map((stat) => (
                            <span key={stat.label} className="executive-brief-proof-profile-stat">
                              <span className="body-2 text-foreground font-semibold">
                                {stat.value}
                              </span>
                              <span className="body-3 text-text-muted">{stat.label}</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </article>
              </AnimateOnScroll>
            ))}
          </div>
        </div>
      </section>

      {/* Security & phased rollout */}
      <section id="security" className="section-padding executive-brief-section-security relative z-10">
        <div className="site-container">
          <AnimateOnScroll>
            <BriefSectionIntro
              kicker="Security & rollout"
              title="Security and compliance your team can sign off on."
              description="The questions your IT and finance teams ask have clear answers, and you start on low-risk data before expanding."
            />
          </AnimateOnScroll>

          <div className="executive-brief-security-grid mt-12">
            <AnimateOnScroll>
              <div className="executive-brief-security-column">
                <h3 className="h4 text-foreground">{securityPhases.now.title}</h3>
                <BriefStepList items={securityPhases.now.items} />
              </div>
            </AnimateOnScroll>
            <AnimateOnScroll>
              <div className="executive-brief-security-column">
                <h3 className="h4 text-foreground">{securityPhases.roadmap.title}</h3>
                <BriefStepList items={securityPhases.roadmap.items} />
              </div>
            </AnimateOnScroll>
          </div>

          <div className="executive-brief-phase-strip mt-12">
            {securityPhases.rollout.map((phase) => (
              <article key={phase.phase} className="executive-brief-phase-item">
                <p className="body-3 text-secondary font-semibold uppercase tracking-wide">
                  {phase.phase}
                </p>
                <h3 className="h4 text-foreground mt-2">{phase.title}</h3>
                <p className="body-3 text-text-muted mt-3 leading-relaxed">{phase.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Pilot */}
      <section id="pilot-plan" className="section-padding executive-brief-section-pilot relative z-10">
        <div className="site-container">
          <AnimateOnScroll>
            <BriefSectionIntro
              kicker="Pilot path"
              title="One or two workflows. Sixty to ninety days. Proof before you commit."
              description="The executive conversation should end with one specific pilot, not a platform rollout."
            />
          </AnimateOnScroll>

          <div className="executive-brief-timeline executive-brief-timeline-five mt-12">
            {pilotTimeline.map((item) => (
              <div key={item.step} className="executive-brief-timeline-step">
                <p className="display-price text-secondary">{item.step}</p>
                <h3 className="h4 text-foreground mt-3">{item.title}</h3>
                <p className="body-3 text-text-muted mt-2 leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="executive-brief-section-cta relative z-10">
        <AnimateOnScroll>
          <div className="site-container">
            <div className="solution-marketing-closing-banner">
              <p className="body-3 text-text-muted font-semibold uppercase tracking-wide">
                Leadership conversation
              </p>
              <h2 className="h2 mx-auto mt-3 max-w-3xl tracking-tight text-foreground">
                Bring one pilot workflow, one success metric, and one expansion path.
              </h2>
              <p className="text-text-muted body-2 mx-auto mt-4 max-w-2xl leading-relaxed">
                On the call we cover security scope, integration approach, and which workflows to
                prove first. CFO and IT are welcome, compliance questions are expected, not
                exceptional.
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <a
                  href="mailto:dylan@vibey.im?subject=ROAS executive walkthrough"
                  className="chip-glass-emerald body-3 inline-flex items-center gap-2 rounded-full px-8 py-3 font-semibold"
                >
                  Book leadership call
                  <ArrowRight className="icon-sm" />
                </a>
                <a
                  href="#security"
                  className="chip-glass-neutral body-3 inline-flex items-center gap-2 rounded-full px-8 py-3 font-semibold"
                >
                  Review security scope
                </a>
              </div>
            </div>
          </div>
        </AnimateOnScroll>
      </section>
    </main>
  )
}
