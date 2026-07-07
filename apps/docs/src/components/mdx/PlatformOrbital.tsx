'use client'

import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { BookOpen, Brain, MessageSquare, Plug, Server, Target, Users, Zap } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

const VibeyOrb = lazy(() => import('./VibeyOrb').then((m) => ({ default: m.VibeyOrb })))

interface HarnessNode {
  id: number
  title: string
  content: string
  href: string
  relatedIds: number[]
  icon: LucideIcon
}

const HARNESS_DATA: HarnessNode[] = [
  {
    id: 1,
    title: 'The Brain',
    icon: Brain,
    content:
      "Three layers of memory that compound over time. Your business knowledge, each agent's specialized expertise, and project-specific campaign knowledge. The more you feed, the smarter every output.",
    href: '/brain/how-the-brain-works',
    relatedIds: [3, 5, 7],
  },
  {
    id: 2,
    title: 'Cloud Computer',
    icon: Server,
    content:
      'A dedicated machine in the cloud with real tools. Video editing, image generation, branded PDFs, web research, and application building. Runs 24/7 whether your laptop is on or off.',
    href: '/getting-started/what-is-vibey',
    relatedIds: [4, 5],
  },
  {
    id: 3,
    title: 'Skills',
    icon: BookOpen,
    content:
      'Reusable playbooks that make agents consistent and accurate for your business. Refined through use, shared across the team. The more you invest, the better every future output.',
    href: '/team/agent-skills',
    relatedIds: [1, 5, 7],
  },
  {
    id: 4,
    title: 'Integrations',
    icon: Plug,
    content:
      '35+ platforms connected and executing real actions. Agents send emails, publish ads, post to social, pull analytics, and sync your CRM. Each agent gets tools from their domain only.',
    href: '/integrations/connected-platforms',
    relatedIds: [2, 5],
  },
  {
    id: 5,
    title: 'Your Team',
    icon: Users,
    content:
      "Specialist employees you hire, train, and manage. Each has their own role, skills, permissions, and memory. Your copywriter can't deploy code. Your developer can't publish ads. Scored on quality after every mission.",
    href: '/team/meet-your-agents',
    relatedIds: [1, 2, 3, 4, 6, 7, 8],
  },
  {
    id: 6,
    title: 'Autopilot',
    icon: Zap,
    content:
      'Define your strategy, turn it on, and close the tab. Vibey checks progress, assigns tasks, recovers stuck work, and sends you a daily digest. You decide when to enable it.',
    href: '/autopilot/how-autopilot-works',
    relatedIds: [5, 7],
  },
  {
    id: 7,
    title: 'Missions',
    icon: Target,
    content:
      'The delegation system. Describe the outcome, and Vibey breaks it into subtasks, assigns the right specialist, tracks progress, and delivers finished work back to you.',
    href: '/missions/what-are-missions',
    relatedIds: [3, 5, 6],
  },
  {
    id: 8,
    title: 'Studio',
    icon: MessageSquare,
    content:
      'The conversation interface. Brainstorm, create, and refine with Vibey in real time. Drop in files, URLs, and videos. Use capability chips to kick off common workflows.',
    href: '/studio/talking-to-vibey',
    relatedIds: [1, 3, 5],
  },
]

const NODE_COLORS = [
  'rgba(16, 185, 129, 0.9)',
  'rgba(59, 130, 246, 0.9)',
  'rgba(245, 158, 11, 0.9)',
  'rgba(139, 92, 246, 0.9)',
  'rgba(236, 72, 153, 0.9)',
  'rgba(239, 68, 68, 0.9)',
  'rgba(20, 184, 166, 0.9)',
  'rgba(99, 102, 241, 0.9)',
]

