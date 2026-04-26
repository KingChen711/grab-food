'use client'

import { useEffect, useRef } from 'react'

import type { Order } from '@/lib/api/orders.api'

const STORAGE_KEY = 'grab-dashboard:chime-enabled'

/**
 * Play a short two-tone chime via Web Audio API whenever the count of
 * NEW (CREATED/PENDING) orders increases. The first render seeds the
 * baseline so the chime doesn't fire when the page mounts with existing
 * orders.
 *
 * Browsers require a user gesture before AudioContext.resume, so we lazily
 * create the context on the first play attempt — if the user never clicks
 * anywhere, the chime stays silent (the queue badge still updates).
 */
export function useNewOrderChime(orders: Order[] | undefined, enabled: boolean) {
  const previousIncomingRef = useRef<number | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)

  useEffect(() => {
    if (!orders) return
    const incoming = orders.filter((o) => o.status === 'CREATED' || o.status === 'PENDING').length

    // First render — establish baseline without playing
    if (previousIncomingRef.current === null) {
      previousIncomingRef.current = incoming
      return
    }

    if (enabled && incoming > previousIncomingRef.current) {
      void playChime(audioCtxRef)
    }
    previousIncomingRef.current = incoming
  }, [orders, enabled])
}

export function readChimePreference(): boolean {
  if (typeof window === 'undefined') return true
  const v = window.localStorage.getItem(STORAGE_KEY)
  return v === null ? true : v === 'true'
}

export function writeChimePreference(enabled: boolean): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, String(enabled))
}

async function playChime(ctxRef: React.MutableRefObject<AudioContext | null>): Promise<void> {
  try {
    if (!ctxRef.current) {
      ctxRef.current = new (
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      )()
    }
    const ctx = ctxRef.current
    if (ctx.state === 'suspended') await ctx.resume()

    const now = ctx.currentTime
    // Two-tone chime: high → higher
    const frequencies = [880, 1175]
    const duration = 0.18

    frequencies.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = freq

      const start = now + i * duration
      gain.gain.setValueAtTime(0, start)
      gain.gain.linearRampToValueAtTime(0.15, start + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.001, start + duration)

      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(start)
      osc.stop(start + duration)
    })
  } catch {
    // Audio context init can fail on locked browsers — silently ignore
  }
}
