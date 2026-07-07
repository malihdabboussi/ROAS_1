'use client'

import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown } from 'lucide-react'
import { AnimateOnScroll } from '@/components/AnimateOnScroll'

export function FAQAccordion(props: { title: string; items: { q: string; a: string }[] }) {
  const [open, setOpen] = useState<number | null>(0)

  return (
    <section className="section-padding relative pb-20">
      <AnimateOnScroll>
        <div className="site-container">
          <div>
            <h2 className="h2 mb-8 tracking-tight text-white">{props.title}</h2>
            <div className="space-y-3">
              {props.items.map((item, i) => {
                const isOpen = open === i
                return (
                  <div key={item.q} className="glass-card border-section rounded-xl border">
                    <button
                      type="button"
                      onClick={() => setOpen(isOpen ? null : i)}
                      className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                    >
                      <span className="body-2 font-medium text-white">{item.q}</span>
                      <motion.div
                        animate={{ rotate: isOpen ? 180 : 0 }}
                        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                      >
                        <ChevronDown size={20} className="text-color-muted shrink-0" />
                      </motion.div>
                    </button>
                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                          className="overflow-hidden"
                        >
                          <div className="border-color-glass border-t px-5 pb-4 pt-0">
                            <p className="text-text-muted body-3 pt-3 leading-relaxed">{item.a}</p>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </AnimateOnScroll>
    </section>
  )
}
