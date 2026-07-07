'use client'

import { useEffect, useRef, useState, type FormEvent } from 'react'
import { motion } from 'framer-motion'
import { Lock } from 'lucide-react'
import { PITCH_PASSWORD, SESSION_KEY } from './constants'

export function PasswordGate({ onUnlock }: { onUnlock: () => void }) {
  const [value, setValue] = useState('')
  const [error, setError] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (value === PITCH_PASSWORD) {
      sessionStorage.setItem(SESSION_KEY, '1')
      onUnlock()
    } else {
      setError(true)
      setValue('')
      setTimeout(() => setError(false), 1500)
    }
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#09090b]">
      <motion.form
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        onSubmit={handleSubmit}
        className="flex w-full max-w-sm flex-col items-center gap-6 px-6"
      >
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
          <Lock size={24} className="text-white/60" />
        </div>
        <div className="text-center">
          <h1 className="text-2xl font-[var(--font-site-headline)] font-bold text-white">
            Vibey Pitch Deck
          </h1>
          <p className="mt-2 text-sm text-white/40">Enter password to continue</p>
        </div>
        <input
          ref={inputRef}
          type="password"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Password"
          className={`w-full rounded-xl border bg-white/5 px-4 py-3 text-center text-sm text-white placeholder-white/30 outline-none transition-colors ${
            error ? 'border-red-500/60' : 'border-white/10 focus:border-white/25'
          }`}
        />
        <button
          type="submit"
          className="w-full rounded-xl bg-white/10 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/15"
        >
          Enter
        </button>
      </motion.form>
    </div>
  )
}