export function PlatformOrbital() {
  const [activeNodeId, setActiveNodeId] = useState<number | null>(null)
  const [pulseEffect, setPulseEffect] = useState<Record<number, boolean>>({})
  const [rotationAngle, setRotationAngle] = useState(0)
  const [autoRotate, setAutoRotate] = useState(true)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let timer: ReturnType<typeof setInterval>
    if (autoRotate) {
      timer = setInterval(() => {
        setRotationAngle((prev) => (prev + 0.25) % 360)
      }, 50)
    }
    return () => {
      if (timer) clearInterval(timer)
    }
  }, [autoRotate])

  const handleContainerClick = (e: React.MouseEvent) => {
    if (e.target === containerRef.current || (e.target as HTMLElement).dataset?.orbit) {
      setActiveNodeId(null)
      setPulseEffect({})
      setAutoRotate(true)
    }
  }

  const toggleNode = (id: number) => {
    if (activeNodeId === id) {
      setActiveNodeId(null)
      setPulseEffect({})
      setAutoRotate(true)
    } else {
      setActiveNodeId(id)
      setAutoRotate(false)
      const node = HARNESS_DATA.find((n) => n.id === id)
      if (node) {
        const pulse: Record<number, boolean> = {}
        node.relatedIds.forEach((rid) => {
          pulse[rid] = true
        })
        setPulseEffect(pulse)
      }
      const idx = HARNESS_DATA.findIndex((n) => n.id === id)
      const targetAngle = (idx / HARNESS_DATA.length) * 360
      setRotationAngle(270 - targetAngle)
    }
  }

  const getPosition = (index: number, total: number) => {
    const angle = ((index / total) * 360 + rotationAngle) % 360
    const radian = (angle * Math.PI) / 180
    const rx = 180
    const ry = 140
    const x = rx * Math.cos(radian)
    const y = ry * Math.sin(radian)
    const depth = (1 + Math.sin(radian)) / 2
    const zIndex = Math.round(50 + 50 * depth)
    const scale = 0.75 + 0.25 * depth
    const opacity = 0.4 + 0.6 * depth
    return { x, y, zIndex, scale, opacity }
  }

  return (
    <div
      ref={containerRef}
      onClick={handleContainerClick}
      style={{
        position: 'relative',
        width: '100%',
        height: 480,
        margin: '32px 0',
        userSelect: 'none',
        overflow: 'hidden',
        borderRadius: 12,
        background: 'var(--muted)',
        border: '1px solid var(--border)',
      }}
    >
      <div
        data-orbit="true"
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Orbit ring */}
        <div
          style={{
            position: 'absolute',
            width: 360,
            height: 280,
            borderRadius: '50%',
            border: '1px solid var(--border)',
            opacity: 0.5,
          }}
        />

        {/* Center core - Vibey Orb */}
        <div
          style={{
            position: 'absolute',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Suspense
            fallback={
              <div
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, var(--primary), rgba(16, 185, 129, 0.6))',
                }}
              />
            }
          >
            <VibeyOrb size={80} />
          </Suspense>
        </div>

        {/* Connection lines */}
        {activeNodeId &&
          HARNESS_DATA.find((n) => n.id === activeNodeId)?.relatedIds.map((relId) => {
            const activeIdx = HARNESS_DATA.findIndex((n) => n.id === activeNodeId)
            const relIdx = HARNESS_DATA.findIndex((n) => n.id === relId)
            const pos1 = getPosition(activeIdx, HARNESS_DATA.length)
            const pos2 = getPosition(relIdx, HARNESS_DATA.length)
            return (
              <svg
                key={`line-${relId}`}
                style={{
                  position: 'absolute',
                  width: '100%',
                  height: '100%',
                  pointerEvents: 'none',
                  zIndex: 10,
                }}
              >
                <line
                  x1={`calc(50% + ${pos1.x}px)`}
                  y1={`calc(50% + ${pos1.y}px)`}
                  x2={`calc(50% + ${pos2.x}px)`}
                  y2={`calc(50% + ${pos2.y}px)`}
                  stroke="var(--primary)"
                  strokeWidth="1"
                  opacity="0.3"
                  strokeDasharray="4 4"
                />
              </svg>
            )
          })}

        {/* Nodes */}
        {HARNESS_DATA.map((node, index) => {
          const pos = getPosition(index, HARNESS_DATA.length)
          const isActive = activeNodeId === node.id
          const isRelated = pulseEffect[node.id]
          const color = NODE_COLORS[index] ?? 'rgba(150,150,150,0.9)'

          return (
            <div
              key={node.id}
              onClick={(e) => {
                e.stopPropagation()
                toggleNode(node.id)
              }}
              style={{
                position: 'absolute',
                transform: `translate(${pos.x}px, ${pos.y}px) scale(${isActive ? 1.15 : pos.scale})`,
                zIndex: isActive ? 200 : pos.zIndex,
                opacity:
                  activeNodeId && !isActive && !isRelated ? 0.25 : isActive ? 1 : pos.opacity,
                transition: 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
                cursor: 'pointer',
              }}
            >
              {/* Glow */}
              {(isActive || isRelated) && (
                <div
                  style={{
                    position: 'absolute',
                    width: 56,
                    height: 56,
                    borderRadius: '50%',
                    top: -8,
                    left: -8,
                    background: `radial-gradient(circle, ${color.replace('0.9', '0.25')} 0%, transparent 70%)`,
                    animation: isRelated ? 'platformPulse 1.5s ease-in-out infinite' : undefined,
                  }}
                />
              )}

              {/* Node circle */}
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: isActive ? `${color.replace('0.9', '0.15')}` : 'var(--card)',
                  backdropFilter: isActive ? 'blur(12px)' : undefined,
                  WebkitBackdropFilter: isActive ? 'blur(12px)' : undefined,
                  border: `1.5px solid ${isActive ? color.replace('0.9', '0.4') : isRelated ? color.replace('0.9', '0.4') : 'var(--border)'}`,
                  transition: 'all 0.3s',
                  boxShadow: isActive
                    ? `0 4px 16px ${color.replace('0.9', '0.2')}, inset 0 1px 0 ${color.replace('0.9', '0.15')}`
                    : '0 1px 4px rgba(0,0,0,0.1)',
                }}
              >
                <node.icon
                  size={16}
                  style={{ color: isActive ? 'var(--foreground)' : 'var(--foreground)' }}
                />
              </div>

              {/* Label */}
              <div
                style={{
                  position: 'absolute',
                  top: 46,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  whiteSpace: 'nowrap',
                  fontSize: 11,
                  fontWeight: 600,
                  color: isActive ? 'var(--foreground)' : 'var(--muted-foreground)',
                  transition: 'color 0.3s',
                  letterSpacing: '0.02em',
                }}
              >
                {node.title}
              </div>

              {/* Expanded card */}
              {isActive && (
                <div
                  style={{
                    position: 'absolute',
                    top: 68,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: 260,
                    background: 'var(--card)',
                    border: '1px solid var(--border)',
                    borderRadius: 10,
                    padding: '14px 16px',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                    zIndex: 300,
                  }}
                >
                  {/* Arrow */}
                  <div
                    style={{
                      position: 'absolute',
                      top: -6,
                      left: '50%',
                      transform: 'translateX(-50%) rotate(45deg)',
                      width: 12,
                      height: 12,
                      background: 'var(--card)',
                      borderLeft: '1px solid var(--border)',
                      borderTop: '1px solid var(--border)',
                    }}
                  />

                  <a
                    href={node.href}
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: 'var(--foreground)',
                      textDecoration: 'none',
                      display: 'block',
                      marginBottom: 6,
                    }}
                  >
                    {node.title}
                  </a>
                  <p
                    style={{
                      fontSize: 12,
                      lineHeight: 1.5,
                      color: 'var(--muted-foreground)',
                      margin: 0,
                    }}
                  >
                    {node.content}
                  </p>

                  <div style={{ marginTop: 12 }}>
                    <a
                      href={node.href}
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        fontSize: 12,
                        fontWeight: 600,
                        padding: '7px 14px',
                        borderRadius: 8,
                        border: '1px solid var(--border)',
                        background: 'rgba(128, 128, 128, 0.08)',
                        backdropFilter: 'blur(8px)',
                        WebkitBackdropFilter: 'blur(8px)',
                        color: 'var(--foreground)',
                        textDecoration: 'none',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)',
                      }}
                    >
                      Explore more →
                    </a>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <p
        style={{
          position: 'absolute',
          bottom: 12,
          width: '100%',
          textAlign: 'center',
          fontSize: 11,
          color: 'var(--muted-foreground)',
          margin: 0,
        }}
      >
        Click any piece to explore
      </p>

      <style>{`
        @keyframes platformPulse {
          0%, 100% { transform: scale(1); opacity: 0.3; }
          50% { transform: scale(1.2); opacity: 0.1; }
        }
      `}</style>
    </div>
  )
}
